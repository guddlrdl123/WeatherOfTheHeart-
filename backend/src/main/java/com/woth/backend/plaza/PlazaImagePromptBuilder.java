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

        return """
       Please create one polished high-resolution illustration of a completed emotional plaza.
       It should look like a cozy room or an outdoor plaza created by the objects placed by the participants.
       As much as possible, please draw the room or outdoor plaza using only the placed objects.
       If there are more objects that naturally belong indoors, please make it a room, and if there are more objects that naturally belong outdoors, please make it an outdoor plaza.

       Please preserve the atmosphere of the Korean app "Weather of the Heart":
       a warm, quiet, poetic scene with gentle but clear lighting.
       A polished hand-painted storybook illustration style with clean painted edges and readable object shapes.
       Soft muted pastel colors with clear value contrast, so that each object remains clearly visible.
       A diary-like emotional atmosphere, while keeping the image clear, refined, and not blurry or washed out.

       Please make the placed objects the center of the scene.
       Each placed object should have a clear silhouette, clean edges, and recognizable details.
       Please make sure it does not look like an object list or a sticker collection.
       Please reinterpret it naturally as one complete emotional space.
       Please place the objects with enough space so that they do not blend together too much.

       The position and roughPosition values are not exact coordinates, but only references for the approximate layout.
       The visualMood value is only a reference to help guide the overall atmosphere gently.
       Please prioritize a natural and emotional finished image over an exact copy.

       Please do not add too many large new objects.
       However, you may naturally add basic background elements that complete the scene, such as the floor, walls, sky, lighting, shadows, and atmosphere, while keeping the placed objects clear and readable.

       Do not include user names, human faces, logos, UI, captions, or watermarks.
       Do not include any readable text in the image, including Korean, English, numbers, or symbols.
       Do not put readable text or text-like patterns on signs, paper, book covers, wall decorations, or object surfaces.

       If the background type is weather, clearly reflect the weather of the background weather key in the background, lighting, sky, and atmosphere of the scene.
       If the background type is color, naturally reflect the background color in the main color tone and lighting mood of the scene.

        [동물 표현 규칙]

        광장에 동물이나 생물이 등장한다면 반드시 원래의 형태를 유지해주세요.

        동물은 눈, 코, 입, 귀, 다리, 발, 꼬리 등 신체 구조가 자연스럽고 정확해야 합니다.

        다음과 같은 모습은 절대 허용하지 않습니다.

        - 얼굴이 찌그러진 모습
        - 눈의 위치가 이상한 모습
        - 코와 입이 비정상적으로 붙은 모습
        - 다리가 너무 많거나 부족한 모습
        - 몸이 녹은 것처럼 표현된 모습
        - 다른 오브젝트와 몸이 합쳐진 모습
        - 머리가 여러 개 생긴 모습
        - 얼굴이 비대칭인 모습
        - 기괴하거나 공포스러운 표정
        - 해부학적으로 어색한 모습

        동물은 귀엽고 건강하며 따뜻한 분위기로 표현해주세요.

        동물이 여러 마리라면 서로 몸이 겹치거나 합쳐지지 않게 해주세요.

        각 동물은 독립된 형태와 선명한 윤곽을 가져야 하며, 멀리서 보아도 어떤 동물인지 바로 알아볼 수 있어야 합니다.

        감성적인 그림체는 유지하되, 동물의 원래 형태와 비율은 절대 변형하지 마세요.

        다른 오브젝트와 동물을 합치거나 융합하지 마세요.

        모든 오브젝트와 동물은 각각의 고유한 형태를 유지해야 합니다.
        
        동물과 다른 오브젝트를 서로 합치거나 융합하지 마세요.
        동물의 형태를 변형하거나 찌그러뜨리지 마세요.
        동물의 얼굴은 반드시 자연스럽고 좌우 대칭이어야 합니다.
        동물은 실제 동물의 특징을 유지한 귀여운 동화책 스타일로 표현해주세요.
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