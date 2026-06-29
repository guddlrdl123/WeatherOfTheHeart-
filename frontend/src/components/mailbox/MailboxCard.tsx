import { CalendarDays, ImageIcon, Mail, MailOpen, ShieldAlert } from "lucide-react";
import type { MailboxItem } from "../../types/mailbox";
import { trimTrailingDatePeriod } from "../../utils/date";

type Props = {
  item: MailboxItem;
  onOpen: (item: MailboxItem) => void;
};

function formatCompletedAt(value: string) {
  // 백엔드가 내려준 완료 시각 문자열을 카드용 짧은 날짜로 표시합니다.
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return trimTrailingDatePeriod(new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date));
}

export function MailboxCard({ item, onOpen }: Props) {
  // 읽음 여부에 따라 봉투 아이콘과 카드 톤을 다르게 보여줍니다.
  const MailIcon = item.read ? MailOpen : Mail;
  const isWarning = item.category === "WARNING";

  return (
    <button
      type="button"
      onClick={() => onOpen(item)}
      className={`mw-surface flex h-[300px] flex-col overflow-hidden rounded-xl text-left transition hover:-translate-y-0.5 hover:shadow-[0_16px_32px_rgba(90,70,50,0.1)] ${item.read ? "opacity-[0.82]" : "border-[#9b6b54]/42 bg-[#fffbf6]"
        }`}
    >
      <div className={`relative h-40 border-b border-[#5a4632]/10 ${isWarning ? "bg-[#a75e55]/[0.07]" : "bg-white/25"}`}>
        {/* generatedImageData는 백엔드가 만든 완성 광장 이미지를 그대로 img src에 연결합니다. */}
        {isWarning ? (
          <div className="grid h-full place-items-center text-[#a75e55]/70">
            <div className="text-center">
              <ShieldAlert size={34} className="mx-auto" />
              <p className="mt-3 text-xs">운영팀 경고 안내</p>
            </div>
          </div>
        ) : item.generatedImageData ? (
          <img
            src={item.generatedImageData}
            alt={`${item.plazaTitle} 완성 이미지`}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="grid h-full place-items-center text-[#5a4632]/38">
            <ImageIcon size={26} />
          </div>
        )}

        {!item.read && (
          <span className="absolute right-3 top-3 rounded-full border border-white/80 bg-[#9b6b54]/35 px-2 py-1 text-[11px] text-white/80">
            새 우편
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[#5a4632]/48">
          <span className="inline-flex min-w-0 items-center gap-1.5">
            <MailIcon size={14} className="shrink-0" />
            <span className="truncate">{item.plazaTitle}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5">
            <CalendarDays size={13} />
            {formatCompletedAt(item.completedAt)}
          </span>
        </div>

        <h2 className="line-clamp-2 text-base font-normal leading-6 text-[#5a4632]">{item.title}</h2>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-[#5a4632]/60">{item.message}</p>
      </div>
    </button>
  );
}
