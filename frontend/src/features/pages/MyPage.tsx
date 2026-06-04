import { useEffect, useState } from "react";
import {
  Archive,
  ArrowRight,
  CalendarDays,
  LogOut,
  Mail,
  MapPinned,
  MessageSquareText,
  Pencil,
  UserRound,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppHeader } from "../../components/layout/AppHeader";
import { ROOM_OBJECT_BY_KEY } from "../../constants/roomObjects";
import { fetchUserCreatedPlazas, fetchUserPlazaEntries } from "../../services/plazaService";
import { fetchUserProfile, updateUserProfile } from "../../services/userService";
import type { Plaza, PlazaEntry } from "../../types/plaza";
import {
  clearAuthenticated,
  getCurrentUserId,
  normalizeProfileNickname,
  PROFILE_NICKNAME_MAX_LENGTH,
  setProfileEmail,
  setProfileNickname,
} from "../../utils/authSession";

type ArchiveRecord = {
  id: string;
  plaza: Plaza;
  entry: PlazaEntry;
};

type MyPageView = "createdPlazas" | "writtenObjects";

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "작성 시간 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatJoinedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "정보 없음";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getPlazaStatusLabel(plaza: Plaza) {
  return plaza.status === "closed" ? "종료됨" : "진행 중";
}

function getPlazaEntryCount(plaza: Plaza) {
  return plaza.entryCount ?? plaza.entries.length;
}

