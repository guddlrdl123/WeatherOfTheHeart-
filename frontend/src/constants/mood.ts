import type { MoodKey, MoodOption } from "../types/mood";

export const MOOD_OPTIONS: MoodOption[] = [
    { key: "joy", label: "기쁨", icon: "😊", weatherKey: "sunny" },
    { key: "sadness", label: "슬픔", icon: "😢", weatherKey: "rain" },
    { key: "anger", label: "분노", icon: "😠", weatherKey: "sunset" },
    { key: "fear", label: "두려움", icon: "😨", weatherKey: "night" },
    { key: "surprise", label: "놀람", icon: "😲", weatherKey: "dawn" },
    { key: "disgust", label: "혐오", icon: "🤢", weatherKey: "cloud" },
    { key: "calm", label: "평온", icon: "😌", weatherKey: "sunny" },
    { key: "depressed", label: "우울", icon: "😔", weatherKey: "rain" },
    { key: "flutter", label: "설렘", icon: "😍", weatherKey: "cherry" },
    { key: "confused", label: "혼란", icon: "😵", weatherKey: "cloud" },
    { key: "tired", label: "피곤함", icon: "😴", weatherKey: "night" },
    { key: "longing", label: "그리움", icon: "😶", weatherKey: "dawn" },
];

export const MOOD_BY_KEY = MOOD_OPTIONS.reduce<Record<MoodKey, MoodOption>>((acc, mood) => {
    acc[mood.key] = mood;
    return acc;
}, {} as Record<MoodKey, MoodOption>);
