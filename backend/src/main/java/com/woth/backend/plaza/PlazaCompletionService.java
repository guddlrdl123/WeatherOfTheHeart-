package com.woth.backend.plaza;

import com.woth.backend.ai.service.OpenAiClient;
import com.woth.backend.mailbox.MailboxService;
import com.woth.backend.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
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

    public PlazaCompletionService(
            OpenAiClient openAiClient,
            MailboxService mailboxService,
            PlazaImagePromptBuilder promptBuilder,
            PlazaRepository plazaRepository,
            PlazaEntryRepository plazaEntryRepository,
            PlatformTransactionManager transactionManager
    ) {
        this.openAiClient = openAiClient;
        this.mailboxService = mailboxService;
        this.promptBuilder = promptBuilder;
        this.plazaRepository = plazaRepository;
        this.plazaEntryRepository = plazaEntryRepository;
        this.transactionTemplate = new TransactionTemplate(transactionManager);
    }

    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void completeIfReady(PlazaEntryCreatedEvent event) {
        CompletionSnapshot snapshot = loadCompletionSnapshot(event.plazaId());

        if (snapshot == null) {
            return;
        }

        int marked = markCompleted(snapshot.plazaId(), snapshot.completedAt());
        if (marked == 0) {
            return;
        }

        String generatedImageData = generateImage(snapshot);
        mailboxService.sendPlazaCompletionLetters(
                snapshot.plazaId(),
                snapshot.plazaTitle(),
                snapshot.completedAt(),
                snapshot.receivers(),
                generatedImageData
        );
    }

    private CompletionSnapshot loadCompletionSnapshot(Long plazaId) {
        return transactionTemplate.execute(status -> {
            Plaza plaza = plazaRepository.findById(plazaId).orElse(null);
            if (plaza == null || plaza.isCompleted()) {
                return null;
            }

            List<PlazaEntry> entries = plazaEntryRepository.findByPlazaId(plazaId);
            if (entries.size() < plaza.getMaxObjects()) {
                return null;
            }

            // 프롬프트와 수신자를 트랜잭션 안에서 확정해 lazy loading 영향을 받지 않도록 합니다.
            String prompt = promptBuilder.build(plaza, entries);
            List<User> receivers = entries.stream()
                    .map(PlazaEntry::getOwner)
                    .distinct()
                    .toList();

            return new CompletionSnapshot(
                    plaza.getId(),
                    plaza.getTitle(),
                    LocalDateTime.now(),
                    prompt,
                    receivers
            );
        });
    }

    private int markCompleted(Long plazaId, LocalDateTime completedAt) {
        return transactionTemplate.execute(status -> plazaRepository.markCompletedIfNotAlready(plazaId, completedAt));
    }

    private String generateImage(CompletionSnapshot snapshot) {
        try {
            return openAiClient.generateImageDataUrl(snapshot.prompt());
        } catch (Exception e) {
            log.warn("Plaza image generation failed. plazaId={}, reason={}", snapshot.plazaId(), e.getMessage());
            return null;
        }
    }

    private record CompletionSnapshot(
            Long plazaId,
            String plazaTitle,
            LocalDateTime completedAt,
            String prompt,
            List<User> receivers
    ) {
    }
}