package com.woth.backend.inquiry;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.moderation.UserWarningRepository;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * [1:1 문의 서비스]
 * 문의 작성과 목록 조회(페이징)를 담당합니다.
 * 한 페이지에 노출할 문의 개수는 10개로 고정합니다.
 */
@Service
public class InquiryService {

    public static final int PAGE_SIZE = 10;
    private static final int TITLE_MAX_LENGTH = 100;
    private static final int CONTENT_MAX_LENGTH = 2000;
    private static final int ANSWER_MAX_LENGTH = 2000;

    private final InquiryRepository inquiryRepository;
    private final UserRepository userRepository;
    private final UserWarningRepository warningRepository;

    public InquiryService(
            InquiryRepository inquiryRepository,
            UserRepository userRepository,
            UserWarningRepository warningRepository
    ) {
        this.inquiryRepository = inquiryRepository;
        this.userRepository = userRepository;
        this.warningRepository = warningRepository;
    }

    @Transactional
    public Inquiry create(Long authorId, String authorNickname, String authorEmail, String title, String content, boolean isPublic) {
        String normalizedTitle = title == null ? "" : title.trim();
        String normalizedContent = content == null ? "" : content.trim();

        if (normalizedTitle.isEmpty() || normalizedContent.isEmpty()
                || normalizedTitle.length() > TITLE_MAX_LENGTH
                || normalizedContent.length() > CONTENT_MAX_LENGTH) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Inquiry inquiry = Inquiry.builder()
                .author(author)
                .authorNickname(authorNickname)
                .authorEmail(authorEmail)
                .title(normalizedTitle)
                .content(normalizedContent)
                .isPublic(isPublic)
                .build();

        return inquiryRepository.save(inquiry);
    }

    @Transactional
    public Inquiry answer(Long inquiryId, String answererNickname, String answerContent) {
        String normalizedAnswer = answerContent == null ? "" : answerContent.trim();

        if (normalizedAnswer.isEmpty() || normalizedAnswer.length() > ANSWER_MAX_LENGTH) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new CustomException(ErrorCode.INQUIRY_NOT_FOUND));

        inquiry.writeAnswer(normalizedAnswer, answererNickname);

        return inquiry;
    }

    @Transactional
    public void delete(Long inquiryId, Long authorId) {
        Inquiry inquiry = inquiryRepository.findById(inquiryId)
                .orElseThrow(() -> new CustomException(ErrorCode.INQUIRY_NOT_FOUND));

        Long inquiryAuthorId = inquiry.getAuthor() == null ? null : inquiry.getAuthor().getId();

        if (!authorId.equals(inquiryAuthorId)) {
            throw new CustomException(ErrorCode.FORBIDDEN);
        }

        inquiryRepository.delete(inquiry);
    }

    @Transactional(readOnly = true)
    public Page<Inquiry> list(int page) {
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, PAGE_SIZE);

        return inquiryRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    @Transactional(readOnly = true)
    public long countWarnings(Long userId) {
        return userId == null ? 0L : warningRepository.countByUserId(userId);
    }
}
