import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { WEATHER_BY_KEY } from "../../constants/weather";
import type { Memory } from "../../types/memory";

export default function Calendar({
    selectedDate,
    onSelectDate,
    memories,
}: {
    selectedDate: string;
    onSelectDate: (date: string) => void;
    memories: Memory[];
}) {
    const [currentDate, setCurrentDate] = useState(new Date());

    const today = new Date();

    const todayString =
        `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const days = ["일", "월", "화", "수", "목", "금", "토"];

    // 이번 달 시작 요일
    const firstDay = new Date(year, month, 1).getDay();

    // 이번 달 마지막 날짜
    const lastDate = new Date(year, month + 1, 0).getDate();

    // 캘린더 배열 생성
    const dates = [
        ...Array(firstDay).fill(""),
        ...Array.from({ length: lastDate }, (_, i) => i + 1),
    ];

    // 이전 달로 이동
    const prevMonth = () => {
        setCurrentDate(new Date(year, month - 1, 1));
    };

    // 다음 달로 이동
    const nextMonth = () => {
        setCurrentDate(new Date(year, month + 1, 1));
    };

    return (
        <div className="h-full w-full bg-[#faf8f2] p-4 select-none">

            {/* HEADER */}
            <div className="mb-4 flex items-center justify-between">

                <button onClick={prevMonth} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#5a4632]/10 transition-colors">
                    <ChevronLeft size={16} className="text-[#5a4632]" />
                </button>

                <strong className="text-sm font-semibold text-[#5a4632]">
                    {year}년 {month + 1}월
                </strong>

                <button onClick={nextMonth} className="grid h-8 w-8 place-items-center rounded-md hover:bg-[#5a4632]/10 transition-colors">
                    <ChevronRight size={16} className="text-[#5a4632]" />
                </button>

            </div>

            {/* CALENDAR */}
            <div className="grid grid-cols-7 gap-x-1.5 gap-y-1">

                {/* DAY */}
                {days.map((day) => (
                    <div
                        key={day}
                        className="py-2 text-center text-[11px] text-[#5a4632]/50"
                    >
                        {day}
                    </div>
                ))}

                {/* DATE */}
                {dates.map((date, index) => {
                    if (!date) {
                        return (
                            <div key={index} className="aspect-square w-full" />
                        );
                    }

                    const dateString = `${year}-${String(month + 1).padStart(2, "0")}-${String(date).padStart(2, "0")}`;

                    const isFuture = dateString > todayString;

                    const isSelected = selectedDate === dateString;

                    const memoryForDate = memories.find(
                        (memory) => memory.memoryDate === dateString
                    );
                    const weatherForDate = memoryForDate ? WEATHER_BY_KEY[memoryForDate.weatherKey] : null;

                    return (
                        <button
                            key={index}
                            type="button"
                            onClick={() => {
                                if (!date || isFuture) return;
                                onSelectDate(dateString);
                            }}
                            className={`
                                flex aspect-square w-full flex-col items-center justify-center rounded-md text-[12px]
                                transition-colors

                                ${!date
                                    ? "pointer-events-none"
                                    : isFuture
                                        ? "text-[#5a4632]/20 pointer-events-none"
                                        : isSelected
                                            ? "cursor-pointer bg-[#5a4632]/20 text-[#5a4632] font-semibold"
                                            : "text-[#5a4632] hover:bg-[#5a4632]/5 cursor-pointer"}
                            `}
                        >
                            <span>{date}</span>

                            {weatherForDate && (
                                <span
                                    className="mt-0.5 block h-3 shrink-0 text-[10px] leading-none"
                                    title={weatherForDate.label}
                                    aria-label={weatherForDate.label}
                                >
                                    {weatherForDate.icon}
                                </span>
                            )}
                            {/* <span>☔</span> */}
                        </button>
                    );
                })}

            </div>
        </div>
    );
}
