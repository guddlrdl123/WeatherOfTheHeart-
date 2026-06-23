import { Archive, ArrowRight, CalendarDays, MapPinned, MessageSquareText } from "lucide-react";
import { ROOM_OBJECT_BY_KEY } from "../../../constants/roomObjects";
import type { Plaza } from "../../../types/plaza";
import { trimTrailingDatePeriod } from "../../../utils/date";
import type { ArchiveRecord, MyPageView } from "../types";

type MyPageActivitySectionProps = {
  activeView: MyPageView;
  archiveRecords: ArchiveRecord[];
  createdPlazas: Plaza[];
  isActivityLoading: boolean;
  selectedRecordId: string | null;
  onChangeView: (view: MyPageView) => void;
  onSelectRecord: (recordId: string) => void;
  onCreatePlaza: () => void;
  onOpenPlaza: (plazaId: string | number) => void;
};

function formatCreatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "작성 시간 없음";
  }

  return trimTrailingDatePeriod(new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date));
}

function getPlazaStatusLabel(plaza: Plaza) {
  return plaza.status === "closed" ? "종료됨" : "진행 중";
}

function getPlazaEntryCount(plaza: Plaza) {
  return plaza.entryCount ?? plaza.entries.length;
}

export function MyPageActivitySection({
  activeView,
  archiveRecords,
  createdPlazas,
  isActivityLoading,
  selectedRecordId,
  onChangeView,
  onSelectRecord,
  onCreatePlaza,
  onOpenPlaza,
}: MyPageActivitySectionProps) {
  const selectedRecord = archiveRecords.find((record) => record.id === selectedRecordId) ?? archiveRecords[0] ?? null;
  const selectedObject = selectedRecord ? ROOM_OBJECT_BY_KEY[selectedRecord.entry.objectKey] : null;

  return (
    <section className="flex h-[672px] flex-col gap-4">
      <div className="flex items-center justify-between gap-5 border-b border-[#5a4632]/12">
        <div className="flex items-end gap-6">
          <button
            type="button"
            onClick={() => onChangeView("createdPlazas")}
            className={`border-b-2 px-1 pb-3 text-sm transition ${activeView === "createdPlazas"
              ? "border-[#9b6b54] text-[#5a4632]"
              : "border-transparent text-[#5a4632]/45 hover:text-[#5a4632]/70"
              }`}
          >
            내가 만든 광장
          </button>
          <button
            type="button"
            onClick={() => onChangeView("writtenObjects")}
            className={`border-b-2 px-1 pb-3 text-sm transition ${activeView === "writtenObjects"
              ? "border-[#9b6b54] text-[#5a4632]"
              : "border-transparent text-[#5a4632]/45 hover:text-[#5a4632]/70"
              }`}
          >
            내가 남긴 발자취
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
                onClick={onCreatePlaza}
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
              <span className="text-sm text-[#5a4632]/45">{createdPlazas.length}</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {createdPlazas.map((plaza) => {
                const description = plaza.description.trim();

                return (
                  <article
                    key={plaza.id}
                    className="grid grid-cols-[1fr_auto] items-center gap-4 rounded-lg border border-transparent bg-white/20 p-4 transition hover:border-[#5a4632]/12 hover:bg-white/50"
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
                      onClick={() => onOpenPlaza(plaza.id)}
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
            <h3 className="text-lg font-normal text-[#5a4632]">아직 보관된 발자취가 없어요.</h3>
            <p className="mt-2 text-sm text-[#5a4632]/55">광장에서 발자취를 남기면 마이페이지에 남습니다.</p>
          </div>
        </section>
      ) : (
        <section className="grid h-[620px] min-h-0 grid-cols-[430px_1fr] gap-5">
          <aside className="mw-surface flex min-h-0 flex-col rounded-xl p-4">
            <div className="mb-4 flex items-center justify-between px-1 text-sm text-[#5a4632]">
              <span>기록 목록</span>
              <span className="text-sm text-[#5a4632]/45">{archiveRecords.length}</span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-1">
              {archiveRecords.map((record) => {
                const active = record.id === selectedRecord?.id;
                const object = ROOM_OBJECT_BY_KEY[record.entry.objectKey];

                return (
                  <button
                    key={record.id}
                    type="button"
                    onClick={() => onSelectRecord(record.id)}
                    className={`grid grid-cols-[44px_1fr] gap-3 rounded-lg border p-3 text-left transition ${active
                      ? "border-[#9b6b54]/45 bg-[#9b6b54]/10"
                      : "border-transparent bg-white/20 hover:border-[#5a4632]/12 hover:bg-white/50"
                      }`}
                  >
                    <span className="grid h-10 w-11 place-items-center rounded-lg border border-[#5a4632]/10 bg-white/35 text-[#5a4632]/45">
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

          <article className="mw-surface min-h-0 rounded-xl p-7">
            {selectedRecord ? (
              <div className="flex h-full flex-col">
                <div className="mb-6 flex items-start justify-between gap-5 border-b border-[#5a4632]/15 pb-6">
                  <div className="min-w-0">
                    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-[#5a4632]/48">
                      <div className="flex items-center gap-1 text-xs text-[#5a4632]/58">
                        <CalendarDays size={14} />
                        {formatCreatedAt(selectedRecord.entry.createdAt)}
                      </div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#5a4632]/12 bg-white/30 px-2.5 py-1">
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
                    <button
                      type="button"
                      onClick={() => onOpenPlaza(selectedRecord.plaza.id)}
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

                  <aside className="self-start rounded-lg border border-[#5a4632]/12 bg-white/25 p-5">
                    <p className="mb-4 text-xs text-[#5a4632]/45">내 오브젝트</p>
                    <div className="grid place-items-center rounded-lg border border-[#5a4632]/10 bg-white/30 px-4 py-7 text-[#5a4632]/45">
                      {selectedObject ? (
                        <img src={selectedObject.image} alt="" className="h-24 w-24 object-contain" />
                      ) : (
                        <Archive size={32} />
                      )}
                    </div>
                    <p className="mt-4 truncate text-sm text-[#5a4632]">{selectedObject?.label ?? "알 수 없는 오브젝트"}</p>
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
  );
}
