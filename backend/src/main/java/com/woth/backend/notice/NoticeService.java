package com.woth.backend.notice;

import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * [공지사항 서비스]
 * 공지 작성/수정/삭제와 목록 조회(페이징)를 담당합니다.
 * 한 페이지에 노출할 공지 개수는 10개로 고정합니다.
 */
@Service
public class NoticeService {

    public static final int PAGE_SIZE = 10;
    private static final int TITLE_MAX_LENGTH = 100;
    private static final int CONTENT_MAX_LENGTH = 5000;

    private final NoticeRepository noticeRepository;
    private final UserRepository userRepository;

    public NoticeService(NoticeRepository noticeRepository, UserRepository userRepository) {
        this.noticeRepository = noticeRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public Notice create(Long authorId, String authorNickname, String title, String content) {
        String normalizedTitle = normalize(title);
        String normalizedContent = normalize(content);
        validate(normalizedTitle, normalizedContent);

        User author = userRepository.findById(authorId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        Notice notice = Notice.builder()
                .author(author)
                .authorNickname(authorNickname)
                .title(normalizedTitle)
                .content(normalizedContent)
                .build();

        return noticeRepository.save(notice);
    }

    @Transactional
    public Notice update(Long noticeId, String title, String content) {
        String normalizedTitle = normalize(title);
        String normalizedContent = normalize(content);
        validate(normalizedTitle, normalizedContent);

        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));

        notice.update(normalizedTitle, normalizedContent);

        return notice;
    }

    @Transactional
    public void delete(Long noticeId) {
        Notice notice = noticeRepository.findById(noticeId)
                .orElseThrow(() -> new CustomException(ErrorCode.NOTICE_NOT_FOUND));

        noticeRepository.delete(notice);
    }

    @Transactional(readOnly = true)
    public Page<Notice> list(int page) {
        int safePage = Math.max(page, 0);
        Pageable pageable = PageRequest.of(safePage, PAGE_SIZE);

        return noticeRepository.findAllByOrderByCreatedAtDesc(pageable);
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim();
    }

    private void validate(String title, String content) {
        if (title.isEmpty() || content.isEmpty()
                || title.length() > TITLE_MAX_LENGTH
                || content.length() > CONTENT_MAX_LENGTH) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
    }
}
