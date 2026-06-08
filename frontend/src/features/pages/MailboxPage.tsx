import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, CalendarDays, ImageIcon, Inbox, MailCheck, MapPinned, RefreshCw, Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MailboxCard } from "../../components/mailbox/MailboxCard";
import { AppHeader } from "../../components/layout/AppHeader";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { useResponsiveStageWidth } from "../../hooks/useResponsiveStageWidth";
import { fetchMailbox, markAllMailboxItemsAsRead, markMailboxItemAsRead } from "../../services/mailboxService";
import type { MailboxItem } from "../../types/mailbox";
import { getCurrentUserId } from "../../utils/authSession";

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

function MailboxDetailModal({
  item,
  onClose,
  onGoToPlaza,
}: {
  item: MailboxItem;
  onClose: () => void;
  onGoToPlaza: (plazaId: string) => void;
}) {
  const myObject = item.myObjectKey ? ROOM_OBJECT_BY_KEY[item.myObjectKey] : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 py-8 backdrop-blur-sm select-none">
      <section className="mw-surface grid max-h-[calc(100vh-64px)] w-full max-w-[980px] grid-cols-1 overflow-y-auto rounded-xl bg-[#fffbf6f2] shadow-xl lg:grid-cols-[minmax(0,640px)_340px] lg:overflow-hidden">
        <div className="aspect-square w-full bg-[#5a4632]/[0.07]">
          {/* 우편의 핵심 데이터인 generatedImageData를 크게 보여주는 영역입니다. */}
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

        <div className="flex min-h-0 flex-col p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs tracking-[0.18em] text-[#5a4632]/40">MAILBOX</p>
              <h2 className="mt-3 text-2xl font-normal leading-9 text-[#5a4632]">{item.title}</h2>
            </div>

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

          <div className="mt-6 flex flex-col gap-3 text-sm text-[#5a4632]/65">
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
                    <p className="truncate text-base text-[#5a4632]">{myObject.label}</p>
                    {item.myObjectTitle && (
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-[#5a4632]/52">{item.myObjectTitle}</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[#5a4632]/48">작성한 오브젝트 기록이 없어요.</p>
              )}
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-[#5a4632]/12 bg-white/30 px-4 py-3">
              <Users size={16} className="shrink-0 text-[#9b6b54]" />
              <span>총 {item.participantCount}명이 오브젝트를 남겼어요.</span>
            </div>
          </div>

          <div className="min-h-6 flex-1" />

          <button
            type="button"
            onClick={() => onGoToPlaza(item.plazaId)}
            className="mw-button mt-6 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm"
          >
            연결된 광장 보기
            <ArrowRight size={15} />
          </button>
        </div>
      </section>
    </div>
  );
}

function MailboxPage() {
  const navigate = useNavigate();
  const [userId] = useState(() => getCurrentUserId());
  const [items, setItems] = useState<MailboxItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
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
    // 명세의 GET /api/users/{userId}/mailbox 응답을 화면 상태로 가져옵니다.
    try {
      setIsLoading(true);
      setError("");
      const nextItems = await fetchMailbox(userId);
      setItems(nextItems);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "우편함을 불러오지 못했습니다.");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

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
      await markMailboxItemAsRead(userId, item.id);
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
      await markAllMailboxItemsAsRead(userId);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "우편 전체 읽음 처리에 실패했습니다.");
      void loadMailbox();
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
          onGoToPlaza={(plazaId) => navigate(`/plaza/${plazaId}`)}
        />
      )}
    </div>
  );
}

export default MailboxPage;
