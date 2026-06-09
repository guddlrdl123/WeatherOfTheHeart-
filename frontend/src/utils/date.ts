export const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
export const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

export type DateString = string;

// 오늘 날짜
export function getTodayString(): DateString {
    const date = new Date();
    return toDateString(date);
}

// Date 객체 -> YYYY-MM-DD
export function toDateString(date: Date): DateString {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// YYYY-MM-DD -> YYYY.MM.DD
export function formatDotDate(date: DateString): string {
    const [year, month, day] = date.split("-");
    return `${year}.${month}.${day}`;
}

export function trimTrailingDatePeriod(value: string): string {
    return value.replace(/\.\s*$/, "");
}

// 캘린더 데이터 생성
export function getMonthDays(year: number, month: number): (DateString | null)[] {
    const firstDay = new Date(year, month - 1, 1).getDay();
    const lastDate = new Date(year, month, 0).getDate();

    const days: (DateString | null)[] = Array(firstDay).fill(null);

    for (let day = 1; day <= lastDate; day += 1) {
        days.push(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`);
    }

    return days;
}