function MyPage() {
  const navigate = useNavigate();

  const [currentUserId] = useState(() => getCurrentUserId());
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [joinedAt, setJoinedAt] = useState("");
  const [nicknameDraft, setNicknameDraft] = useState(nickname);
  const [isEditingNickname, setIsEditingNickname] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isActivityLoading, setIsActivityLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [createdPlazas, setCreatedPlazas] = useState<Plaza[]>([]);
  const [archiveRecords, setArchiveRecords] = useState<ArchiveRecord[]>([]);
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<MyPageView>("writtenObjects");

  // 사용자가 아직 선택하지 않았을 때는 최신 기록을 기본 상세로 보여줍니다.
  const selectedRecord = archiveRecords.find((record) => record.id === selectedRecordId) ?? archiveRecords[0] ?? null;
  const selectedObject = selectedRecord ? ROOM_OBJECT_BY_KEY[selectedRecord.entry.objectKey] : null;

  useEffect(() => {
    let ignore = false;

    async function loadProfile() {
      try {
        setIsProfileLoading(true);
        setMessage("");

        const profile = await fetchUserProfile(currentUserId);

        if (ignore) {
          return;
        }

        setNickname(profile.nickname);
        setNicknameDraft(profile.nickname);
        setEmail(profile.email);
        setJoinedAt(profile.joinedAt);
        setProfileNickname(profile.nickname);
        setProfileEmail(profile.email);
      } catch (caughtError) {
        if (!ignore) {
          setMessage(caughtError instanceof Error ? caughtError.message : "프로필 정보를 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setIsProfileLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      ignore = true;
    };
  }, [currentUserId]);

  useEffect(() => {
    let ignore = false;

    async function loadActivities() {
      try {
        setIsActivityLoading(true);

        const [created, writtenEntries] = await Promise.all([
          fetchUserCreatedPlazas(currentUserId),
          fetchUserPlazaEntries(currentUserId),
        ]);

        if (ignore) {
          return;
        }

        setCreatedPlazas(created);
        setArchiveRecords(writtenEntries
          .map(({ plaza, entry }) => ({
            id: `${plaza.id}:${entry.id}`,
            plaza,
            entry,
          }))
          .sort((a, b) => Date.parse(b.entry.createdAt) - Date.parse(a.entry.createdAt)));
      } catch (caughtError) {
        if (!ignore) {
          setMessage(caughtError instanceof Error ? caughtError.message : "마이페이지 활동을 불러오지 못했습니다.");
        }
      } finally {
        if (!ignore) {
          setIsActivityLoading(false);
        }
      }
    }

    void loadActivities();

    return () => {
      ignore = true;
    };
  }, [currentUserId]);

  function handleStartEdit() {
    setNicknameDraft(nickname);
    setMessage("");
    setIsEditingNickname(true);
  }

  function handleCancelEdit() {
    setNicknameDraft(nickname);
    setMessage("");
    setIsEditingNickname(false);
  }

  // 저장 버튼과 Enter 키가 같은 검증/저장 흐름을 사용하도록 하나의 함수로 묶었습니다.
  async function handleSaveNickname() {
    const nextNickname = normalizeProfileNickname(nicknameDraft);

    try {
      setIsSavingProfile(true);
      setMessage("");

      const profile = await updateUserProfile(currentUserId, { nickname: nextNickname });

      setNickname(profile.nickname);
      setNicknameDraft(profile.nickname);
      setEmail(profile.email);
      setJoinedAt(profile.joinedAt);
      setProfileNickname(profile.nickname);
      setProfileEmail(profile.email);
      setIsEditingNickname(false);
      setMessage("닉네임이 변경되었습니다.");
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "프로필 정보를 수정하지 못했습니다.");
    } finally {
      setIsSavingProfile(false);
    }
  }

  // 헤더 로그아웃 버튼과 동일하게 인증 플래그를 지우고 랜딩 페이지로 이동합니다.
  function handleLogout() {
    clearAuthenticated();
    navigate("/", { replace: true });
  }

  return (
    <div className="mw-app min-h-screen flex flex-col select-none">
      <AppHeader />

      <main className="min-h-0 flex-1 overflow-auto px-16 py-8">
        <div className="mx-auto flex w-[1460px] flex-col gap-5">
          {/* 프로필과 활동 요약을 한눈에 보는 마이페이지 상단 영역입니다. */}
          <section className="mw-surface rounded-xl p-6">
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
                {isEditingNickname ? (
                  <div className="flex items-center gap-2">
                    <input
                      className="nickname-input h-10 px-3 text-sm"
                      value={nicknameDraft}
                      maxLength={PROFILE_NICKNAME_MAX_LENGTH}
                      onChange={(event) => setNicknameDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          void handleSaveNickname();
                        }

                        if (event.key === "Escape") {
                          handleCancelEdit();
                        }
                      }}
                      autoFocus
                      disabled={isSavingProfile}
                    />
                    <button
                      type="button"
                      className="mw-button-solid inline-flex items-center rounded-md px-4 py-2 text-sm disabled:opacity-50"
                      onClick={() => void handleSaveNickname()}
                      disabled={isSavingProfile}
                    >
                      {isSavingProfile ? "저장 중" : "저장"}
                    </button>
                    <button
                      type="button"
                      className="mw-button inline-flex items-center rounded-md px-4 py-2 text-sm disabled:opacity-50"
                      onClick={handleCancelEdit}
                      disabled={isSavingProfile}
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="mw-button-solid inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
                      onClick={handleStartEdit}
                      disabled={isProfileLoading}
                    >
                      <Pencil size={14} />
                      정보수정
                    </button>
                    <button
                      type="button"
                      className="mw-button inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm"
                      onClick={handleLogout}
                    >
                      <LogOut size={14} />
                      로그아웃
                    </button>
                  </div>
                )}
                {message && <p className="text-sm text-[#5a4632]/55">{message}</p>}
              </div>
            </div>

          </section>

          {/* 별도 보관함 페이지 대신 마이페이지의 주 콘텐츠로 통합된 기록 영역입니다. */}
          <section className="flex min-h-[620px] flex-col gap-4">
            <div className="flex items-center justify-between gap-5 border-b border-[#5a4632]/12">
              <div className="flex items-end gap-6">
                <button
                  type="button"
                  onClick={() => setActiveView("createdPlazas")}
                  className={`border-b-2 px-1 pb-3 text-sm transition ${activeView === "createdPlazas"
                    ? "border-[#9b6b54] text-[#5a4632]"
                    : "border-transparent text-[#5a4632]/45 hover:text-[#5a4632]/70"
                    }`}
                >
                  내가 만든 광장
                </button>
                <button
                  type="button"
                  onClick={() => setActiveView("writtenObjects")}
                  className={`border-b-2 px-1 pb-3 text-sm transition ${activeView === "writtenObjects"
                    ? "border-[#9b6b54] text-[#5a4632]"
                    : "border-transparent text-[#5a4632]/45 hover:text-[#5a4632]/70"
                    }`}
                >
                  내가 작성한 오브젝트
                </button>
              </div>
            </div>

            {activeView === "createdPlazas" ? (
              isActivityLoading ? (
                <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center text-sm text-[#5a4632]/55">
                  마이페이지 활동을 불러오는 중입니다.
                </section>
              ) : createdPlazas.length === 0 ? (
                <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center">
                  <div>
                    <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/65">
                      <MapPinned size={20} />
                    </div>
                    <h3 className="text-lg font-normal text-[#5a4632]">아직 만든 광장이 없어요.</h3>
                    <p className="mt-2 text-sm text-[#5a4632]/55">새 광장을 만들면 이곳에서 확인할 수 있습니다.</p>
                    <button
                      type="button"
                      onClick={() => navigate("/plaza")}
                      className="mt-4 text-sm text-[#9b6b54] underline-offset-4 hover:underline"
                    >
                      광장 만들러가기 →
                    </button>
                  </div>
                </section>
              ) : (
                <section className="mw-surface flex h-[620px] min-h-0 flex-col rounded-xl p-5">
                  <div className="mb-4 flex items-center justify-between border-b border-[#5a4632]/12 px-1 pb-4 text-sm text-[#5a4632]">
                    <span>내가 만든 광장</span>
                    <span className="text-xs text-[#5a4632]/45">{createdPlazas.length}</span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                    {createdPlazas.map((plaza) => {
                      const description = plaza.description.trim();

                      return (
                        <article
                          key={plaza.id}
                          className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-transparent bg-white/20 p-4 transition hover:border-[#5a4632]/12 hover:bg-white/35"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-3">
                              <h3 className="truncate text-base font-normal text-[#5a4632]">{plaza.topic}</h3>
                              <span className="shrink-0 text-[11px] text-[#5a4632]/38">
                                {formatCreatedAt(plaza.createdAt)}
                              </span>
                            </div>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5a4632]/52">
                              <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                                {getPlazaStatusLabel(plaza)}
                              </span>
                              <span className="rounded-full border border-[#5a4632]/12 bg-white/30 px-2 py-1">
                                {getPlazaEntryCount(plaza)}/{plaza.maxParticipants}명
                              </span>
                              {description && <span className="min-w-0 truncate">{description}</span>}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/plaza/${plaza.id}`)}
                            className="mw-button inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs"
                          >
                            이동
                            <ArrowRight size={14} />
                          </button>
                        </article>
                      );
                    })}
                  </div>
                </section>
              )
            ) : isActivityLoading ? (
              <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center text-sm text-[#5a4632]/55">
                마이페이지 활동을 불러오는 중입니다.
              </section>
            ) : archiveRecords.length === 0 ? (
              <section className="mw-surface grid flex-1 place-items-center rounded-xl p-8 text-center">
                <div>
                  <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/65">
                    <MessageSquareText size={20} />
                  </div>
                  <h3 className="text-lg font-normal text-[#5a4632]">아직 보관된 광장 글이 없어요.</h3>
                  <p className="mt-2 text-sm text-[#5a4632]/55">광장에서 글을 작성하면 마이페이지에 남습니다.</p>
                </div>
              </section>
            ) : (
              <section className="grid h-[620px] min-h-0 grid-cols-[430px_1fr] gap-5">
                {/* 왼쪽 목록에서 기록을 고르면 오른쪽 상세 패널이 갱신됩니다. */}
                <aside className="mw-surface flex min-h-0 flex-col rounded-xl p-4">
                  <div className="mb-4 flex items-center justify-between px-1 text-sm text-[#5a4632]">
                    <span>기록 목록</span>
                    <span className="text-xs text-[#5a4632]/45">{archiveRecords.length}</span>
                  </div>

                  <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
                    {archiveRecords.map((record) => {
                      const active = record.id === selectedRecord?.id;
                      const object = ROOM_OBJECT_BY_KEY[record.entry.objectKey];

                      return (
                        <button
                          key={record.id}
                          type="button"
                          onClick={() => setSelectedRecordId(record.id)}
                          className={`grid grid-cols-[44px_1fr] gap-3 rounded-lg border p-3 text-left transition ${active
                            ? "border-[#9b6b54]/45 bg-[#9b6b54]/10"
                            : "border-transparent bg-white/20 hover:border-[#5a4632]/12 hover:bg-white/35"
                            }`}
                        >
                          <span className="grid h-11 w-11 place-items-center rounded-lg border border-[#5a4632]/10 bg-white/35 text-[#5a4632]/45">
                            {object ? (
                              <img src={object.image} alt="" className="h-8 w-8 object-contain" />
                            ) : (
                              <Archive size={18} />
                            )}
                          </span>

                          <span className="min-w-0">
                            <span className="mb-1 flex items-center justify-between gap-3">
                              <span className="truncate text-xs text-[#5a4632]/45">{record.plaza.topic}</span>
                              <span className="shrink-0 text-[11px] text-[#5a4632]/38">
                                {formatCreatedAt(record.entry.createdAt)}
                              </span>
                            </span>
                            <strong className="block truncate text-sm font-normal text-[#5a4632]">
                              {record.entry.title || "어느 나그네의 발자취"}
                            </strong>
                            <span className="mt-1 block truncate text-xs text-[#5a4632]/52">
                              {record.entry.content}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </aside>

                {/* 선택한 광장 글의 상세 내용과 함께 배치한 오브젝트를 보여줍니다. */}
                <article className="mw-surface min-h-0 rounded-xl p-7">
                  {selectedRecord ? (
                    <div className="flex h-full flex-col">
                      <div className="mb-6 flex items-start justify-between gap-5 border-b border-[#5a4632]/15 pb-6">
                        <div className="min-w-0">
                          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#5a4632]/48">
                            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5a4632]/12 bg-white/30 px-2.5 py-1">
                              <MapPinned size={13} />
                              {getPlazaStatusLabel(selectedRecord.plaza)}
                            </span>
                          </div>
                          <h3 className="truncate text-2xl font-normal text-[#5a4632]">
                            {selectedRecord.plaza.topic}
                          </h3>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#5a4632]/58">
                            {selectedRecord.plaza.description}
                          </p>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <div className="flex items-center gap-2 rounded-full border border-[#5a4632]/15 bg-white/35 px-3 py-1.5 text-xs text-[#5a4632]/58">
                            <CalendarDays size={14} />
                            {formatCreatedAt(selectedRecord.entry.createdAt)}
                          </div>
                          <button
                            type="button"
                            onClick={() => navigate(`/plaza/${selectedRecord.plaza.id}`)}
                            className="inline-flex items-center gap-1.5 text-xs text-[#9b6b54] underline-offset-4 hover:underline"
                          >
                            해당 광장으로 이동 →
                          </button>
                        </div>
                      </div>

                      <div className="grid min-h-0 flex-1 grid-cols-[1fr_220px] gap-6">
                        <section className="min-h-0">
                          <p className="mb-3 text-xs text-[#5a4632]/45">내가 쓴 글</p>
                          <h4 className="text-2xl font-normal text-[#5a4632]">
                            {selectedRecord.entry.title || "어느 나그네의 이야기"}
                          </h4>
                          <p className="mt-5 max-h-[420px] overflow-y-auto whitespace-pre-wrap text-sm leading-8 text-[#5a4632]/70">
                            {selectedRecord.entry.content}
                          </p>
                        </section>

                        <aside className="rounded-lg border border-[#5a4632]/12 bg-white/25 p-5">
                          <p className="mb-4 text-xs text-[#5a4632]/45">내 오브젝트</p>
                          <div className="grid place-items-center rounded-lg border border-[#5a4632]/10 bg-white/30 px-4 py-7 text-[#5a4632]/45">
                            {selectedObject ? (
                              <img src={selectedObject.image} alt="" className="h-24 w-24 object-contain" />
                            ) : (
                              <Archive size={32} />
                            )}
                          </div>
                          <p className="mt-4 truncate text-sm text-[#5a4632]">{selectedObject?.label ?? "알 수 없는 오브젝트"}</p>
                          <p className="mt-1 text-xs text-[#5a4632]/45">이 글과 함께 광장에 놓인 오브젝트</p>
                        </aside>
                      </div>
                    </div>
                  ) : (
                    <div className="grid h-full place-items-center text-center">
                      <div>
                        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#5a4632]/65">
                          <Archive size={20} />
                        </div>
                        <h3 className="text-lg font-normal text-[#5a4632]">기록을 선택해주세요.</h3>
                        <p className="mt-2 text-sm text-[#5a4632]/55">선택한 광장 글의 자세한 내용이 이곳에 표시됩니다.</p>
                      </div>
                    </div>
                  )}
                </article>
              </section>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default MyPage;
