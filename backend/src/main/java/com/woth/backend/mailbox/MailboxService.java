package com.woth.backend.mailbox;


import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.plaza.Plaza;
import com.woth.backend.plaza.PlazaEntry;
import com.woth.backend.plaza.PlazaEntryRepository;
import com.woth.backend.plaza.PlazaRepository;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

/**
 * 우편함 도메인 비즈니스 로직을 담당하는 서비스입니다.
 * 편지 목록 조회, 읽음 상태 업데이트 등의 데이터를 처리합니다.
 */
@Service
public class MailboxService {
    private final LetterRepository letterRepository;
    private final UserRepository userRepository;
    private final PlazaRepository plazaRepository;
    private final PlazaEntryRepository plazaEntryRepository;

    public MailboxService(
            LetterRepository letterRepository,
            UserRepository userRepository,
            PlazaRepository plazaRepository,
            PlazaEntryRepository plazaEntryRepository
    ) {
        this.letterRepository = letterRepository;
        this.userRepository = userRepository;
        this.plazaRepository = plazaRepository;
        this.plazaEntryRepository = plazaEntryRepository;
    }

    @Transactional(readOnly = true)
    public List<MailboxItemView> listLetters(Long receiverId) {
        if(!userRepository.existsById(receiverId)) {
            throw  new CustomException(ErrorCode.USER_NOT_FOUND);
        }
        return letterRepository.findByReceiverIdOrderByCreatedAtDesc(receiverId).stream()
                .map(letter -> toMailboxItemView(receiverId, letter))
                .toList();
    }

    @Transactional(readOnly = true)
    public long countUnreadLetters(Long receiverId) {
        if(!userRepository.existsById(receiverId)) {
            throw  new CustomException(ErrorCode.USER_NOT_FOUND);
        }
        return letterRepository.countByReceiverIdAndIsReadFalse(receiverId);
    }

    @Transactional
    public MailboxItemView markRead(Long receiverId, Long letterId) {
        Letter letter = letterRepository.findById(letterId)
                .orElseThrow(() -> new CustomException(ErrorCode.MAILBOX_NOT_FOUND));

        if(!letter.getReceiver().getId().equals(receiverId)) {
            throw new CustomException(ErrorCode.MAILBOX_NOT_FOUND);
        }

        if(!letter.getIsRead()) {
            letter.markRead();
            letter = letterRepository.save(letter);
        }

        return toMailboxItemView(receiverId, letter);
    }

    @Transactional
    public int markAllRead(Long receiverId) {
        if(!userRepository.existsById(receiverId)) {
            throw new CustomException(ErrorCode.USER_NOT_FOUND);
        }

        return letterRepository.markAllAsReadByReceiverId(receiverId);
    }

    // [수정] 우편함에서 본인 편지만 삭제할 수 있도록 삭제 로직 추가
    @Transactional
    public void deleteLetter(Long receiverId, Long letterId) {
        Letter letter = letterRepository.findByIdAndReceiverId(letterId, receiverId)
                .orElseThrow(() -> new CustomException(ErrorCode.MAILBOX_NOT_FOUND));

        letterRepository.delete(letter);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendPlazaCompletionLetters(
            Long plazaId,
            String plazaTitle,
            LocalDateTime plazaCreatedAt,
            LocalDateTime completedAt,
            Long participantCount,
            List<CompletionLetterReceiver> receivers,
            String generatedImageData
    ) {
        for(CompletionLetterReceiver receiverSnapshot: receivers) {
            User receiver = receiverSnapshot.receiver();
            if(letterRepository.existsByReceiverIdAndPlazaId(receiver.getId(), plazaId)) {
                continue;
                // 광장이 완성되면 참여자 전원에게 같은 AI완성 이미지를 담은 우편을 보냅니다.
            }

            // 비동기 완료 처리에서 넘어온 User는 detached 상태일 수 있어 새 트랜잭션의 참조로 다시 연결합니다
            User managedReceiver = userRepository.getReferenceById(receiver.getId());
            Letter letter = Letter.builder()
                    .receiver(managedReceiver)
                    .title("완성된 광장의 사진이 도착했어요")
                    .message("함께 남긴 오브젝트들이 하나의 광장으로 완성되었어요. 우편에 담긴 이미지를 열어 그날의 광장을 확인해주세요")
                    .plazaTitle(plazaTitle)
                    .plazaId(plazaId)
                    .generatedImageData(generatedImageData)
                    .completedAt(completedAt)
                    .plazaCreatedAt(plazaCreatedAt)
                    .participantCount(participantCount)
                    .myObjectKey(receiverSnapshot.myObjectKey())
                    .myObjectTitle(receiverSnapshot.myObjectTitle())
                    .myObjectContent(receiverSnapshot.myObjectContent())
                    .build();
            letterRepository.save(letter);
        }
    }

    private MailboxItemView toMailboxItemView(Long receiverId, Letter letter) {
        Long plazaId = letter.getPlazaId();
        LocalDateTime plazaCreatedAt = letter.getPlazaCreatedAt();
        Long participantCount = letter.getParticipantCount();
        String myObjectKey = letter.getMyObjectKey();
        String myObjectTitle = letter.getMyObjectTitle();
        String myObjectContent = letter.getMyObjectContent();

        if(plazaId != null) {
            if (plazaCreatedAt == null) {
                plazaCreatedAt = plazaRepository.findById(plazaId)
                        .map(Plaza::getCreatedAt)
                        .orElse(null);
            }

            if (participantCount == null) {
                participantCount = plazaEntryRepository.countByPlazaId(plazaId);
            }

            if (myObjectKey == null && myObjectTitle == null && myObjectContent == null) {
                PlazaEntry myEntry = plazaEntryRepository.findFirstByPlazaIdAndOwnerIdOrderByIdAsc(plazaId, receiverId)
                        .orElse(null);
                myObjectKey = myEntry == null ? null : myEntry.getObjectKey();
                myObjectTitle = myEntry == null ? null : myEntry.getTitle();
                myObjectContent = myEntry == null ? null : myEntry.getContent();
            }
        }

        return new MailboxItemView(
                letter,
                plazaCreatedAt,
                participantCount == null ? 0L : participantCount,
                myObjectKey,
                myObjectTitle,
                myObjectContent
        );
    }

    public record CompletionLetterReceiver(
            User receiver,
            String myObjectKey,
            String myObjectTitle,
            String myObjectContent
    ) {
    }

    public record MailboxItemView(
            Letter letter,
            LocalDateTime plazaCreatedAt,
            Long participantCount,
            String myObjectKey,
            String myObjectTitle,
            String myObjectContent
    ) {
    }
}
