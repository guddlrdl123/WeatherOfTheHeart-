import { Mail, UserRound } from "lucide-react";
import { trimTrailingDatePeriod } from "../../../utils/date";

type MyPageProfileSummaryProps = {
  nickname: string;
  email: string;
  joinedAt: string;
  isProfileLoading: boolean;
  isSavingProfile: boolean;
  onEditProfile: () => void;
  onLogout: () => void;
};

function formatJoinedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "정보 없음";
  }

  return trimTrailingDatePeriod(new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date));
}

export function MyPageProfileSummary({
  nickname,
  email,
  joinedAt,
  isProfileLoading,
  isSavingProfile,
  onEditProfile,
  onLogout,
}: MyPageProfileSummaryProps) {
  return (
    <section className="mw-surface h-[132px] rounded-xl p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="flex min-w-0 items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/68">
            <UserRound size={24} />
          </div>
          <div className="min-w-0">
            <p className="text-xs tracking-[0.18em] text-[#5a4632]/38">MY PAGE</p>
            <h1 className="mt-2 truncate text-2xl font-normal text-[#5a4632]">
              {isProfileLoading ? "프로필을 불러오는 중" : `${nickname || "나그네"}님의 마음 기록`}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-[#5a4632]/58">
              <span className="inline-flex items-center gap-1.5">
                <Mail size={14} />
                {email || "이메일 정보 없음"}
              </span>
              <span className="h-3 w-px bg-[#5a4632]/18" />
              <span>가입일 {joinedAt ? formatJoinedAt(joinedAt) : "정보 없음"}</span>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="mw-button-solid inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm disabled:opacity-50"
              onClick={onEditProfile}
              disabled={isProfileLoading || isSavingProfile}
            >
              정보수정
            </button>
            <button
              type="button"
              className="mw-button inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
              onClick={onLogout}
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
