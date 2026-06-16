package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    // [추가] 너무 많은 오브젝트를 한 번에 넣으면 이미지가 쉽게 뭉개질 수 있어서 최대 30개까지만 반영합니다.
    // 현재 광장 테스트가 12개 기준이면 그대로 12개만 들어갑니다.
    private static final int MAX_OBJECTS_FOR_PROMPT = 30;

    // [추가] positionX/Y가 픽셀값일 때 대략 위치로 변환하기 위한 기준값입니다.
    // 프론트 광장 캔버스 크기가 다르면 이 값만 바꾸면 됩니다.
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
                        "- 오브젝트=%s, 날씨=%s, 감정=%s, 대략 위치=%s, 메모=%s",
                        toPromptObjectName(entry.getObjectKey()),
                        safe(entry.getWeatherKey()),
                        safe(entry.getMoodKey()),
                        toRoughPosition(entry.getPositionX(), entry.getPositionY()),
                        summarize(entry.getContent())
                ))
                .collect(Collectors.joining("\n"));

        if (objects.isBlank()) {
            objects = "- 아직 배치된 오브젝트가 없는 조용한 감정 광장";
        }

        String title = plaza == null ? "제목 없음" : contextText(plaza.getTitle(), "제목 없음");
        String topic = plaza == null ? "주제 없음" : contextText(plaza.getTopic(), "주제 없음");
        String backgroundType = plaza == null ? "none" : safe(plaza.getBackgroundType());
        String backgroundColor = plaza == null || plaza.getBackgroundColor() == null
                ? "none"
                : safe(plaza.getBackgroundColor());
        String backgroundKey = plaza == null ? "none" : safe(plaza.getBackgroundKey());

        // [보완 1] 원본 프롬프트의 한국어 감성 지시를 유지했습니다.
        // 이유: 사용자가 테스트한 결과, 이 방향이 가장 자연스럽게 나왔기 때문입니다.
        //
        // [보완 2] position=(x,y) 숫자 좌표 대신 "왼쪽 아래", "가운데 중간" 같은 대략 위치로 바꿨습니다.
        // 이유: 숫자 좌표는 이미지 AI가 정확히 지키기 어렵고, 이미지 안에 숫자 흔적이 생길 위험도 있습니다.
        //
        // [보완 3] 광장 제목/주제/메모에서 영어와 숫자는 제거했습니다.
        // 이유: 사용자가 테스트할 때 제목이나 메모가 123123 같은 값이면 이미지 안에 숫자 비슷한 흔적이 생길 수 있습니다.
        //
        // [보완 4] "없는 오브젝트를 절대 추가하지 마라" 같은 강한 문장은 넣지 않았습니다.
        // 이유: 너무 강한 금지 지시를 넣으면 AI가 장면을 자연스럽게 만들지 못하고, 오히려 엉뚱한 결과가 나왔기 때문입니다.
        //
        // [보완 5] 대신 "새로운 큰 오브젝트를 과하게 추가하지 말라" 정도로만 완화했습니다.
        // 이유: 배경, 바닥, 하늘, 조명 같은 기본 요소는 있어야 완성 이미지가 자연스럽기 때문입니다.
        return """
               완성된 감정 광장을 세련된 고해상도 일러스트 한 장으로 그려주세요.
               참여자들이 놓은 오브젝트들이 모여 만들어진 아늑한 방 또는 야외의 광장처럼 보여야 합니다.
               웬만하면 배치되어 있는 오브젝트를 중심으로 방이나 야외 광장을 그려주세요.
               꾸며진 공간이 방 안에 있어야 하는 오브젝트가 많을 시에는 방으로 그려주시고, 야외에 있어야 하는 오브젝트가 많을 시에는 야외의 광장으로 그려주세요.

               한국 앱 "마음의 날씨"의 분위기를 유지해주세요:
               따뜻하고, 조용하고, 시적이며, 부드러운 조명이 있는 장면.
               손으로 그린 듯한 포근한 일러스트 느낌.
               부드러운 파스텔 색감.
               차분하고 감성적인 일기장 같은 분위기.

               사용자가 배치한 오브젝트 목록을 가장 중요한 참고 자료로 삼아주세요.
               오브젝트의 정확한 좌표를 복사할 필요는 없지만, 대략적인 위치 관계는 자연스럽게 반영해주세요.
               오브젝트들이 서로 너무 뭉개지지 않게 적당히 떨어뜨려 표현해주세요.
               새로운 큰 오브젝트를 과하게 추가하지 말고, 배치된 오브젝트들이 장면의 중심이 되게 해주세요.
               단, 바닥, 하늘, 벽, 빛, 그림자, 공기감처럼 장면을 완성하는 기본 배경 요소는 자연스럽게 추가해도 됩니다.

               이미지가 오브젝트 목록표나 스티커 모음처럼 보이지 않게 해주세요.
               하나의 완성된 감정 공간처럼 자연스럽게 재해석해주세요.

               사용자 이름, 사람의 얼굴, 로고, UI, 캡션, 워터마크를 넣지 마세요.
               이미지 안에는 한글, 영어, 숫자, 기호를 포함한 어떤 글자도 절대 넣지 마세요.
               간판, 종이, 책 표지, 벽 장식, 오브젝트 표면에도 읽을 수 있는 텍스트나 글자처럼 보이는 무늬를 넣지 마세요.

               배경 타입이 weather라면 배경 날씨 키의 날씨를 장면의 배경, 조명, 하늘, 공기감에 자연스럽게 반영해주세요.
               배경 타입이 color라면 배경 색상을 장면의 주조색과 조명 분위기에 자연스럽게 반영해주세요.

               광장 제목은 이미지에 쓰지 말고 분위기 참고용으로만 사용해주세요: %s
               광장 주제는 이미지에 쓰지 말고 분위기 참고용으로만 사용해주세요: %s
               배경 타입: %s
               배경 색상: %s
               배경 날씨 키: %s
               오브젝트와 감정 메모:
               %s
               """.formatted(
                title,
                topic,
                backgroundType,
                backgroundColor,
                backgroundKey,
                objects
        );
    }

    private String summarize(String content) {
        if (content == null || content.isBlank()) {
            return "짧은 감정 메모";
        }

        // [수정] 원본은 공백을 전부 제거해서 한국어 문장이 붙어버렸습니다.
        // 예: "오늘은 조금 쉬고 싶다" -> "오늘은조금쉬고싶다"
        // 이미지 프롬프트에서는 자연스러운 문장 형태가 더 낫기 때문에 공백을 하나로 정리합니다.
        String normalized = content.replaceAll("\\s+", " ").trim();

        // [추가] 숫자/영어는 이미지 안에 글자 흔적을 만들 수 있어 제거합니다.
        // 사용자가 테스트로 123123을 넣어도 이미지 프롬프트에는 숫자가 들어가지 않게 합니다.
        normalized = normalized
                .replaceAll("[A-Za-z0-9]", "")
                .replaceAll("\\s+", " ")
                .trim();

        if (normalized.isBlank()) {
            return "짧은 감정 메모";
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

        // [추가] 제목/주제에 테스트용 숫자나 영어가 들어가면 이미지에 영향을 줄 수 있어 제거합니다.
        text = text
                .replaceAll("[A-Za-z0-9]", "")
                .replaceAll("\\s+", " ")
                .trim();

        return text.isBlank() ? fallback : text;
    }

    private String toPromptObjectName(Object objectKey) {
        String key = safe(objectKey);
        String compactKey = key.replaceAll("[\\s_\\-]", "");

        // [추가] 숫자가 붙은 오브젝트명은 프롬프트에 숫자를 그대로 노출하지 않습니다.
        // 예: 고양이1 -> 크림색 고양이
        if (compactKey.equals("고양이1") || compactKey.equalsIgnoreCase("cat1")) {
            return "크림색의 작은 고양이";
        }

        if (compactKey.equals("고양이2") || compactKey.equalsIgnoreCase("cat2")) {
            return "회색과 흰색이 섞인 작은 고양이";
        }

        if (compactKey.equals("햄스터1") || compactKey.equalsIgnoreCase("hamster1")) {
            return "크림색과 베이지색의 작은 햄스터";
        }

        if (compactKey.equals("햄스터2") || compactKey.equalsIgnoreCase("hamster2")) {
            return "따뜻한 갈색의 작은 햄스터";
        }

        if (compactKey.equals("레서판다") || compactKey.equalsIgnoreCase("redpanda")) {
            return "복슬복슬한 꼬리를 가진 작은 레서판다";
        }

        return key.isBlank() ? "작은 감성 오브젝트" : key;
    }

    private String toRoughPosition(Object xValue, Object yValue) {
        double x = toPercent(xValue, true);
        double y = toPercent(yValue, false);

        String vertical;
        if (y < 33) {
            vertical = "위쪽";
        } else if (y < 66) {
            vertical = "중간";
        } else {
            vertical = "아래쪽";
        }

        String horizontal;
        if (x < 33) {
            horizontal = "왼쪽";
        } else if (x < 66) {
            horizontal = "가운데";
        } else {
            horizontal = "오른쪽";
        }

        return horizontal + " " + vertical;
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

        // 0.0 ~ 1.0 비율값
        if (number >= 0 && number <= 1) {
            return number * 100.0;
        }

        // 0 ~ 100 퍼센트값
        if (number >= 0 && number <= 100) {
            return number;
        }

        // 픽셀값
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