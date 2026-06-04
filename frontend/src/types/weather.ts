export type WeatherKey = "sunny" | "rain" | "cloud" | "sunset" | "night" | "dawn" | "cherry";

export type WeatherTone = {
    key: WeatherKey;
    label: string;
    icon: string;
    wall: string;
    wallTop: string;
    floor: string;
    windowTop: string;
    windowBottom: string;
    accent: string;
};
