import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, Download, ImageIcon, Inbox, MailCheck, MapPinned, RefreshCw, Trash2, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MailboxCard } from "../../components/mailbox/MailboxCard";
import { AppHeader } from "../../components/layout/AppHeader";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";
import { useRoomObjectCatalog } from "../../hooks/useRoomObjectCatalog";
import { useResponsiveStageWidth } from "../../hooks/useResponsiveStageWidth";
import { deleteMailboxItem, fetchMailbox, markAllMailboxItemsAsRead, markMailboxItemAsRead } from "../../services/mailboxService";
import type { MailboxItem } from "../../types/mailbox";

const MAILBOX_LAYOUT_WIDTH = 1460;
const MAILBOX_SUMMARY_HEIGHT = 60;
const MAILBOX_EMPTY_HEIGHT = 460;
const MAILBOX_ERROR_HEIGHT = 46;
const MAILBOX_CARD_HEIGHT = 320;
const MAILBOX_ROW_GAP = 16;
const MAILBOX_SECTION_GAP = 20;
const MAILBOX_FIT_HEIGHT = 620;
const MAILBOX_PAGE_PADDING_X = 128;
const MAILBOX_PAGE_PADDING_Y = 64;

function getMailboxLayoutHeight(itemCount: number, isLoading: boolean, hasError: boolean) {
  const bodyHeight = isLoading || itemCount === 0
    ? MAILBOX_EMPTY_HEIGHT
    : Math.ceil(itemCount / 3) * MAILBOX_CARD_HEIGHT + Math.max(0, Math.ceil(itemCount / 3) - 1) * MAILBOX_ROW_GAP;
  const errorHeight = hasError ? MAILBOX_SECTION_GAP + MAILBOX_ERROR_HEIGHT : 0;

  return MAILBOX_SUMMARY_HEIGHT + MAILBOX_SECTION_GAP + errorHeight + bodyHeight;
}

function formatDate(value: string) {
  // 상세 모달의 광장 기간은 날짜만 보여줍니다.
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

function formatPlazaPeriod(startValue: string, endValue: string) {
  const endText = formatDate(endValue);

  if (!startValue || startValue === endValue) {
    return `${endText} 종료`;
  }

  return `${formatDate(startValue)} ~ ${endText}`;
}

function getImageDownloadFileName(item: MailboxItem) {
  const baseName = (item.plazaTitle || item.title || "mailbox-image")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 80);

  return `${baseName || "mailbox-image"}.png`;
}

