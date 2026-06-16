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
               완성된 감정 광장을 세련된 고해상도 일러스트 한 장으로 그려주세요.
               참여자들이 놓은 오브젝트들이 모여 만들어진 아늑한 방 또는 야외의 광장처럼 보여야 합니다.
               웬만하면 배치되어 있는 오브젝트만을 이용해서 방이나 야외 광장을 그려주세요.
               꾸며진 공간이 방 안에 있어야 하는 오브젝트가 많을 시에는 방으로 그려주시고, 야외에 있어야 하는 오브젝트가 많을 시에는 야외의 광장으로 그려주세요.

               한국 앱 "마음의 날씨"의 분위기를 유지해주세요:
               따뜻하고, 조용하고, 시적이며, 부드러운 조명이 있는 장면.
               손으로 그린 듯한 포근한 일러스트 느낌.
               부드러운 파스텔 색감.
               감성적인 일기장 같은 분위기.

               배치된 오브젝트들이 장면의 중심이 되게 해주세요.
               오브젝트 목록표나 스티커 모음처럼 보이지 않게 해주세요.
               하나의 완성된 감정 공간처럼 자연스럽게 재해석해주세요.
               오브젝트가 서로 너무 뭉개지지 않도록 적당히 떨어뜨려 표현해주세요.

               position 값과 roughPosition 값은 정확한 좌표가 아니라 대략적인 배치 참고용입니다.
               visualMood 값은 전체 분위기를 부드럽게 잡기 위한 참고용입니다.
               정확한 복사보다 자연스럽고 감성적인 완성 이미지를 우선해주세요.

               새로운 큰 오브젝트를 과하게 추가하지는 말아주세요.
               단, 바닥, 벽, 하늘, 조명, 그림자, 공기감처럼 장면을 완성하는 기본 배경 요소는 자연스럽게 추가해도 됩니다.

               사용자 이름, 사람의 얼굴, 로고, UI, 캡션, 워터마크를 넣지 마세요.
               이미지 안에는 한글, 영어, 숫자, 기호를 포함한 어떤 글자도 절대 넣지 마세요.
               간판, 종이, 책 표지, 벽 장식, 오브젝트 표면에도 읽을 수 있는 텍스트나 글자처럼 보이는 무늬를 넣지 마세요.

               배경 타입이 weather라면 배경 날씨 키의 날씨를 장면의 배경, 조명, 하늘, 공기감에 분명히 반영해주세요.
               배경 타입이 color라면 배경 색상을 장면의 주조색과 조명 분위기에 자연스럽게 반영해주세요.

               광장 제목: %s
               광장 주제: %s
               배경 타입: %s
               배경 색상: %s
               배경 날씨 키: %s
               배경 분위기 참고: %s
               오브젝트와 감정 메모:
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