import type { WeatherKey } from "./weather";

export type MoodKey =
    | "joy"
    | "sadness"
    | "anger"
    | "fear"
    | "surprise"
    | "disgust"
    | "calm"
    | "depressed"
    | "flutter"
    | "confused"
    | "tired"
    | "longing";

export type MoodOption = {
    key: MoodKey;
    label: string;
    icon: string;
    weatherKey: WeatherKey;
};
