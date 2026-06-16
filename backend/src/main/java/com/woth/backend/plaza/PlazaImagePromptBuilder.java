package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    // [추가] 오브젝트가 너무 많을 때 프롬프트가 과하게 길어지는 것만 방지합니다.
    // 원본 흐름은 유지하되, 최대 개수만 제한합니다.
    private static final int MAX_OBJECTS_FOR_PROMPT = 30;

    public String build(Plaza plaza, List<PlazaEntry> entries) {
        List<PlazaEntry> safeEntries = entries == null
                ? List.of()
                : entries.stream()
                .limit(MAX_OBJECTS_FOR_PROMPT)
                .collect(Collectors.toList());

        String objects = safeEntries.stream()
                .map(entry -> String.format(
                        "-object=%s, weather=%s, mood=%s, position=(%s,%s), text=%s",
                        safe(entry.getObjectKey()),
                        safe(entry.getWeatherKey()),
                        safe(entry.getMoodKey()),
                        safe(entry.getPositionX()),
                        safe(entry.getPositionY()),
                        summarize(entry.getContent())
                ))
                .collect(Collectors.joining("\n"));

        if (objects.isBlank()) {
            objects = "-object=empty plaza, weather=soft, mood=calm, position=(center,center), text=조용한 감정 광장";
        }

        String title = plaza == null ? "조용한 감정 광장" : contextText(plaza.getTitle(), "조용한 감정 광장");
        String topic = plaza == null ? "말하지 못한 마음이 모이는 공간" : contextText(plaza.getTopic(), "말하지 못한 마음이 모이는 공간");
        String backgroundType = plaza == null ? "none" : safe(plaza.getBackgroundType());
        String backgroundColor = plaza == null || plaza.getBackgroundColor() == null
                ? "none"
                : safe(plaza.getBackgroundColor());
        String backgroundKey = plaza == null ? "none" : safe(plaza.getBackgroundKey());

        // [수정] 원본 프롬프트 구조로 되돌렸습니다.
        // 이유: 실제 테스트에서 원본이 가장 풍부하고 자연스럽게 나왔기 때문입니다.
        //
        // [수정] 영어 프롬프트, 오브젝트 영어 변환, roughPosition 변환을 제거했습니다.
        // 이유: 오브젝트명이 매핑에서 누락되거나 단순화되면서 AI가 원래 오브젝트를 제대로 못 잡고,
        //      카페/실내/가구 중심 장면으로 새로 해석하는 문제가 생겼기 때문입니다.
        //
        // [수정] "절대 추가하지 마라", "무조건 다 그려라", "필수 오브젝트" 같은 강한 지시를 제거했습니다.
        // 이유: 너무 강한 제한이 들어가면 AI가 장면을 자연스럽게 만들지 못하고 오히려 결과가 빈약해졌습니다.
        //
        // [수정] title/topic/content에서 영어와 숫자는 제거하거나 대체합니다.
        // 이유: 테스트 제목이나 메모가 123123이면 이미지 안에 숫자 흔적이 생길 수 있기 때문입니다.
        //
        // [유지] objectKey는 원본 그대로 전달합니다.
        // 이유: "수달", "펭귄", "벤치", "풍선 다발" 같은 실제 오브젝트명이 그대로 들어가야
        //      AI가 장면을 더 풍부하게 해석했습니다.
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
            return "조용한 감정 메모";
        }

        // [수정] 원본은 공백을 전부 제거했는데,
        // 한국어 문장이 붙어버리면 오히려 의미가 흐려질 수 있어서 공백 하나로 정리합니다.
        String normalized = content.replaceAll("\\s+", " ").trim();

        // [추가] 테스트용 숫자/영어가 이미지 안에 흔적처럼 생길 수 있어서 제거합니다.
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
        // 예: 테스트 제목 123123 -> fallback 사용
        text = text
                .replaceAll("[A-Za-z0-9]", "")
                .replaceAll("\\s+", " ")
                .trim();

        return text.isBlank() ? fallback : text;
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