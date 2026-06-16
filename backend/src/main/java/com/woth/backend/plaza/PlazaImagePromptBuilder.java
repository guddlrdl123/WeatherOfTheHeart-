package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    // [추가] 너무 많은 오브젝트를 한 번에 넣으면 이미지가 뭉개질 수 있어서 최대 30개까지만 사용합니다.
    private static final int MAX_OBJECTS_FOR_PROMPT = 30;

    // [추가] 프론트 광장 캔버스 기준입니다. 실제 캔버스 크기가 다르면 여기만 바꾸면 됩니다.
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
                        "- object=%s, mood=%s, roughPosition=%s, note=%s",
                        toPromptObjectName(entry.getObjectKey()),
                        safe(entry.getMoodKey()),
                        toRoughPosition(entry.getPositionX(), entry.getPositionY()),
                        summarize(entry.getContent())
                ))
                .collect(Collectors.joining("\n"));

        if (objects.isBlank()) {
            objects = "- a quiet empty emotional plaza";
        }

        String backgroundType = plaza == null ? "none" : safe(plaza.getBackgroundType());
        String backgroundColor = plaza == null || plaza.getBackgroundColor() == null
                ? "none"
                : safe(plaza.getBackgroundColor());
        String backgroundKey = plaza == null ? "none" : safe(plaza.getBackgroundKey());

        // [보완] 원본 프롬프트의 장점은 유지하고, 핵심 지시만 영어로 바꾼 버전입니다.
        // 영어가 이미지 생성 AI에 더 잘 먹히는 경우가 많지만,
        // 너무 많은 규칙을 넣으면 오히려 결과가 망가질 수 있어서 짧게 유지했습니다.
        //
        // [보완] plaza title/topic은 제거했습니다.
        // 테스트 제목이 123123처럼 숫자로 들어가면 이미지 안에 숫자 흔적이 생길 수 있기 때문입니다.
        //
        // [보완] position=(x,y) 숫자 좌표 대신 roughPosition으로 바꿨습니다.
        // 숫자 좌표를 직접 넣어도 AI가 정확히 지키기 어렵고, 숫자 흔적 위험도 있습니다.
        //
        // [보완] weather는 오브젝트마다 넣지 않고 전체 backgroundKey만 사용합니다.
        // 오브젝트마다 날씨가 섞이면 장면이 산만해질 수 있기 때문입니다.
        return """
               Create one finished high-resolution illustration of an emotional plaza.

               The scene should look like a cozy room or a small outdoor plaza created from the user's placed objects.
               Use the listed objects as the main inspiration.
               Keep the rough placement of the objects when it feels natural.
               Do not make it look like a sticker sheet or an item inventory.
               Make it feel like one complete emotional place.

               Mood and style:
               warm, quiet, poetic, soft lighting, hand-painted cozy illustration,
               soft pastel colors, calm Korean diary mood, nostalgic and comforting.

               Scene direction:
               If many objects feel like indoor objects, make it a cozy room.
               If many objects feel like outdoor objects, make it a small outdoor plaza.
               If the background type is weather, reflect the weather through the sky, light, air, and atmosphere.
               If the background type is color, use the color as the main mood and lighting tone.

               Avoid adding large unrelated focal objects.
               Simple background elements such as floor, wall, sky, light, shadow, and atmosphere are okay.

               Do not include people, human faces, usernames, logos, UI, captions, or watermarks.
               Do not include readable text, Korean letters, English letters, numbers, symbols, labels, book titles, poster text, or letter-like marks.

               Background type: %s
               Background color: %s
               Background weather key: %s

               Placed objects and emotional notes:
               %s
               """.formatted(
                backgroundType,
                backgroundColor,
                backgroundKey,
                objects
        );
    }

    private String summarize(String content) {
        if (content == null || content.isBlank()) {
            return "quiet feeling";
        }

        String normalized = content.replaceAll("\\s+", " ").trim();

        // [보완] 숫자와 영어는 프롬프트에서 제거합니다.
        // 테스트 메모가 123123일 경우 이미지에 숫자 흔적이 생기는 걸 줄이기 위함입니다.
        normalized = normalized
                .replaceAll("[A-Za-z0-9]", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.isBlank()) {
            return "quiet feeling";
        }

        return normalized.length() > 50
                ? normalized.substring(0, 50) + "..."
                : normalized;
    }

    private String toPromptObjectName(Object objectKey) {
        String key = safe(objectKey);
        String compactKey = key.replaceAll("[\\s_\\-]", "").toLowerCase();

        // [보완] 숫자가 붙은 오브젝트명은 숫자를 그대로 프롬프트에 넣지 않고 외형으로 풀어줍니다.
        if (compactKey.equals("고양이1") || compactKey.equals("cat1")) {
            return "a small cream-colored cat";
        }

        if (compactKey.equals("고양이2") || compactKey.equals("cat2")) {
            return "a small gray-and-white cat";
        }

        if (compactKey.equals("햄스터1") || compactKey.equals("hamster1")) {
            return "a small cream and beige hamster";
        }

        if (compactKey.equals("햄스터2") || compactKey.equals("hamster2")) {
            return "a small warm-brown hamster";
        }

        if (compactKey.equals("레서판다") || compactKey.equals("redpanda")) {
            return "a cute red panda with a fluffy tail";
        }

        return switch (key) {
            case "수달" -> "a cute otter resting near water";
            case "나비" -> "a small butterfly";
            case "새" -> "a small bird flying softly";
            case "누워 있는 강아지" -> "a relaxed dog lying down";
            case "앉아있는 강아지" -> "a friendly sitting dog";
            case "앉아있는 갈색 강아지" -> "a small brown sitting dog";
            case "앉아있는 고양이" -> "a calm sitting cat";
            case "잠자는 고양이" -> "a curled sleeping cat";
            case "앉아있는 삼색 고양이" -> "a sitting calico cat";
            case "여우" -> "a quiet small fox";
            case "펭귄" -> "a small cute penguin";

            case "풍선 다발" -> "a small bunch of balloons";
            case "벤치" -> "a warm wooden bench";
            case "낮은 테이블" -> "a low wooden table";
            case "책 더미" -> "a small stack of blank books";
            case "구겨진 캔" -> "a crumpled empty can";
            case "구겨진 캔2" -> "a crumpled empty can";
            case "작은 쓰레기 더미" -> "a tiny pile of paper scraps";
            case "쓰레기" -> "a tiny piece of harmless clutter";
            case "쓰레기 더미" -> "a tiny pile of harmless clutter";
            case "커피 컵" -> "a small coffee cup with no logo";
            case "물웅덩이" -> "a small puddle of water";
            case "피크닉 바구니" -> "a cozy picnic basket";
            case "우산꽂이" -> "an umbrella stand";
            case "그늘막 우산" -> "a shade umbrella";
            case "표지판" -> "a blank sign with no text";

            default -> key.isBlank()
                    ? "a small cozy object"
                    : key;
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