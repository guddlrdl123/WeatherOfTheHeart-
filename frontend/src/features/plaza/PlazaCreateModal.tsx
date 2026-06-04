import { useState } from "react";
import { Plus, X } from "lucide-react";
import type { Plaza, PlazaBackground, PlazaWeatherKey } from "../../types/plaza";
import { createPlaza } from "../../utils/plazaStorage";
import { PLAZA_COLOR_OPTIONS, PLAZA_WEATHER_OPTIONS } from "./plazaHelpers";

type Props = {
  onCreate: (plaza: Plaza) => void;
  onClose: () => void;
};

const PLAZA_DESCRIPTION_MAX_LENGTH = 50;

export function PlazaCreateModal({ onCreate, onClose }: Props) {
  const [topic, setTopic] = useState("");
  const [topicError, setTopicError] = useState("");
  const [description, setDescription] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(12);
  const [isPublicRoom, setIsPublicRoom] = useState(true);
  const [allowDuplicateObjects, setAllowDuplicateObjects] = useState(false);
  const [backgroundType, setBackgroundType] = useState<PlazaBackground["type"]>("color");
  const [backgroundColor, setBackgroundColor] = useState(PLAZA_COLOR_OPTIONS[0].color);
  const [weatherKey, setWeatherKey] = useState<PlazaWeatherKey>("rain");

  function handleCreate() {
    const nextTopic = topic.trim();
    const nextMaxParticipants = Math.min(Math.max(maxParticipants, 1), 30);

    if (!nextTopic) {
      setTopicError("주제를 입력해주세요.");
      return;
    }

    onCreate(createPlaza({
      topic: nextTopic,
      description: description.trim(),
      maxParticipants: nextMaxParticipants,
      allowSearch: isPublicRoom,
      allowDuplicateObjects,
      background: backgroundType === "color"
        ? { type: "color", color: backgroundColor }
        : { type: "weather", weatherKey },
    }));

    setTopic("");
    setTopicError("");
    setDescription("");
    setMaxParticipants(12);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm select-none">
      <section className="mw-surface flex max-h-[92vh] w-full max-w-[620px] flex-col gap-5 overflow-y-auto rounded-xl bg-[#fffbf6f2] p-6 shadow-xl">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-normal text-[#5a4632]">새 광장 만들기</h2>
          <button
            type="button"
            onClick={onClose}
            className="grid h-9 w-9 place-items-center rounded-md border border-[#5a4632]/10 text-[#5a4632] hover:bg-black/5"
            aria-label="닫기"
            title="닫기"
          >
            <X size={17} />
          </button>
        </div>

        <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
          주제
          <input
            className="mw-input h-11 px-3 text-sm"
            value={topic}
            aria-invalid={topicError ? true : undefined}
            onChange={(event) => {
              setTopic(event.target.value);

              if (topicError) {
                setTopicError("");
              }
            }}
          />
          {topicError && <span className="text-xs text-[#b65f55]">{topicError}</span>}
        </label>

        <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
          설명
          <textarea
            className="mw-input min-h-[90px] resize-none p-3 text-sm leading-6"
            value={description}
            maxLength={PLAZA_DESCRIPTION_MAX_LENGTH}
            onChange={(event) => setDescription(event.target.value)}
          />
          <span className="text-right text-[0.68rem] text-[#5a4632]">
            {description.length}/{PLAZA_DESCRIPTION_MAX_LENGTH}
          </span>
        </label>

        <label className="flex flex-col gap-2 text-sm text-[#5a4632]">
          최대 오브젝트 수
          <input
            className="mw-input h-11 px-3 text-sm"
            type="number"
            min={1}
            max={30}
            value={maxParticipants}
            onChange={(event) => setMaxParticipants(Number(event.target.value))}
          />
          <span className="text-xs leading-5 text-[#5a4632]/55">
            설정한 오브젝트 수가 광장의 최대 참여 인원입니다. 최대 30명까지 참여할 수 있습니다.
          </span>
        </label>

        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={isPublicRoom}
              onClick={() => setIsPublicRoom((value) => !value)}
              className={`flex h-11 items-center justify-between gap-3 rounded-md border px-3 text-left text-sm transition ${isPublicRoom ? "border-[#9b6b54]/45 bg-[#9b6b54]/12 text-[#5a4632]" : "border-[#5a4632]/15 bg-white/30 text-[#5a4632]/55"}`}
            >
              <span className="truncate">{isPublicRoom ? "방 공개" : "방 비공개"}</span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full border transition ${isPublicRoom ? "border-[#9b6b54]/40 bg-[#9b6b54]/35" : "border-[#5a4632]/18 bg-[#5a4632]/10"}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#fffbf6] shadow-sm transition-transform ${isPublicRoom ? "translate-x-[22px]" : "translate-x-1"}`}
                />
              </span>
            </button>

            <button
              type="button"
              role="switch"
              aria-checked={allowDuplicateObjects}
              onClick={() => setAllowDuplicateObjects((value) => !value)}
              className={`flex h-11 items-center justify-between gap-3 rounded-md border px-3 text-left text-sm transition ${allowDuplicateObjects ? "border-[#9b6b54]/45 bg-[#9b6b54]/12 text-[#5a4632]" : "border-[#5a4632]/15 bg-white/30 text-[#5a4632]/55"}`}
            >
              <span className="truncate">오브젝트 중복 {allowDuplicateObjects ? "허용" : "금지"}</span>
              <span
                className={`relative h-6 w-11 shrink-0 rounded-full border transition ${allowDuplicateObjects ? "border-[#9b6b54]/40 bg-[#9b6b54]/35" : "border-[#5a4632]/18 bg-[#5a4632]/10"}`}
                aria-hidden="true"
              >
                <span
                  className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-[#fffbf6] shadow-sm transition-transform ${allowDuplicateObjects ? "translate-x-[22px]" : "translate-x-1"}`}
                />
              </span>
            </button>
          </div>

          {!isPublicRoom && (
            <span className="text-xs leading-5 text-[#5a4632]/55">
              비공개 광장은 목록에 표시되지 않으며, 초대 코드를 입력한 사용자만 입장할 수 있어요.
            </span>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setBackgroundType("color")}
              className={`rounded-md border px-3 py-2 text-sm transition ${backgroundType === "color" ? "border-[#9b6b54]/45 bg-[#9b6b54]/12 text-[#5a4632]" : "border-[#5a4632]/15 bg-white/30 text-[#5a4632]/55"}`}
            >
              배경색
            </button>
            <button
              type="button"
              onClick={() => setBackgroundType("weather")}
              className={`rounded-md border px-3 py-2 text-sm transition ${backgroundType === "weather" ? "border-[#9b6b54]/45 bg-[#9b6b54]/12 text-[#5a4632]" : "border-[#5a4632]/15 bg-white/30 text-[#5a4632]/55"}`}
            >
              날씨
            </button>
          </div>

          {backgroundType === "color" ? (
            <div className="grid grid-cols-3 gap-2">
              {PLAZA_COLOR_OPTIONS.map((option) => (
                <button
                  key={option.color}
                  type="button"
                  onClick={() => setBackgroundColor(option.color)}
                  className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs transition ${backgroundColor === option.color ? "border-[#9b6b54]/45 bg-[#9b6b54]/12 text-[#5a4632]" : "border-[#5a4632]/15 bg-white/30 text-[#5a4632]/55"}`}
                >
                  <span
                    className="h-5 w-5 shrink-0 rounded border border-[#5a4632]/20"
                    style={{ backgroundColor: option.color }}
                    aria-hidden="true"
                  />
                  {option.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {PLAZA_WEATHER_OPTIONS.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => setWeatherKey(option.key)}
                  className={`rounded-md border px-2 py-2 text-xs transition ${weatherKey === option.key ? "border-[#9b6b54]/45 bg-[#9b6b54]/12 text-[#5a4632]" : "border-[#5a4632]/15 bg-white/30 text-[#5a4632]/55"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={handleCreate}
          className="mw-button-solid inline-flex items-center justify-center gap-2 rounded-md px-5 py-3 text-sm"
        >
          <Plus size={16} />
          생성
        </button>
      </section>
    </div>
  );
}