function MailboxDetailModal({
  item,
  onClose,
  onRequestDelete,
  onGoToPlaza,
}: {
  item: MailboxItem;
  onClose: () => void;
  onRequestDelete: (itemId: string) => void;
  onGoToPlaza: (plazaId: string) => void;
}) {
  useBodyScrollLock();

  const [isDownloadingImage, setIsDownloadingImage] = useState(false);
  const myObject = item.myObjectKey ? ROOM_OBJECT_BY_KEY[item.myObjectKey] : null;
  const myObjectContent = item.myObjectContent.trim();

  async function handleDownloadImage() {
    if (!item.generatedImageData || isDownloadingImage) {
      return;
    }

    try {
      setIsDownloadingImage(true);
      const response = await fetch(item.generatedImageData);

      if (!response.ok) {
        throw new Error("image download failed");
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = getImageDownloadFileName(item);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
    } catch {
      window.alert("이미지를 다운로드하지 못했습니다.");
    } finally {
      setIsDownloadingImage(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overscroll-contain bg-black/35 px-4 py-8 backdrop-blur-sm select-none">
      <section className="mw-surface grid max-h-[calc(100vh-64px)] w-full max-w-[980px] grid-cols-1 overflow-y-auto overscroll-contain rounded-xl bg-[#fffbf6f2] shadow-xl lg:grid-cols-[minmax(0,640px)_340px] lg:overflow-hidden">
        <div className="relative aspect-square w-full bg-[#5a4632]/[0.07]">
          {/* 우편의 핵심 데이터인 generatedImageData를 크게 보여주는 영역입니다. */}
          {item.generatedImageData && (
            <button
              type="button"
              onClick={() => void handleDownloadImage()}
              disabled={isDownloadingImage}
              className="absolute right-3 top-3 z-10 grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/10 bg-[#fffbf6]/30 text-[#5a4632] shadow-sm backdrop-blur-sm hover:bg-black/5 disabled:opacity-50"
              aria-label="이미지 다운로드"
              title="이미지 다운로드"
            >
              <Download size={17} />
            </button>
          )}
          {item.generatedImageData ? (
            <img
              src={item.generatedImageData}
              alt={`${item.plazaTitle} 완성 이미지`}
              className="h-full w-full object-contain"
            />
          ) : (
            <div className="grid h-full place-items-center text-[#5a4632]/35">
              <ImageIcon size={42} />
            </div>
          )}
        </div>

        <div className="mw-scrollbar-floating flex min-h-0 flex-col p-6 lg:overflow-y-auto lg:overscroll-contain">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.18em] text-[#5a4632]/40">MAILBOX</p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onRequestDelete(item.id)}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
                aria-label="우편 삭제"
                title="우편 삭제"
              >
                <Trash2 size={17} />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
                aria-label="닫기"
                title="닫기"
              >
                <X size={17} />
              </button>
            </div>
          </div>

          <h2 className="mt-3 text-lg font-normal leading-9 text-[#5a4632]">{item.title}</h2>

          <div className="mt-4 flex flex-col gap-3 text-sm text-[#5a4632]/65">
            <div className="flex items-center gap-3 rounded-lg border border-[#5a4632]/12 bg-white/30 px-4 py-3">
              <MapPinned size={16} className="shrink-0 text-[#9b6b54]" />
              <span className="min-w-0 truncate">{item.plazaTitle}</span>
            </div>
            <div className="flex items-start gap-3 rounded-lg border border-[#5a4632]/12 bg-white/30 px-4 py-3">
              <CalendarDays size={16} className="mt-0.5 shrink-0 text-[#9b6b54]" />
              <div className="min-w-0">
                <p className="text-[11px] text-[#5a4632]/42">광장 기간</p>
                <span className="mt-1 block leading-6">{formatPlazaPeriod(item.plazaCreatedAt, item.completedAt)}</span>
              </div>
            </div>
            <div className="rounded-lg border border-[#5a4632]/12 bg-white/30 px-4 py-4">
              <p className="text-[11px] text-[#5a4632]/42">내가 남긴 오브젝트</p>
              {myObject ? (
                <div className="mt-3 flex items-center gap-3">
                  <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#5a4632]/[0.06]">
                    <img src={myObject.image} alt="" className="h-11 w-11 object-contain" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-[#5a4632]/52">{myObject.label}</p>
                    {item.myObjectTitle && (
                      <p className="mt-1 line-clamp-2 text-base leading-5 text-[#5a4632]">{item.myObjectTitle}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#5a4632]/48">작성한 오브젝트 기록이 없어요.</p>
              )}
            </div>
            {myObjectContent && (
              <div className="rounded-lg border border-[#5a4632]/12 bg-white/30 px-4 py-4">
                {/* <p className="text-[11px] text-[#5a4632]/42">작성한 내용</p> */}
                <p className="mw-scrollbar-floating max-h-28 overflow-y-auto whitespace-pre-wrap pr-2 text-sm leading-6 text-[#5a4632]/62">
                  {myObjectContent}
                </p>
              </div>
            )}
            <div className="flex items-center gap-3 rounded-lg border border-[#5a4632]/12 bg-white/30 px-4 py-3">
              <Users size={16} className="shrink-0 text-[#9b6b54]" />
              <span>총 {item.participantCount}명이 발자취를 남겼어요.</span>
            </div>
          </div>

          <div className="min-h-6 flex-1" />

          <button
            type="button"
            onClick={() => onGoToPlaza(item.plazaId)}
            className="mw-button inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm"
          >
            연결된 광장 보기
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

type MailboxDeleteConfirmModalProps = {
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

function MailboxDeleteConfirmModal({ isDeleting, onCancel, onConfirm }: MailboxDeleteConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-black/25 px-4 py-8 backdrop-blur-[2px]"
      onPointerDown={isDeleting ? undefined : onCancel}
    >
      <div
        className="w-full max-w-[420px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl border border-[#b36a5e]/25 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl"
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-start gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] text-[#b36a5e]">
            <Trash2 size={17} />
          </div>
          <div>
            <h4 className="text-base font-semibold text-[#5a4632]">우편을 삭제할까요?</h4>
            <p className="mt-1 text-xs leading-6 text-[#5a4632]/65">
              삭제한 우편은 되돌릴 수 없어요.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-md border border-[#9b6b54]/40 bg-white/30 px-4 py-2 text-sm text-[#9b6b54]/80 hover:bg-white/60 disabled:opacity-50"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="rounded-md border border-[#b36a5e]/30 bg-[#f4dfd9] px-4 py-2 text-sm text-[#b36a5e] hover:bg-[#faebe7] disabled:opacity-50"
          >
            {isDeleting ? "삭제 중" : "삭제"}
          </button>
        </div>
      </div>
    </div>
  );
}

function MailboxPage() {
  useRoomObjectCatalog();

  const navigate = useNavigate();
  const [items, setItems] = useState<MailboxItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [deleteTargetItemId, setDeleteTargetItemId] = useState<string | null>(null);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const selectedItem = items.find((item) => item.id === selectedItemId) ?? null;
  const unreadCount = useMemo(() => items.filter((item) => !item.read).length, [items]);
  const hasUnread = unreadCount > 0;
  const mailboxLayoutHeight = getMailboxLayoutHeight(items.length, isLoading, Boolean(error));
  const stageWidth = useResponsiveStageWidth({
    designWidth: MAILBOX_LAYOUT_WIDTH,
    designHeight: Math.min(mailboxLayoutHeight, MAILBOX_FIT_HEIGHT),
    pagePaddingX: MAILBOX_PAGE_PADDING_X,
    pagePaddingY: MAILBOX_PAGE_PADDING_Y,
  });
  const stageScale = stageWidth / MAILBOX_LAYOUT_WIDTH;
  const stageHeight = mailboxLayoutHeight * stageScale;

  const loadMailbox = useCallback(async () => {
    // GET /api/mailbox 응답을 현재 로그인 사용자 기준으로 가져옵니다.
    try {
      setIsLoading(true);
      setError("");
      const nextItems = await fetchMailbox();
      setItems(nextItems);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "우편함을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    // React 훅 린트 규칙에 맞춰 초기 API 호출을 effect 밖 비동기 작업으로 넘깁니다.
    const timerId = window.setTimeout(() => {
      void loadMailbox();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadMailbox]);

  async function handleOpenItem(item: MailboxItem) {
    // 상세를 연 우편은 먼저 화면에서 읽음 처리하고, PATCH 실패 시 원래 상태로 되돌립니다.
    setSelectedItemId(item.id);

    if (item.read) {
      return;
    }

    setItems((current) => current.map((currentItem) => currentItem.id === item.id
      ? { ...currentItem, read: true }
      : currentItem));

    try {
      await markMailboxItemAsRead(item.id);
    } catch {
      setItems((current) => current.map((currentItem) => currentItem.id === item.id
        ? { ...currentItem, read: false }
        : currentItem));
      setError("우편 읽음 처리에 실패했습니다.");
    }
  }

  async function handleMarkAllAsRead() {
    if (!hasUnread || isLoading) {
      return;
    }

    setItems((current) => current.map((item) => ({ ...item, read: true })));

    try {
      await markAllMailboxItemsAsRead();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "우편 전체 읽음 처리에 실패했습니다.");
      void loadMailbox();
    }
  }

  function handleCancelDelete() {
    if (isDeletingItem) {
      return;
    }

    setDeleteTargetItemId(null);
  }

  async function handleConfirmDelete() {
    if (!deleteTargetItemId || isDeletingItem) {
      return;
    }

    const targetItemId = deleteTargetItemId;

    try {
      setIsDeletingItem(true);
      setError("");
      await deleteMailboxItem(targetItemId);
      setItems((current) => current.filter((item) => item.id !== targetItemId));
      setDeleteTargetItemId(null);

      if (selectedItemId === targetItemId) {
        setSelectedItemId(null);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "우편을 삭제하지 못했습니다.");
    } finally {
      setIsDeletingItem(false);
    }
  }

  return (
    <div className="mw-app flex min-h-screen flex-col select-none">
      <AppHeader />

      <main className="min-h-0 flex-1 overflow-auto px-16 py-8">
        <div className="mx-auto" style={{ width: `${stageWidth}px`, height: `${stageHeight}px` }}>
          <div
            className="flex w-[1460px] flex-col gap-5"
            style={{
              transform: `scale(${stageScale})`,
              transformOrigin: "top left",
            }}
          >
            <section className="flex h-[60px] items-end justify-between gap-5">
              <div>
                <h1 className="text-2xl font-normal text-[#5a4632]">도착한 우편</h1>
                <p className="mt-2 text-sm text-[#5a4632]/58">
                  완성된 광장 사진 {items.length}개, 읽지 않은 우편 {unreadCount}개
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void loadMailbox()}
                  disabled={isLoading}
                  className="mw-button inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
                  새로고침
                </button>

                <button
                  type="button"
                  onClick={() => void handleMarkAllAsRead()}
                  disabled={!hasUnread || isLoading}
                  className="mw-button inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
                >
                  <MailCheck size={15} />
                  모두 읽음
                </button>
              </div>
            </section>

            {error && (
              <div className="rounded-xl border border-[#a76c5d]/25 bg-[#a76c5d]/10 px-4 py-3 text-sm text-[#8a564a]">
                {error}
              </div>
            )}

            {isLoading ? (
              <section className="mw-surface grid min-h-[460px] place-items-center rounded-xl p-8 text-sm text-[#5a4632]/55">
                우편함을 불러오는 중입니다.
              </section>
            ) : items.length === 0 ? (
              <section className="mw-surface grid min-h-[460px] place-items-center rounded-xl p-8 text-center">
                <div>
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/65">
                    <Inbox size={20} />
                  </div>
                  <h2 className="text-lg font-normal text-[#5a4632]">아직 도착한 우편이 없어요.</h2>
                  <p className="mt-2 text-sm text-[#5a4632]/55">광장이 완성되면 생성된 이미지가 이곳으로 도착합니다.</p>
                </div>
              </section>
            ) : (
              <section className="grid grid-cols-3 gap-4">
                {items.map((item) => (
                  <MailboxCard key={item.id} item={item} onOpen={(nextItem) => void handleOpenItem(nextItem)} />
                ))}
              </section>
            )}
          </div>
        </div>
      </main>

      {selectedItem && (
        <MailboxDetailModal
          item={selectedItem}
          onClose={() => setSelectedItemId(null)}
          onRequestDelete={setDeleteTargetItemId}
          onGoToPlaza={(plazaId) => navigate(`/plaza/${plazaId}`)}
        />
      )}

      {deleteTargetItemId && (
        <MailboxDeleteConfirmModal
          isDeleting={isDeletingItem}
          onCancel={handleCancelDelete}
          onConfirm={() => void handleConfirmDelete()}
        />
      )}
    </div>
  );
}

export default MailboxPage;
