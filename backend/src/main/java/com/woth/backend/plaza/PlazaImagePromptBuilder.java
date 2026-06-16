package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    // [추가] 오브젝트가 너무 많아질 때 프롬프트가 과하게 길어지는 것만 방지합니다.
    private static final int MAX_OBJECTS_FOR_PROMPT = 30;

    // [추가] positionX/Y가 픽셀값일 때 roughPosition 계산에 사용하는 캔버스 기준입니다.
    // 프론트 광장 캔버스가 1024x768이 아니면 여기만 실제 크기에 맞게 바꾸면 됩니다.
    private static final double CANVAS_WIDTH = 1024.0;
    private static final double CANVAS_HEIGHT = 768.0;

    public String build(Plaza plaza, List<PlazaEntry> entries) {
        List<PlazaEntry> safeEntries = entries == null
                ? List.of()
                : entries.stream()
                .limit(MAX_OBJECTS_FOR_PROMPT)
                .collect(Collectors.toList());

        String objects = safeEntries.stream()
                .map(entry -> String.format(
                        "-object=%s, weather=%s, mood=%s, visualMood=%s, position=(%s,%s), roughPosition=%s, text=%s",
                        safe(entry.getObjectKey()),
                        safe(entry.getWeatherKey()),
                        safe(entry.getMoodKey()),
                        toMoodPrompt(entry.getMoodKey()),
                        safe(entry.getPositionX()),
                        safe(entry.getPositionY()),
                        toRoughPosition(entry.getPositionX(), entry.getPositionY()),
                        summarize(entry.getContent())
                ))
                .collect(Collectors.joining("\n"));

        if (objects.isBlank()) {
            objects = "-object=empty plaza, weather=soft, mood=calm, visualMood=quiet feeling, position=(center,center), roughPosition=middle center, text=조용한 감정 광장";
        }

        String title = plaza == null
                ? "조용한 감정 광장"
                : contextText(plaza.getTitle(), "조용한 감정 광장");

        String topic = plaza == null
                ? "말하지 못한 마음이 모이는 공간"
                : contextText(plaza.getTopic(), "말하지 못한 마음이 모이는 공간");

        String backgroundType = plaza == null ? "none" : safe(plaza.getBackgroundType());

        String backgroundColor = plaza == null || plaza.getBackgroundColor() == null
                ? "none"
                : safe(plaza.getBackgroundColor());

        String backgroundKey = plaza == null ? "none" : safe(plaza.getBackgroundKey());

        String backgroundMood = plaza == null
                ? "soft emotional atmosphere"
                : toWeatherPrompt(plaza.getBackgroundKey());

        // [수정] 원본 프롬프트 구조를 최대한 유지했습니다.
        // 이유: 실제 테스트에서 원본 코드가 가장 풍부하고 자연스럽게 나왔기 때문입니다.
        //
        // [추가] visualMood와 roughPosition을 오브젝트 메모에만 약하게 추가했습니다.
        // 이유: mood/position 정보를 완전히 버리지는 않되, AI에게 강제 배치 명령처럼 느껴지지 않도록 하기 위함입니다.
        //
        // [주의] "반드시 모두 그려라", "절대 추가하지 마라", "정확히 좌표대로 배치해라" 같은 강한 문장은 넣지 않았습니다.
        // 이유: 이전 테스트에서 이런 강한 지시가 들어갈수록 결과가 빈약해지거나 엉뚱한 장면으로 바뀌었습니다.
        //
        // [유지] objectKey는 영어로 강제 변환하지 않고 원본 그대로 전달합니다.
        // 이유: 현재 서비스 오브젝트 이름이 한국어이고, 원본 프롬프트에서 이 방식이 더 풍부하게 나왔기 때문입니다.
        //
        // [추가] backgroundMood는 배경 날씨 키를 영어 감성 표현으로 한 번 풀어준 보조 힌트입니다.
        // 단, 너무 강하게 먹지 않도록 "참고용" 흐름 안에만 넣었습니다.
        return """
                Create one polished high-resolution illustration of a completed emotional plaza.
                The scene should feel like a cozy room or a small outdoor plaza formed by the objects placed by the participants.
                As much as possible, build the room or plaza around the placed objects.
                If most objects feel more suitable for an indoor space, make it a cozy room.
                If most objects feel more suitable for an outdoor space, make it a small outdoor plaza.
                
                Please preserve the atmosphere of the Korean app "Weather of the Heart":
                warm, quiet, poetic, softly lit, and emotionally gentle.
                Use a cozy hand-painted illustration style.
                Use soft pastel colors.
                Make the scene feel like a calm emotional diary.
                
                Let the placed objects become the center of the scene.
                Do not make the image look like an object list or a sticker collection.
                Reinterpret the objects naturally as one complete emotional space.
                Leave enough space between the objects so they do not blend together too much.
                
                The position and roughPosition values are only rough layout references, not exact coordinates.
                The visualMood value is only a soft reference for the overall atmosphere.
                Prioritize a natural, emotional finished illustration over an exact copy of the layout.
                
                Please do not add too many large new objects.
                However, simple background elements such as floor, wall, sky, light, shadow, and atmosphere may be added naturally to complete the scene.
                
                Do not include usernames, human faces, logos, UI elements, captions, or watermarks.
                Do not include readable text of any kind, including Korean, English, numbers, or symbols.
                Do not put readable text or text-like marks on signs, paper, book covers, wall decorations, or object surfaces.
                
                If the background type is weather, clearly reflect the background weather key through the sky, lighting, air, and overall atmosphere.
                If the background type is color, naturally reflect the background color through the main color palette and lighting mood.
                
                Plaza title: %s
                Plaza topic: %s
                Background type: %s
                Background color: %s
                Background weather key: %s
                Background mood reference: %s
                Objects and emotional notes:
                %s
                """.formatted(
                title,
                topic,
                backgroundType,
                backgroundColor,
                backgroundKey,
                backgroundMood,
                objects
        );
    }
    private String summarize(String content) {
        if (content == null || content.isBlank()) {
            return "조용한 감정 메모";
        }

        // [수정] 원본처럼 공백을 전부 없애지 않고, 공백 하나로 정리합니다.
        // 예: "오늘은 조금 쉬고 싶다" 형태를 유지하기 위함입니다.
        String normalized = content.replaceAll("\\s+", " ").trim();

        // [추가] 테스트용 숫자/영어가 이미지 안에 흔적처럼 생길 수 있어 제거합니다.
        normalized = normalized
                .replaceAll("[A-Za-z0-9]", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.isBlank()) {
            return "조용한 감정 메모";
        }

        return normalized.length() > 50
                ? normalized.substring(0, 50) + "..."
                : normalized;
    }

    private String contextText(Object value, String fallback) {
        String text = safe(value);

        if (text.isBlank()) {
            return fallback;
        }

        // [추가] 제목/주제에 숫자나 영어가 있으면 이미지에 글자 흔적이 생길 수 있어서 제거합니다.
        text = text
                .replaceAll("[A-Za-z0-9]", "")
                .replaceAll("\\s+", " ")
                .trim();

        return text.isBlank() ? fallback : text;
    }

    private String toMoodPrompt(Object moodKey) {
        String key = safe(moodKey).toLowerCase(Locale.ROOT);

        return switch (key) {
            case "happy", "joy", "기쁨", "행복" -> "gentle happiness";
            case "sad", "sadness", "슬픔", "우울" -> "quiet sadness";
            case "angry", "anger", "화남", "분노" -> "soft tension";
            case "anxious", "anxiety", "불안" -> "calm reassurance";
            case "lonely", "loneliness", "외로움" -> "lonely but warm";
            case "tired", "피곤", "지침" -> "tired but resting";
            case "peaceful", "calm", "평온", "차분" -> "peaceful calm";
            case "excited", "설렘" -> "quiet excitement";
            case "empty", "허무" -> "gentle emptiness";
            default -> "quiet feeling";
        };
    }

    private String toWeatherPrompt(Object weatherKey) {
        String key = safe(weatherKey).toLowerCase(Locale.ROOT);

        return switch (key) {
            case "sunny", "clear", "맑음", "sun" -> "warm sunlight and clear soft air";
            case "cloudy", "cloud", "흐림", "구름" -> "soft cloudy light and muted air";
            case "rain", "rainy", "비" -> "gentle rainy atmosphere";
            case "snow", "snowy", "눈" -> "quiet snowy air and soft white light";
            case "night", "밤" -> "calm night light with small warm lamps";
            case "fog", "foggy", "안개" -> "misty air and quiet distant background";
            case "wind", "windy", "바람" -> "gentle breeze and softly moving air";
            case "storm", "stormy", "폭풍" -> "dramatic but still comforting weather mood";
            default -> "soft emotional atmosphere";
        };
    }

    private String toRoughPosition(Object xValue, Object yValue) {
        double x = toPercent(xValue, true);
        double y = toPercent(yValue, false);

        String vertical;
        if (y < 33) {
            vertical = "upper";
        } else if (y < 66) {
            vertical = "middle";
        } else {
            vertical = "lower";
        }

        String horizontal;
        if (x < 33) {
            horizontal = "left";
        } else if (x < 66) {
            horizontal = "center";
        } else {
            horizontal = "right";
        }

        return vertical + " " + horizontal;
    }

    private double toPercent(Object value, boolean xAxis) {
        if (value == null) {
            return 50.0;
        }

        double number;

        try {
            if (value instanceof Number) {
                number = ((Number) value).doubleValue();
            } else {
                number = Double.parseDouble(String.valueOf(value).trim());
            }
        } catch (NumberFormatException e) {
            return 50.0;
        }

        if (number >= 0 && number <= 1) {
            return number * 100.0;
        }

        if (number >= 0 && number <= 100) {
            return number;
        }

        double max = xAxis ? CANVAS_WIDTH : CANVAS_HEIGHT;
        double percent = (number / max) * 100.0;

        if (percent < 0) {
            return 0;
        }

        return Math.min(percent, 100.0);
    }

    private String safe(Object value) {
        if (value == null) {
            return "";
        }

        return String.valueOf(value)
                .replaceAll("\\s+", " ")
                .trim();
    }
}