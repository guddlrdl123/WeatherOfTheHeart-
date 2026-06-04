package com.woth.backend.mailbox;


import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
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

    public MailboxService(LetterRepository letterRepository, UserRepository userRepository) {
        this.letterRepository = letterRepository;
        this.userRepository = userRepository;
    }
    @Transactional(readOnly = true)
    public List<Letter> listLetters(Long receiverId) {
        if(!userRepository.existsById(receiverId)) {
            throw  new CustomException(ErrorCode.USER_NOT_FOUND);
        }
        return letterRepository.findByReceiverIdOrderByCreatedAtDesc(receiverId);
    }
    @Transactional public Letter markRead(Long letterId) {
        Letter letter = letterRepository.findById(letterId)
                .orElseThrow(() -> new CustomException(ErrorCode.MAILBOX_NOT_FOUND));
        if(!letter.getIsRead()) {
            letter.markRead();
            return letterRepository.save(letter);
        }
        return letter;
    }
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendPlazaCompletionLetters(
            Long plazaId,
            String plazaTitle,
            LocalDateTime completedAt,
            List<User> receivers,
            String generatedImageData
    ) {
        for(User receiver: receivers) {
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
                    .build();
            letterRepository.save(letter);
        }
    }
}






























