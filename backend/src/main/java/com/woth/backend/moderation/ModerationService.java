package com.woth.backend.moderation;

import com.woth.backend.auth.RefreshTokenRepository;
import com.woth.backend.global.exception.CustomException;
import com.woth.backend.global.exception.ErrorCode;
import com.woth.backend.like.ObjectLikeRepository;
import com.woth.backend.mailbox.MailboxService;
import com.woth.backend.plaza.PlazaEntry;
import com.woth.backend.plaza.PlazaEntryReport;
import com.woth.backend.plaza.PlazaEntryReportRepository;
import com.woth.backend.plaza.PlazaEntryRepository;
import com.woth.backend.user.User;
import com.woth.backend.user.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ModerationService {

    private static final int REASON_MAX_LENGTH = 255;

    private final PlazaEntryReportRepository reportRepository;
    private final PlazaEntryRepository entryRepository;
    private final ObjectLikeRepository objectLikeRepository;
    private final UserRepository userRepository;
    private final UserWarningRepository warningRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final MailboxService mailboxService;

    public ModerationService(
            PlazaEntryReportRepository reportRepository,
            PlazaEntryRepository entryRepository,
            ObjectLikeRepository objectLikeRepository,
            UserRepository userRepository,
            UserWarningRepository warningRepository,
            RefreshTokenRepository refreshTokenRepository,
            MailboxService mailboxService
    ) {
        this.reportRepository = reportRepository;
        this.entryRepository = entryRepository;
        this.objectLikeRepository = objectLikeRepository;
        this.userRepository = userRepository;
        this.warningRepository = warningRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.mailboxService = mailboxService;
    }

    @Transactional(readOnly = true)
    public List<ReportedEntryView> listReportedEntries() {
        Map<Long, ReportedEntryAccumulator> grouped = new LinkedHashMap<>();

        for (PlazaEntryReport report : reportRepository.findAllByOrderByCreatedAtDesc()) {
            PlazaEntry entry = report.getPlazaEntry();
            User owner = entry.getOwner();
            ReportedEntryAccumulator accumulator = grouped.computeIfAbsent(
                    entry.getId(),
                    ignored -> new ReportedEntryAccumulator(
                            entry,
                            owner,
                            warningRepository.countByUserId(owner.getId())
                    )
            );

            accumulator.reports().add(new ReportDetailView(
                    report.getId(),
                    report.getReporter().getNickname(),
                    report.getReason(),
                    report.getDetail(),
                    report.getCreatedAt()
            ));
        }

        return grouped.values().stream()
                .map(ReportedEntryAccumulator::toView)
                .toList();
    }

    @Transactional
    public ModerationActionResult deleteEntryAndWarn(Long entryId, String reason, String adminNickname) {
        PlazaEntry entry = entryRepository.findById(entryId)
                .orElseThrow(() -> new CustomException(ErrorCode.PLAZA_ENTRY_NOT_FOUND));
        if (Boolean.TRUE.equals(entry.getIsBlinded())) {
            throw new CustomException(ErrorCode.PLAZA_ENTRY_BLINDED);
        }
        String normalizedReason = normalizeReason(reason);
        User reportedUser = entry.getOwner();
        boolean shouldBlind = entry.getPlaza().isCompleted();

        UserWarning warning = warningRepository.save(UserWarning.builder()
                .user(reportedUser)
                .sourceEntryId(entry.getId())
                .sourceEntryTitle(entry.getTitle())
                .reason(normalizedReason)
                .issuedByNickname(adminNickname)
                .build());
        long warningCount = warningRepository.countByUserId(reportedUser.getId());

        mailboxService.sendWarningLetter(reportedUser, normalizedReason, warningCount, shouldBlind);
        reportRepository.deleteByPlazaEntryId(entryId);
        if (shouldBlind) {
            entry.blind(normalizedReason);
        } else {
            objectLikeRepository.deleteByPlazaEntryId(entryId);
            entryRepository.delete(entry);
        }

        return new ModerationActionResult(
                reportedUser.getId(),
                warning.getId(),
                warningCount,
                Boolean.TRUE.equals(reportedUser.getIsSuspended()),
                shouldBlind ? "BLINDED" : "DELETED"
        );
    }

    @Transactional
    public ModerationActionResult updateSuspension(Long userId, boolean suspended, String reason) {
        User user = userRepository.findByIdAndIsDeletedFalse(userId)
                .orElseThrow(() -> new CustomException(ErrorCode.USER_NOT_FOUND));

        if (Boolean.TRUE.equals(user.getIsAdmin())) {
            throw new CustomException(ErrorCode.MODERATION_ADMIN_SUSPEND_FORBIDDEN);
        }

        if (suspended) {
            user.suspend(normalizeReason(reason));
            refreshTokenRepository.deleteByUserId(userId);
        } else {
            user.releaseSuspension();
        }

        return new ModerationActionResult(
                userId,
                null,
                warningRepository.countByUserId(userId),
                Boolean.TRUE.equals(user.getIsSuspended()),
                null
        );
    }

    private String normalizeReason(String reason) {
        if (reason == null || reason.isBlank()) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }

        String normalized = reason.trim();
        if (normalized.length() > REASON_MAX_LENGTH) {
            throw new CustomException(ErrorCode.INVALID_INPUT);
        }
        return normalized;
    }

    private record ReportedEntryAccumulator(
            PlazaEntry entry,
            User owner,
            long warningCount,
            List<ReportDetailView> reports
    ) {
        private ReportedEntryAccumulator(PlazaEntry entry, User owner, long warningCount) {
            this(entry, owner, warningCount, new ArrayList<>());
        }

        private ReportedEntryView toView() {
            return new ReportedEntryView(
                    entry.getId(),
                    entry.getPlaza().getId(),
                    entry.getPlaza().getTitle(),
                    entry.getTitle(),
                    entry.getContent(),
                    entry.getObjectKey(),
                    owner.getId(),
                    owner.getNickname(),
                    owner.getEmail(),
                    warningCount,
                    Boolean.TRUE.equals(owner.getIsSuspended()),
                    entry.getPlaza().isCompleted(),
                    reports.size(),
                    reports.getFirst().createdAt(),
                    List.copyOf(reports)
            );
        }
    }

    public record ReportedEntryView(
            Long entryId,
            Long plazaId,
            String plazaTitle,
            String entryTitle,
            String entryContent,
            String objectKey,
            Long reportedUserId,
            String reportedUserNickname,
            String reportedUserEmail,
            long warningCount,
            boolean suspended,
            boolean completedPlaza,
            int reportCount,
            LocalDateTime latestReportedAt,
            List<ReportDetailView> reports
    ) {
    }

    public record ReportDetailView(
            Long reportId,
            String reporterNickname,
            String reason,
            String detail,
            LocalDateTime createdAt
    ) {
    }

    public record ModerationActionResult(
            Long userId,
            Long warningId,
            long warningCount,
            boolean suspended,
            String entryAction
    ) {
    }
}
