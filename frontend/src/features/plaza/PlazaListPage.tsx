import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Plus, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Plaza } from "../../types/plaza";
import { PlazaCreateModal } from "./PlazaCreateModal";
import {
  DAILY_PLAZA_CREATE_LIMIT,
  PLAZA_PAGE_SIZE,
  canEnterPlaza,
  canCreatePlazaToday,
  canViewPlaza,
  getBackgroundIcon,
  getBackgroundLabel,
  getPlazaDescription,
  getPlazaStatusLabel,
  isPlazaFull,
} from "./plazaHelpers";

type Props = {
  plazas: Plaza[];
  currentGuestId: string;
  onCreate: (plaza: Plaza) => void;
};

type CreateLimitNoticeModalProps = {
  onClose: () => void;
};

function CreateLimitNoticeModal({ onClose }: CreateLimitNoticeModalProps) {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/30 px-4 py-8 backdrop-blur-[2px]">
      <div className="w-full max-w-[380px] max-h-[calc(100vh-64px)] overflow-y-auto rounded-xl border border-[#b65f55]/20 bg-[#fffbf6f2] p-5 text-[#5a4632] shadow-xl">
        <h3 className="text-base font-semibold">광장 생성 제한</h3>
        <p className="mt-2 text-sm leading-7 text-[#5a4632]/68">
          하루에 최대 {DAILY_PLAZA_CREATE_LIMIT}개만 작성 가능해요. 생성하고 싶다면 오늘 만든 광장을 삭제하고 생성해주세요.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="mw-button-solid rounded-md px-4 py-2 text-sm"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}

