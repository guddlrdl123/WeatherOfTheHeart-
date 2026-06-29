import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Ban, CheckCircle2, EyeOff, RefreshCw, ShieldCheck, Siren, Trash2, UserRound, X } from "lucide-react";
import { AppHeader } from "../../components/layout/AppHeader";
import {
  moderateReportedEntry,
  fetchReportedEntries,
  updateUserSuspension,
  type ReportedEntry,
} from "../../services/moderationService";

const REPORT_REASON_LABELS: Record<string, string> = {
  ABUSIVE_CONTENT: "부적절하거나 불쾌한 내용",
  HARASSMENT: "괴롭힘 또는 위협",
  HATE_OR_DISCRIMINATION: "혐오 또는 차별",
  SPAM: "스팸 또는 도배",
  OTHER: "기타",
};

type ActionTarget = {
  kind: "delete" | "suspend" | "release";
  item: ReportedEntry;
};

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getDefaultWarningReason(item: ReportedEntry) {
  const labels = Array.from(new Set(item.reports.map((report) => REPORT_REASON_LABELS[report.reason] ?? report.reason)));
  return labels.slice(0, 2).join(", ") || "커뮤니티 운영 정책 위반";
}

function AdminReportsPage() {
  const [items, setItems] = useState<ReportedEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [actionTarget, setActionTarget] = useState<ActionTarget | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isActing, setIsActing] = useState(false);

  const totalReports = useMemo(() => items.reduce((sum, item) => sum + item.reportCount, 0), [items]);
  const reportedUsers = useMemo(() => new Set(items.map((item) => item.reportedUserId)).size, [items]);

  const loadReports = useCallback(async () => {
    try {
      setIsLoading(true);
      setError("");
      const nextItems = await fetchReportedEntries();
      setItems(nextItems);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "신고 내역을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => void loadReports(), 0);
    return () => window.clearTimeout(timerId);
  }, [loadReports]);

  function openAction(kind: ActionTarget["kind"], item: ReportedEntry) {
    setActionTarget({ kind, item });
    setError("");
    setNotice("");
    setActionReason(
      kind === "delete"
        ? getDefaultWarningReason(item)
        : kind === "suspend"
          ? `누적 경고 ${item.warningCount}회 및 신고 내역 검토`
          : "",
    );
  }

  async function confirmAction() {
    if (!actionTarget || isActing) return;
    if (actionTarget.kind !== "release" && !actionReason.trim()) return;

    try {
      setIsActing(true);
      setError("");

      if (actionTarget.kind === "delete") {
        const result = await moderateReportedEntry(actionTarget.item.entryId, actionReason.trim());
        setItems((current) => current
          .filter((item) => item.entryId !== actionTarget.item.entryId)
          .map((item) => item.reportedUserId === result.userId
            ? { ...item, warningCount: result.warningCount }
            : item));
        const actionLabel = result.entryAction === "BLINDED" ? "블라인드 처리하고" : "삭제하고";
        setNotice(`글을 ${actionLabel} ${actionTarget.item.reportedUserNickname}님에게 경고 ${result.warningCount}회를 발송했습니다.`);
      } else {
        const shouldSuspend = actionTarget.kind === "suspend";
        const result = await updateUserSuspension(
          actionTarget.item.reportedUserId,
          shouldSuspend,
          actionReason.trim(),
        );
        setItems((current) => current.map((item) => item.reportedUserId === result.userId
          ? { ...item, suspended: result.suspended }
          : item));
        setNotice(shouldSuspend ? "계정 이용을 정지했습니다." : "계정 정지를 해제했습니다.");
      }

      setActionTarget(null);
      setActionReason("");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "처리 중 오류가 발생했습니다.");
    } finally {
      setIsActing(false);
    }
  }

  return (
    <div className="mw-app flex min-h-screen flex-col select-none">
      <AppHeader />

      <main className="min-h-0 flex-1 overflow-auto px-5 py-8 sm:px-8">
        <div className="mx-auto w-full max-w-[1080px]">
          <section className="flex flex-col justify-between gap-5 border-b border-[#5a4632]/12 pb-6 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-md border border-[#a75e55]/20 bg-[#a75e55]/10 text-[#a75e55]">
                <Siren size={19} />
              </div>
              <h1 className="text-2xl font-normal text-[#5a4632]">신고 내역</h1>
              <p className="mt-2 text-sm text-[#5a4632]/58">진행 중인 글은 삭제하고, 종료된 광장의 글은 블라인드 처리합니다.</p>
            </div>
            <button
              type="button"
              onClick={() => void loadReports()}
              disabled={isLoading}
              className="mw-button inline-flex h-9 items-center justify-center gap-2 self-start rounded-md px-3 text-sm disabled:opacity-50 sm:self-auto"
            >
              <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
              새로고침
            </button>
          </section>

          <section className="grid grid-cols-3 border-b border-[#5a4632]/12 py-5 text-center">
            <div><p className="text-xl text-[#5a4632]">{items.length}</p><p className="mt-1 text-xs text-[#5a4632]/48">신고된 글</p></div>
            <div className="border-x border-[#5a4632]/12"><p className="text-xl text-[#5a4632]">{totalReports}</p><p className="mt-1 text-xs text-[#5a4632]/48">접수된 신고</p></div>
            <div><p className="text-xl text-[#5a4632]">{reportedUsers}</p><p className="mt-1 text-xs text-[#5a4632]/48">신고된 사용자</p></div>
          </section>

          {notice && (
            <div className="mt-5 flex items-center gap-2 rounded-md border border-[#5f8a62]/25 bg-[#5f8a62]/10 px-4 py-3 text-sm text-[#4f7652]">
              <CheckCircle2 size={16} className="shrink-0" />{notice}
            </div>
          )}
          {error && (
            <div className="mt-5 flex items-center gap-2 rounded-md border border-[#a75e55]/25 bg-[#a75e55]/10 px-4 py-3 text-sm text-[#a75e55]">
              <AlertTriangle size={16} className="shrink-0" />{error}
            </div>
          )}

          {isLoading ? (
            <div className="grid min-h-[300px] place-items-center text-sm text-[#5a4632]/52">신고 내역을 불러오는 중입니다.</div>
          ) : items.length === 0 ? (
            <div className="grid min-h-[300px] place-items-center text-center">
              <div><ShieldCheck size={30} className="mx-auto text-[#5f8a62]/65" /><p className="mt-4 text-base text-[#5a4632]">처리할 신고가 없습니다.</p></div>
            </div>
          ) : (
            <section className="mt-6 flex flex-col gap-4">
              {items.map((item) => (
                <article key={item.entryId} className="mw-surface overflow-hidden rounded-lg">
                  <div className="flex flex-col gap-4 border-b border-[#5a4632]/10 px-5 py-4 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-[#a75e55]/12 px-2 py-1 text-[#a75e55]">신고 {item.reportCount}건</span>
                        <span className="rounded-full bg-[#5a4632]/[0.07] px-2 py-1 text-[#5a4632]/62">{item.completedPlaza ? "종료된 광장" : "진행 중인 광장"}</span>
                        <span className="text-[#5a4632]/45">{formatDateTime(item.latestReportedAt)}</span>
                        <span className="text-[#5a4632]/45">{item.plazaTitle}</span>
                      </div>
                      <h2 className="mt-3 text-base font-semibold text-[#5a4632]">{item.entryTitle || "제목 없는 글"}</h2>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-[#5a4632]/68">{item.entryContent}</p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <button
                        type="button"
                        onClick={() => openAction("delete", item)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#a75e55]/25 px-3 text-xs text-[#a75e55] hover:bg-[#a75e55]/10"
                      >{item.completedPlaza ? <EyeOff size={14} /> : <Trash2 size={14} />}{item.completedPlaza ? "블라인드 및 경고" : "삭제 및 경고"}</button>
                      <button
                        type="button"
                        onClick={() => openAction(item.suspended ? "release" : "suspend", item)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-md border border-[#5a4632]/20 px-3 text-xs text-[#5a4632]/72 hover:bg-[#5a4632]/8"
                      >{item.suspended ? <ShieldCheck size={14} /> : <Ban size={14} />}{item.suspended ? "정지 해제" : "계정 정지"}</button>
                    </div>
                  </div>

                  <div className="grid gap-0 md:grid-cols-[260px_1fr]">
                    <div className="border-b border-[#5a4632]/10 px-5 py-4 md:border-b-0 md:border-r">
                      <p className="flex items-center gap-2 text-xs font-medium text-[#5a4632]/52"><UserRound size={14} />작성자</p>
                      <p className="mt-2 text-sm text-[#5a4632]">{item.reportedUserNickname}</p>
                      <p className="mt-1 truncate text-xs text-[#5a4632]/48">{item.reportedUserEmail}</p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs">
                        <span className="rounded-full bg-[#d39a43]/12 px-2 py-1 text-[#9a6b25]">경고 {item.warningCount}회</span>
                        {item.suspended && <span className="rounded-full bg-[#a75e55]/12 px-2 py-1 text-[#a75e55]">이용 정지 중</span>}
                      </div>
                    </div>
                    <div className="px-5 py-4">
                      <p className="text-xs font-medium text-[#5a4632]/52">신고 사유</p>
                      <div className="mt-3 divide-y divide-[#5a4632]/8">
                        {item.reports.map((report) => (
                          <div key={report.reportId} className="py-3 first:pt-0 last:pb-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-sm text-[#5a4632]">{REPORT_REASON_LABELS[report.reason] ?? report.reason}</span>
                            </div>
                            {report.detail && <p className="mt-1.5 whitespace-pre-wrap text-xs leading-6 text-[#5a4632]/58">{report.detail}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </section>
          )}
        </div>
      </main>

      {actionTarget && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-[2px]" onPointerDown={() => !isActing && setActionTarget(null)}>
          <section className="w-full max-w-[460px] rounded-lg border border-[#5a4632]/15 bg-[#fffbf6] p-5 shadow-xl" onPointerDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-base font-semibold text-[#5a4632]">
                  {actionTarget.kind === "delete"
                    ? actionTarget.item.completedPlaza ? "글을 블라인드하고 경고할까요?" : "글을 삭제하고 경고할까요?"
                    : actionTarget.kind === "suspend" ? "계정 이용을 정지할까요?" : "계정 정지를 해제할까요?"}
                </h2>
                <p className="mt-2 text-xs leading-6 text-[#5a4632]/58">
                  {actionTarget.kind === "delete"
                    ? actionTarget.item.completedPlaza
                      ? "종료된 광장의 기록은 보존되고, 일반 사용자에게 내용이 보이지 않게 됩니다."
                      : "글은 즉시 삭제되며 작성자의 우편함에 누적 경고 횟수가 발송됩니다."
                    : actionTarget.kind === "suspend"
                      ? "정지 즉시 기존 로그인도 만료되며 다시 로그인할 수 없습니다."
                      : "해제 후 사용자가 다시 로그인할 수 있습니다."}
                </p>
              </div>
              <button type="button" onClick={() => setActionTarget(null)} disabled={isActing} className="grid h-8 w-8 shrink-0 place-items-center rounded-md hover:bg-[#5a4632]/8" aria-label="닫기"><X size={16} /></button>
            </div>

            {actionTarget.kind !== "release" && (
              <label className="mt-5 flex flex-col gap-2">
                <span className="text-xs text-[#5a4632]/68">처분 사유</span>
                <textarea
                  value={actionReason}
                  onChange={(event) => setActionReason(event.target.value)}
                  rows={3}
                  maxLength={255}
                  className="mw-input resize-none px-3 py-2 text-sm leading-6"
                />
                <span className="self-end text-[11px] text-[#5a4632]/38">{actionReason.length}/255</span>
              </label>
            )}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setActionTarget(null)} disabled={isActing} className="rounded-md border border-[#5a4632]/18 px-4 py-2 text-sm text-[#5a4632]/68 hover:bg-[#5a4632]/8 disabled:opacity-50">취소</button>
              <button
                type="button"
                onClick={() => void confirmAction()}
                disabled={isActing || (actionTarget.kind !== "release" && !actionReason.trim())}
                className="inline-flex items-center gap-2 rounded-md bg-[#a75e55] px-4 py-2 text-sm text-white hover:bg-[#96534b] disabled:opacity-50"
              >
                {actionTarget.kind === "delete" ? actionTarget.item.completedPlaza ? <EyeOff size={14} /> : <Trash2 size={14} /> : actionTarget.kind === "suspend" ? <Ban size={14} /> : <ShieldCheck size={14} />}
                {isActing ? "처리 중" : actionTarget.kind === "delete" ? actionTarget.item.completedPlaza ? "블라인드 및 경고" : "삭제 및 경고" : actionTarget.kind === "suspend" ? "정지" : "정지 해제"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default AdminReportsPage;
