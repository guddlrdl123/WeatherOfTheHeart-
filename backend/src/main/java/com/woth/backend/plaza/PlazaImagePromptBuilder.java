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
               Create a polished, high-resolution illustration of a completed stared emotional
               plaza.
               the image should feel like a cozy isometric room/plaza scene made from the
               participants' objects.
               Preserve the mood of the Korean app "Weather of the Heart": warm, quiet, poetic,
               soft lighting, no readable text.
               Do not include usernames, faces, logos, UI, captions, watermarks, or text
               Plaza title: %s
               Plaza topic: %s
               Background type: %s
               Background color: %s
               Background weather key: %s
               Objects and emotional notes: %s
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

