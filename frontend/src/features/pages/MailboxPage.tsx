import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowRight, ImageIcon, Inbox, RefreshCw, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MailboxCard } from "../../components/mailbox/MailboxCard";
import { AppHeader } from "../../components/layout/AppHeader";
import { fetchMailbox, markMailboxItemAsRead } from "../../services/mailboxService";
import type { MailboxItem } from "../../types/mailbox";
import { getCurrentUserId } from "../../utils/authSession";

function formatCompletedAt(value: string) {
  // 상세 모달에서는 완료 시각을 조금 더 읽기 좋은 긴 날짜로 보여줍니다.
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm select-none">
      <section className="mw-surface grid max-h-[92vh] w-full max-w-[980px] grid-cols-[1.2fr_0.8fr] overflow-hidden rounded-xl bg-[#fffbf6f2] shadow-xl">
        <div className="min-h-[520px] bg-[#5a4632]/[0.07]">
          {/* 우편의 핵심 데이터인 generatedImageData를 크게 보여주는 영역입니다. */}
          {item.generatedImageData ? (
            <img
              src={item.generatedImageData}
              alt={`${item.plazaTitle} 완성 이미지`}
              className="h-full max-h-[92vh] w-full object-contain"
            />
          ) : (
            <div className="grid h-full place-items-center text-[#5a4632]/35">
              <ImageIcon size={42} />
            </div>
          )}
        </div>

        <div className="flex min-h-0 flex-col p-6">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-[#5a4632]/45">완성된 광장 우편</p>
              <h2 className="mt-2 text-xl font-normal leading-8 text-[#5a4632]">{item.title}</h2>
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

          <div className="mb-5 flex flex-wrap gap-2 text-xs text-[#5a4632]/58">
            <span className="rounded-full border border-[#5a4632]/12 bg-white/35 px-3 py-1.5">
              {item.plazaTitle}
            </span>
            <span className="rounded-full border border-[#5a4632]/12 bg-white/35 px-3 py-1.5">
              {formatCompletedAt(item.completedAt)}
            </span>
            <span className="rounded-full border border-[#5a4632]/12 bg-white/35 px-3 py-1.5">
              {item.read ? "읽음" : "안읽음"}
            </span>
          </div>

          <p className="min-h-0 flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-[#5a4632]/12 bg-white/30 p-4 text-sm leading-7 text-[#5a4632]/68">
            {item.message}
          </p>

          <button
            type="button"
            onClick={() => onGoToPlaza(item.plazaId)}
            className="mw-button mt-5 inline-flex items-center justify-center gap-2 rounded-md px-4 py-3 text-sm"
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

  return (
    <div className="mw-app flex min-h-screen flex-col select-none">
      <AppHeader />

      <main className="min-h-0 flex-1 overflow-auto px-16 py-8">
        <div className="mx-auto flex w-[1460px] flex-col gap-5">
          <section className="flex items-end justify-between gap-5">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#5a4632]/15 bg-white/30 px-3 py-1.5 text-xs text-[#5a4632]/60">
                <Inbox size={14} />
                우편함
              </div>
              <h1 className="text-2xl font-normal text-[#5a4632]">도착한 우편</h1>
              <p className="mt-2 text-sm text-[#5a4632]/58">
                완성된 광장 사진 {items.length}개, 읽지 않은 우편 {unreadCount}개
              </p>
            </div>

            <button
              type="button"
              onClick={() => void loadMailbox()}
              disabled={isLoading}
              className="mw-button inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm disabled:opacity-50"
            >
              <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
              새로고침
            </button>
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
