package com.woth.backend.plaza;

import com.woth.backend.ai.service.OpenAiClient;
import com.woth.backend.mailbox.MailboxService;
import com.woth.backend.storage.S3ImageStorageService;
import com.woth.backend.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PlazaCompletionService {

    private static final Logger log = LoggerFactory.getLogger(PlazaCompletionService.class);

    private final OpenAiClient openAiClient;
    private final MailboxService mailboxService;
    private final PlazaImagePromptBuilder promptBuilder;
    private final PlazaRepository plazaRepository;
    private final PlazaEntryRepository plazaEntryRepository;
    private final TransactionTemplate transactionTemplate;
    private final S3ImageStorageService s3ImageStorageService;

    public PlazaCompletionService(
            OpenAiClient openAiClient,
            MailboxService mailboxService,
            PlazaImagePromptBuilder promptBuilder,
            PlazaRepository plazaRepository,
            PlazaEntryRepository plazaEntryRepository,
            PlatformTransactionManager transactionManager,
            S3ImageStorageService s3ImageStorageService
    ) {
        this.openAiClient = openAiClient;
        this.mailboxService = mailboxService;
        this.promptBuilder = promptBuilder;
        this.plazaRepository = plazaRepository;
        this.plazaEntryRepository = plazaEntryRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
        this.transactionTemplate.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.s3ImageStorageService = s3ImageStorageService;
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void completeIfReady(PlazaEntryCreatedEvent event) {
        log.info("[plaza-completion-test] event received. plazaId={}", event.plazaId());

        CompletionSnapshot snapshot = loadCompletionSnapshot(event.plazaId(), event.forceComplete());

        if (snapshot == null) {
            log.info("[plaza-completion-test] completion snapshot is null. plazaId={}", event.plazaId());
            return;
        }

        log.info("[plaza-completion-test] completion condition met. plazaId={}, receivers={}",
                snapshot.plazaId(),
                snapshot.receivers().stream().map(receiver -> receiver.receiver().getId()).toList()
        );

        // [수정] AI 이미지 생성 시작 시점에만 삭제를 잠그기 위해 imageGenerating=true로 전환
        boolean locked = markImageGenerationStarted(snapshot.plazaId(), snapshot.completedAt());
        if (!locked) {
            log.info("[plaza-completion-test] plaza image generation already locked. plazaId={}", snapshot.plazaId());
            return;
        }

        log.info("[plaza-completion-test] plaza image generation locked. plazaId={}", snapshot.plazaId());

        try {
            String generatedImageData = generateImage(snapshot);
            String generatedImageUrl = uploadImageToS3(snapshot, generatedImageData);

            String imageForMailbox = generatedImageUrl != null && !generatedImageUrl.isBlank()
                    ? generatedImageUrl
                    : generatedImageData;

            log.info("[plaza-completion-test] image processing finished. plazaId={}, hasImage={}, storedAsS3Url={}",
                    snapshot.plazaId(),
                    imageForMailbox != null && !imageForMailbox.isBlank(),
                    generatedImageUrl != null && !generatedImageUrl.isBlank()
            );

            mailboxService.sendPlazaCompletionLetters(
                    snapshot.plazaId(),
                    snapshot.plazaTitle(),
                    snapshot.plazaCreatedAt(),
                    snapshot.completedAt(),
                    snapshot.participantCount(),
                    snapshot.receivers(),
                    imageForMailbox
            );

            log.info("[plaza-completion-test] completion letters sent. plazaId={}, receiverCount={}",
                    snapshot.plazaId(),
                    snapshot.receivers().size()
            );
        } finally {
            // [수정] 성공/실패 여부와 상관없이 AI 생성 종료 후 삭제 잠금을 해제
            markImageGenerationFinished(snapshot.plazaId());
        }
    }

    private CompletionSnapshot loadCompletionSnapshot(Long plazaId, boolean forceComplete) {
        return transactionTemplate.execute(status -> {
            Plaza plaza = plazaRepository.findById(plazaId).orElse(null);
            if (plaza == null || (plaza.isCompleted() && !forceComplete)) {
                return null;
            }

            List<PlazaEntry> entries = plazaEntryRepository.findByPlazaId(plazaId);

            log.info("[plaza-completion-test] entries loaded. plazaId={}, entryCount={}, maxObjects={}",
                    plazaId,
                    entries.size(),
                    plaza.getMaxObjects()
            );

            if (!forceComplete && entries.size() < plaza.getMaxObjects()) {
                return null;
            }

            // 프롬프트와 수신자를 트랜잭션 안에서 확정해 lazy loading 영향을 받지 않도록 합니다.
            String prompt = promptBuilder.build(plaza, entries);

            List<MailboxService.CompletionLetterReceiver> receivers = entries.stream()
                    .filter(entry -> entry.getOwner() != null)
                    .filter(entry -> plaza.getOwner() == null || !entry.getOwner().getId().equals(plaza.getOwner().getId()))
                    .map(entry -> toCompletionLetterReceiver(entry.getOwner(), entry))
                    .toList();

            if (plaza.getOwner() != null) {
                receivers = new java.util.ArrayList<>(receivers);
                PlazaEntry ownerEntry = entries.stream()
                        .filter(entry -> entry.getOwner() != null && entry.getOwner().getId().equals(plaza.getOwner().getId()))
                        .findFirst()
                        .orElse(null);
                receivers.add(0, toCompletionLetterReceiver(plaza.getOwner(), ownerEntry));
            }

            LocalDateTime completedAt = plaza.getCompletedAt() == null
                    ? LocalDateTime.now()
                    : plaza.getCompletedAt();

            return new CompletionSnapshot(
                    plaza.getId(),
                    plaza.getTitle(),
                    plaza.getCreatedAt(),
                    completedAt,
                    (long) entries.size(),
                    prompt,
                    receivers
            );
        });
    }

    // [수정] AI 이미지 생성 시작 시 completedAt은 유지하되 imageGenerating=true로 전환
    private boolean markImageGenerationStarted(Long plazaId, LocalDateTime completedAt) {
        Boolean started = transactionTemplate.execute(status -> {
            Plaza plaza = plazaRepository.findById(plazaId).orElse(null);
            if (plaza == null) {
                return false;
            }

            if (plaza.isImageGenerating()) {
                return false;
            }

            if (plaza.getCompletedAt() == null) {
                plaza.markCompleted(completedAt);
            }

            plaza.startImageGeneration();
            return true;
        });

        return Boolean.TRUE.equals(started);
    }

    // [수정] AI 이미지 생성 종료 시 imageGenerating=false로 전환
    private void markImageGenerationFinished(Long plazaId) {
        transactionTemplate.executeWithoutResult(status -> {
            Plaza plaza = plazaRepository.findById(plazaId).orElse(null);
            if (plaza == null) {
                return;
            }

            plaza.finishImageGeneration();
        });
    }

    private String generateImage(CompletionSnapshot snapshot) {
        try {
            log.info("[plaza-completion-test] image generation started. plazaId={}", snapshot.plazaId());
            return openAiClient.generateImageDataUrl(snapshot.prompt());
        } catch (Exception e) {
            log.warn("Plaza image generation failed. plazaId={}, reason={}", snapshot.plazaId(), e.getMessage());
            return null;
        }
    }

    private String uploadImageToS3(CompletionSnapshot snapshot, String generatedImageData) {
        if (generatedImageData == null || generatedImageData.isBlank()) {
            log.info("[plaza-completion-test] S3 upload skipped because image data is empty. plazaId={}",
                    snapshot.plazaId()
            );
            return null;
        }

        try {
            log.info("[plaza-completion-test] S3 upload started. plazaId={}", snapshot.plazaId());

            String imageUrl = s3ImageStorageService.uploadDataUrl(
                    generatedImageData,
                    "plazas/" + snapshot.plazaId()
            );

            log.info("[plaza-completion-test] S3 upload finished. plazaId={}, imageUrl={}",
                    snapshot.plazaId(),
                    imageUrl
            );

            return imageUrl;
        } catch (Exception e) {
            log.warn("[plaza-completion-test] S3 upload failed. plazaId={}, reason={}",
                    snapshot.plazaId(),
                    e.getMessage()
            );

            return null;
        }
    }

    private MailboxService.CompletionLetterReceiver toCompletionLetterReceiver(User receiver, PlazaEntry entry) {
        return new MailboxService.CompletionLetterReceiver(
                receiver,
                entry == null ? null : entry.getObjectKey(),
                entry == null ? null : entry.getTitle(),
                entry == null ? null : entry.getContent()
        );
    }

    private record CompletionSnapshot(
            Long plazaId,
            String plazaTitle,
            LocalDateTime plazaCreatedAt,
            LocalDateTime completedAt,
            Long participantCount,
            String prompt,
            List<MailboxService.CompletionLetterReceiver> receivers
    ) {
    }
}