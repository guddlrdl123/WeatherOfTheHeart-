import type { WeatherKey, WeatherTone } from "../types/weather";

// 선택 가능한 날씨와 각 날씨가 방에 적용할 색감 정보입니다.
export const WEATHER_OPTIONS: WeatherTone[] = [
    {
        key: "sunny",
        label: "맑음",
        icon: "☀️",
        wall: "#1f2118",
        wallTop: "#2b2d1f",
        floor: "#14130d",
        windowTop: "#d0993d",
        windowBottom: "#e0bb72",
        accent: "#dfbf78",
    },
    {
        key: "rain",
        label: "비",
        icon: "🌧️",
        wall: "#121b2c",
        wallTop: "#18233b",
        floor: "#0b121d",
        windowTop: "#365b83",
        windowBottom: "#172945",
        accent: "#8eb7d8",
    },
    {
        key: "cloud",
        label: "흐림",
        icon: "☁️",
        wall: "#161b24",
        wallTop: "#202635",
        floor: "#0d1118",
        windowTop: "#536374",
        windowBottom: "#2d3848",
        accent: "#a7b0bd",
    },
    {
        key: "sunset",
        label: "노을",
        icon: "🌇",
        wall: "#231711",
        wallTop: "#321b12",
        floor: "#120a07",
        windowTop: "#c35e2f",
        windowBottom: "#7b2f1d",
        accent: "#e39a74",
    },
    {
        key: "night",
        label: "밤",
        icon: "🌙",
        wall: "#101527",
        wallTop: "#151d33",
        floor: "#080c16",
        windowTop: "#17223f",
        windowBottom: "#070b19",
        accent: "#b5bde4",
    },
    {
        key: "dawn",
        label: "오로라",
        icon: "✨",
        wall: "#101827",
        wallTop: "#172642",
        floor: "#0a101a",
        windowTop: "#1b5d6f",
        windowBottom: "#3b2a68",
        accent: "#7cffd5",
    },
    {
        key: "cherry",
        label: "설렘",
        icon: "🌸",
        wall: "#261c25",
        wallTop: "#3a2a3d",
        floor: "#171016",
        windowTop: "#f1b5ca",
        windowBottom: "#ffe1cf",
        accent: "#ffc2d7",
    },
];

// key로 날씨 정보를 바로 찾기 위한 조회용 맵입니다.
export const WEATHER_BY_KEY = WEATHER_OPTIONS.reduce<Record<WeatherKey, WeatherTone>>((acc, weather) => {
    acc[weather.key] = weather;
    return acc;
}, {} as Record<WeatherKey, WeatherTone>);