export function PlazaListPage({ plazas, currentGuestId, onCreate }: Props) {
  const navigate = useNavigate();
  const [searchText, setSearchText] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateLimitNoticeOpen, setIsCreateLimitNoticeOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const canCreatePlaza = canCreatePlazaToday(plazas, currentGuestId);

  const visiblePlazas = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();

    return plazas.filter((plaza) => {
      if (!plaza.allowSearch) {
        return false;
      }

      if (!keyword) {
        return true;
      }

      return `${plaza.topic} ${getPlazaDescription(plaza)}`.toLowerCase().includes(keyword);
    });
  }, [plazas, searchText]);

  const totalPages = Math.max(1, Math.ceil(visiblePlazas.length / PLAZA_PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const currentPagePlazas = visiblePlazas.slice(
    (safeCurrentPage - 1) * PLAZA_PAGE_SIZE,
    safeCurrentPage * PLAZA_PAGE_SIZE,
  );

  function enterByInviteCode() {
    const targetCode = inviteCode.trim().toUpperCase();

    if (!targetCode) {
      setInviteError("초대 코드를 입력해주세요.");
      return;
    }

    if (targetCode.length !== 7) {
      setInviteError("초대 코드는 7자리입니다.");
      return;
    }

    const targetPlaza = plazas.find((plaza) => plaza.inviteCode === targetCode);

    if (targetPlaza) {
      setInviteError("");
      navigate(`/plaza/${targetPlaza.id}`);
      return;
    }

    setInviteError("일치하는 초대 코드가 없습니다.");
  }

  function handleCreateClick() {
    if (!canCreatePlaza) {
      setIsCreateLimitNoticeOpen(true);
      return;
    }

    setIsCreateOpen(true);
  }

  return (
    <main className="min-h-0 flex-1 overflow-auto px-16 py-8">
      <div className="mx-auto flex w-[1460px] flex-col gap-4">
        <section className="flex flex-col gap-4">
          <div className="mw-surface flex items-center gap-3 rounded-xl px-4 py-3">
            <Search size={17} className="text-[#5a4632]/55" />
            <input
              className="min-w-0 flex-1 bg-transparent text-sm text-[#5a4632] outline-none placeholder:text-[#5a4632]/35"
              value={searchText}
              placeholder="광장 검색"
              onChange={(event) => {
                setSearchText(event.target.value);
                setCurrentPage(1);
              }}
            />
            <span className="min-w-[150px] text-right text-xs text-[#b65f55]">
              {inviteError}
            </span>
            <div className="flex items-center gap-2 border-l border-[#5a4632]/15 pl-3">
              <input
                className="h-9 w-[118px] rounded-md border border-[#5a4632]/15 bg-white/35 px-3 text-xs uppercase text-[#5a4632] outline-none"
                value={inviteCode}
                maxLength={7}
                placeholder="초대 코드"
                aria-invalid={Boolean(inviteError)}
                onChange={(event) => {
                  setInviteCode(event.target.value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase());
                  setInviteError("");
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    enterByInviteCode();
                  }
                }}
              />
              <button
                type="button"
                onClick={enterByInviteCode}
                className="mw-button rounded-md px-3 py-2 text-xs"
              >
                입장
              </button>
            </div>
            <button
              type="button"
              onClick={handleCreateClick}
              className="mw-button-solid inline-flex h-9 items-center gap-2 rounded-md px-3 text-xs"
            >
              <Plus size={14} />
              새 광장 만들기
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {currentPagePlazas.map((plaza) => {
              const enterable = canEnterPlaza(plaza);
              const viewable = canViewPlaza(plaza);
              const full = isPlazaFull(plaza);
              const description = getPlazaDescription(plaza);
              const participantRatio = plaza.maxParticipants > 0
                ? Math.min((plaza.entries.length / plaza.maxParticipants) * 100, 100)
                : 0;
              const gaugeClosed = full || plaza.status === "closed";
              const statusToneClass = enterable
                ? "border-[#6f8f62]/30 bg-[#6f8f62]/10 text-[#526f49]"
                : full
                  ? "border-[#9b6b54]/30 bg-[#9b6b54]/10 text-[#7a5242]"
                  : "border-[#a76c5d]/30 bg-[#a76c5d]/10 text-[#8a564a]";
              const actionLabel = enterable ? "입장하기" : "구경하기";

              return (
                <article key={plaza.id} className="mw-surface flex min-h-[242px] flex-col rounded-xl p-5 shadow-[0_14px_28px_rgba(90,70,50,0.08)]">
                  <div className="mb-5 flex items-center justify-between gap-3">
                    <span className="inline-flex max-w-[58%] items-center gap-1.5 rounded-full border border-[#5a4632]/15 bg-white/35 px-3 py-1 text-xs text-[#5a4632]/72">
                      {plaza.background.type === "color" ? (
                        <span
                          className="h-3 w-3 shrink-0 rounded-full border border-[#5a4632]/20"
                          style={{ backgroundColor: plaza.background.color }}
                        />
                      ) : (
                        <span aria-hidden="true">{getBackgroundIcon(plaza.background)}</span>
                      )}
                      <span className="truncate">{getBackgroundLabel(plaza.background)}</span>
                    </span>

                    <span className={`shrink-0 rounded-full border px-3 py-1 text-xs ${statusToneClass}`}>
                      {getPlazaStatusLabel(plaza)}
                    </span>
                  </div>

                  <div className="min-h-[74px]">
                    <h2 className="truncate text-lg font-normal text-[#5a4632]">{plaza.topic}</h2>
                    {description && (
                      <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#5a4632]/62">{description}</p>
                    )}
                  </div>

                  {/* 광장 참여 인원을 한눈에 볼 수 있는 진행 게이지입니다. */}
                  <div
                    className={`mt-5 h-2 overflow-hidden rounded-full ${gaugeClosed ? "bg-[#b65f55]/16" : "bg-[#5a4632]/10"}`}
                    aria-label={`참여 인원 ${plaza.entries.length}/${plaza.maxParticipants}`}
                  >
                    <div
                      className={`h-full rounded-full transition-[width,background-color] duration-300 ${gaugeClosed ? "bg-[#e97062]" : "bg-[#6eb950]"}`}
                      style={{ width: `${participantRatio}%` }}
                    />
                  </div>

                  <div className="mt-4 flex items-end justify-between gap-4">
                    <div className="flex min-w-0 flex-col gap-2 text-sm text-[#5a4632]/72">
                      <span>{plaza.entries.length} / {plaza.maxParticipants}명</span>
                    </div>

                    <button
                      type="button"
                      disabled={!viewable}
                      onClick={() => navigate(`/plaza/${plaza.id}`)}
                      className="inline-flex shrink-0 items-center gap-2 rounded-md border border-[#9b6b54]/45 bg-[#9b6b54]/10 px-4 py-2 text-sm text-[#9b6b54] transition hover:bg-[#9b6b54]/16 disabled:opacity-45"
                    >
                      {actionLabel}
                      <ArrowRight size={15} />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>

          {visiblePlazas.length === 0 && (
            <div className="mw-surface grid min-h-[260px] place-items-center rounded-xl text-sm text-[#5a4632]/55">
              표시할 광장이 없습니다.
            </div>
          )}

          {visiblePlazas.length > PLAZA_PAGE_SIZE && (
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                disabled={safeCurrentPage === 1}
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/70 transition hover:bg-white/60 disabled:opacity-35"
                aria-label="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="min-w-[72px] text-center text-xs text-[#5a4632]/60">
                {safeCurrentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={safeCurrentPage === totalPages}
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/70 transition hover:bg-white/60 disabled:opacity-35"
                aria-label="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </section>
      </div>

      {isCreateLimitNoticeOpen && (
        <CreateLimitNoticeModal onClose={() => setIsCreateLimitNoticeOpen(false)} />
      )}

      {isCreateOpen && (
        <PlazaCreateModal
          onCreate={onCreate}
          onClose={() => setIsCreateOpen(false)}
        />
      )}
    </main>
  );
}
