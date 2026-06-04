package com.woth.backend.plaza;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    public String build(Plaza plaza, List<PlazaEntry > entries) {
        String objects = entries.stream().map(entry -> String.format(
                "-obeject=%s, weather=%s, mood=%s, position=(%s,%s), text=%s",
                entry.getObjectKey(),
                entry.getWeatherKey(),
                entry.getMoodKey(),
                entry.getPositionX(),
                entry.getPositionY(),
                summarize(entry.getContent())
        ))
                .collect(Collectors.joining("\n"));

        // 광장에 실제로 놓인 오브젝트와 감정 정보를 이미지 생성 AI가 한 장의 완성 이미지로 재해석하도록 지시합니다.
        return """
               완성된 감정 광장을 세련된 고해상도 일러스트 한 장으로 그려주세요.
               참여자들이 놓은 오브젝트들이 모여 만들어진 아늑한 방 또는 야외의 광장처럼 보여야 합니다.
               꾸며진 공간이 방 안에 있어야 하는 오브젝트가 많을 시에는 방으로 그려주시고, 야외에 있어야 하는 오브젝트가 많을 시에는 야외의 광장으로 그려주세요.
               한국 앱 "마음의 날씨"의 분위기를 유지해주세요: 따뜻하고, 조용하고, 시적이며, 부드러운 조명이 있는 장면.
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
               오브젝트와 감정 메모: %s
               """.formatted(
                       plaza.getTitle(),
                plaza.getTopic(),
                plaza.getBackgroundType(),
                plaza.getBackgroundColor() == null ? "none" : plaza.getBackgroundColor(),
                plaza.getBackgroundKey(),
                objects
                );
    }
    private String summarize(String content) {
        if (content == null || content.isBlank()) {
            return "";
        }
        String normalized = content.replaceAll("\\s+", "").trim();
        return normalized.length() > 80 ? normalized.substring(0, 80) + "..." : normalized;
    }
}
