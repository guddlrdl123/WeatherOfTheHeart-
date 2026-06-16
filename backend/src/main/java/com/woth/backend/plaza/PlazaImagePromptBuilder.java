package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    // [보완] 너무 많은 오브젝트를 한 번에 넣으면 이미지가 뭉개질 수 있어서 최대 30개까지만 사용합니다.
    private static final int MAX_OBJECTS_FOR_PROMPT = 30;

    // [보완] 프론트 광장 캔버스 기준입니다.
    // 실제 광장 캔버스 크기가 1024x768이 아니면 이 값만 바꾸면 됩니다.
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
                        toMoodPrompt(entry.getMoodKey()),
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
        String backgroundMood = plaza == null
                ? "soft emotional atmosphere"
                : toWeatherPrompt(plaza.getBackgroundKey());

        // [보완] 원본 프롬프트의 장점인 "자연스러운 감성 재해석"은 유지하고,
        //        한국어 프롬프트를 영어로 바꿨습니다.
        //
        // [보완] plaza title/topic/footprint count는 넣지 않았습니다.
        //        테스트 제목이 123123처럼 숫자로 들어가면 이미지 안에 숫자나 글자 흔적이 생길 수 있습니다.
        //
        // [보완] 오브젝트별 weatherKey는 제거했습니다.
        //        여러 사용자의 날씨가 섞이면 비, 눈, 맑음, 밤 분위기가 충돌해서 장면이 산만해질 수 있습니다.
        //        전체 배경 날씨는 plaza.getBackgroundKey() 하나만 사용합니다.
        //
        // [보완] position=(x,y) 숫자 좌표는 roughPosition으로 변환했습니다.
        //        숫자 좌표는 이미지 AI가 정확히 따르기 어렵고, 숫자 흔적이 생길 위험도 있습니다.
        //
        // [보완] 너무 강한 "반드시 전부 그려라", "절대 추가하지 마라"는 문장은 넣지 않았습니다.
        //        이전 테스트처럼 AI가 오히려 장면을 이상하게 재구성할 수 있기 때문입니다.
        //
        // [보완] 다만 표지판, 책, 포스터, 라벨에 글자가 생기는 문제를 줄이기 위해
        //        "flat surfaces should be blank" 정도의 최소 제한만 남겼습니다.
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

               Object direction:
               The placed objects should be the emotional center of the image.
               Avoid adding large unrelated focal objects.
               Simple background elements such as floor, wall, sky, ground, soft light, shadow, and atmosphere are okay.
               Keep small animals and small props visually separated enough so they do not merge into unclear shapes.

               Text safety:
               Do not include people, human faces, usernames, logos, UI, captions, or watermarks.
               Do not include readable text, Korean letters, English letters, numbers, symbols, labels, book titles, poster text, or letter-like marks.
               If signs, books, posters, papers, bottles, packages, labels, boards, or flat surfaces appear, keep them blank or abstract and unreadable.

               Background type: %s
               Background color: %s
               Background mood: %s

               Placed objects and emotional notes:
               %s
               """.formatted(
                backgroundType,
                backgroundColor,
                backgroundMood,
                objects
        );
    }

    private String summarize(String content) {
        if (content == null || content.isBlank()) {
            return "quiet feeling";
        }

        String normalized = content.replaceAll("\\s+", " ").trim();

        // [보완] 테스트 메모가 123123처럼 숫자만 들어오면 이미지 안에 숫자 흔적이 생길 수 있어서 제거합니다.
        normalized = normalized
                .replaceAll("[A-Za-z0-9]", "")
                .replaceAll("\\s+", " ")
                .trim();

        // [보완] 실제 감정 문장을 그대로 프롬프트에 길게 넣으면 장면보다 텍스트 의미가 강해질 수 있습니다.
        //        지금은 테스트 안정성을 위해 "짧은 개인 감정 메모" 정도로만 전달합니다.
        if (normalized.isBlank()) {
            return "quiet feeling";
        }

        return "short personal feeling";
    }

    private String toPromptObjectName(Object objectKey) {
        String key = safe(objectKey);
        String compactKey = key.replaceAll("[\\s_\\-]", "").toLowerCase(Locale.ROOT);

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

        if (compactKey.equals("레서판다") || compactKey.equals("redpanda") || compactKey.equals("lesserpanda")) {
            return "a cute red panda with a fluffy tail";
        }

        return switch (key) {
            // 동물
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

            // 가구
            case "사이드 테이블" -> "a small side table";
            case "등받이 의자" -> "a cozy chair with a backrest";
            case "바구니 거치대" -> "a small basket stand";
            case "벤치" -> "a warm wooden bench";
            case "책장" -> "a cozy bookshelf with blank book spines";
            case "싱글 침대" -> "a simple single bed with soft bedding";
            case "벽 선반" -> "a simple wall shelf with small blank decorations";
            case "수납 상자" -> "a small storage box with no label";
            case "서랍장" -> "a warm wooden drawer cabinet";
            case "낮은 테이블" -> "a low wooden table";
            case "협탁" -> "a small bedside table";
            case "미니 냉장고" -> "a small mini refrigerator with no logo";
            case "원형 테이블1", "원형 테이블2", "원형 테이블3" -> "a small round wooden table";
            case "작은 서랍장" -> "a small drawer cabinet";
            case "수납 바구니" -> "a woven storage basket";
            case "책상" -> "a simple wooden desk";
            case "옷장" -> "a cozy wooden wardrobe";
            case "흰색 스툴" -> "a small white stool";
            case "나무 스툴" -> "a small wooden stool";
            case "구름 소파" -> "a soft cloud-shaped sofa";

            // 조명
            case "스탠드 조명1", "스탠드 조명2" -> "a warm standing floor lamp";
            case "석등" -> "a quiet stone lantern";
            case "테이블 조명" -> "a cozy table lamp";
            case "종이 랜턴" -> "a warm paper lantern";
            case "별 랜턴" -> "a small star-shaped lantern";
            case "가로등", "가로등2", "가로등3" -> "a gentle plaza street lamp";
            case "촛대" -> "a small candle holder";
            case "회색 랜턴" -> "a calm gray lantern";
            case "푸른 랜턴" -> "a calm blue lantern";
            case "랜턴 기둥" -> "a lantern post";
            case "눈 덮인 석등" -> "a snow-covered stone lantern";

            // 식물
            case "넓은 잎 화분" -> "a potted plant with broad green leaves";
            case "덤불" -> "a soft round bush";
            case "선인장 화분" -> "a small cactus pot";
            case "클로버 꽃밭" -> "a small clover flower patch";
            case "데이지 화분" -> "a daisy flower pot";
            case "떡갈잎 고목나무 화분" -> "an old oak-leaf tree in a pot";
            case "꽃" -> "small soft flowers";
            case "화분", "화분2" -> "a small potted plant";
            case "정원 아치" -> "a garden arch covered with plants";
            case "잔디 뭉치" -> "a small patch of grass";
            case "행잉 고사리 화분" -> "a hanging fern plant";
            case "라벤더 꽃병" -> "a small vase of lavender";
            case "긴 바닥 화분" -> "a long floor planter";
            case "벽걸이 화분", "벽걸이 화분( 현재 오타 수정 해야함 )" -> "a wall-mounted plant pot";
            case "억새" -> "soft silver grass moving gently";
            case "플랜터 박스" -> "a wooden planter box";
            case "선반 화분" -> "a small potted plant on a shelf";
            case "작은 꽃병" -> "a tiny flower vase";
            case "산세베이라 화분" -> "a snake plant in a pot";
            case "몬스테라 화분" -> "a monstera plant in a pot";
            case "아이비 화분" -> "an ivy plant in a pot";
            case "나무" -> "a small gentle tree";
            case "튤립 화분" -> "a tulip flower pot";
            case "벽걸이 수경재배 병" -> "a wall-mounted hydroponic glass bottle";
            case "벽걸이 아이비 화분" -> "a wall-mounted ivy plant";
            case "물뿌리개" -> "a small watering can";
            case "꽃밭" -> "a small flower bed";
            case "벚나무 화분" -> "a small cherry blossom tree in a pot";
            case "씨앗 봉투" -> "small blank seed packets";
            case "눈덮인 소나무 화분" -> "a small snow-covered pine tree in a pot";
            case "회색 화분" -> "a calm gray plant pot";
            case "식물 테이블" -> "a small table filled with potted plants";
            case "꽃아치" -> "a soft flower arch";
            case "꽃 수레" -> "a small flower cart";
            case "온실" -> "a tiny cozy greenhouse";

            // 패브릭
            case "파란 러너 카펫" -> "a blue runner carpet like a small stream";
            case "쿠션" -> "a soft cushion";
            case "접힌 담요" -> "a neatly folded blanket";
            case "긴 쿠션" -> "a long soft cushion";
            case "타원형 카펫" -> "an oval carpet";
            case "패치워크 카펫" -> "a patchwork carpet with abstract shapes";
            case "베개" -> "a soft pillow";
            case "직사각형 카펫" -> "a rectangular carpet";
            case "둥근 쿠션" -> "a round cushion";
            case "둥근 러그" -> "a soft round rug";
            case "로즈 카펫" -> "a rose-toned carpet";
            case "세이지 카펫" -> "a calm sage-colored carpet";

            // 소품
            case "달 포스터" -> "a moon poster with no text";
            case "별 가랜드" -> "a small star garland";
            case "구겨진 캔", "구겨진 캔2" -> "a crumpled empty can with no label";
            case "커피 컵" -> "a small coffee cup with no logo";
            case "작은 쓰레기 더미", "쓰레기 더미", "쓰레기" -> "a tiny pile of harmless clutter";
            case "알람 시계" -> "a small alarm clock with a blank face";
            case "풍선 다발" -> "a small bunch of balloons";
            case "나무통" -> "a small wooden barrel";
            case "나란히 꽃힌 책" -> "several books with blank spines";
            case "책 더미" -> "a small stack of blank books";
            case "도자기 머그컵" -> "a ceramic mug with no logo";
            case "토분" -> "a small clay pot";
            case "과자 봉지" -> "a small snack bag with no label";
            case "사진 스티커" -> "small photo stickers with no faces";
            case "실내 슬리퍼" -> "a pair of indoor slippers";
            case "노트북" -> "a closed laptop with no logo";
            case "미니 액자" -> "a tiny picture frame with no text";
            case "종이 비행기" -> "a small blank paper airplane";
            case "연필꽂이" -> "a pencil holder with simple pencils";
            case "토끼인형" -> "a soft rabbit plush toy";
            case "물웅덩이" -> "a small puddle of water";
            case "작은 쓰레기통" -> "a small trash bin with no label";
            case "전신 거울" -> "a full-length mirror with no reflection of people";
            case "망원경" -> "a small telescope";
            case "소라게 껍질" -> "a small hermit crab shell";
            case "열쇠 보관함" -> "a small key holder with no labels";
            case "접시 트레이" -> "a small plate tray";
            case "파도조각 오브제" -> "a small wave-shaped decorative object";
            case "표지판" -> "a blank sign with no text";
            case "하늘 퍼즐 조각" -> "a small sky-colored puzzle piece";
            case "유리병 편지" -> "a glass bottle with a blank letter inside";
            case "우비 걸이" -> "a small raincoat hanger";
            case "선풍기" -> "a small fan with no logo";

            // 음식
            case "빵 간식" -> "small bread snacks";
            case "꽃모양 사탕병" -> "a jar of flower-shaped candies with no label";
            case "젬 바구니", "잼 바구니" -> "a small basket of jam jars with no labels";
            case "토스트" -> "a plate of warm toast";
            case "피크닉 바구니" -> "a cozy picnic basket";
            case "수박" -> "a slice of watermelon";
            case "빙수" -> "a bowl of shaved ice";
            case "녹차 빙수" -> "a bowl of green tea shaved ice";
            case "망고 빙수" -> "a bowl of mango shaved ice";

            // 야외
            case "공사 표지판" -> "a blank construction sign with no text";
            case "위험 구역 표지판" -> "a blank warning sign with no text";
            case "잔디 출입 금지 표지판" -> "a blank grass protection sign with no text";
            case "마켓 표지판" -> "a blank market sign with no text";
            case "출입 금지 표지판" -> "a blank no-entry sign with no text";
            case "쓰레기 투기 금지 표지판" -> "a blank anti-littering sign with no text";
            case "게시판" -> "a blank notice board with no text";
            case "공용 쓰테기통", "공용 쓰레기통" -> "a public trash bin with no text";
            case "그늘막 우산" -> "a shade umbrella";
            case "미끄럼 주의 표지판" -> "a blank slippery-floor sign with no text";
            case "우물" -> "a small old well";
            case "돌 표지석" -> "a blank stone marker with no text";
            case "찻상" -> "a small tea table";
            case "철망 쓰레기통" -> "a wire mesh trash bin with no label";
            case "나무 상자" -> "a wooden crate";
            case "나무 울타리" -> "a small wooden fence";
            case "첫집 가판대", "찻집 가판대" -> "a small cozy tea stall with no text";
            case "우산꽂이" -> "an umbrella stand";
            case "간판" -> "a blank shop sign with no text";
            case "공용 테이블" -> "a shared outdoor table";
            case "꽃잎 수거함" -> "a small petal collection bin with no text";
            case "나무 데크 조각" -> "a small wooden deck piece";
            case "등대" -> "a small lighthouse with no markings";
            case "우체통" -> "a small mailbox with no text";
            case "벙어리장갑 표지판" -> "a blank mitten-shaped sign with no text";
            case "달 벤치" -> "a crescent moon-shaped bench";
            case "달 분수" -> "a crescent moon fountain";
            case "벚꽃 피크닉 테이블" -> "a cherry blossom picnic table";
            case "피크닉 테이블" -> "a picnic table";
            case "모래성" -> "a small sandcastle";
            case "조개껍데기" -> "small seashells";
            case "해초" -> "small seaweed decorations";
            case "이정표" -> "a blank direction sign with no text";
            case "불가사리" -> "a small starfish";
            case "벚꽃 디딤돌" -> "cherry blossom stepping stones";
            case "비 오는 날 디딤돌" -> "rainy day stepping stones";
            case "벚꽃 찻수레" -> "a cherry blossom tea cart with no text";
            case "노란 찻수레" -> "a yellow tea cart with no text";
            case "벤치 2" -> "a second warm wooden bench";
            case "눈 덮인 벤치" -> "a snow-covered bench";
            case "천 표지판" -> "a blank fabric sign with no text";
            case "코코아 가판대" -> "a cozy cocoa stand with no text";
            case "별자리 표지만", "별자리 표지판" -> "a blank constellation sign with no text";
            case "산호" -> "a small coral decoration";
            case "배수구" -> "a small drain cover";
            case "유목" -> "a piece of driftwood";
            case "분수대" -> "a small fountain";
            case "과일 가판대" -> "a fruit stand with no text";
            case "대문" -> "a small gate";
            case "얼음 디딤돌" -> "shiny ice stepping stones";
            case "구멍 튜브" -> "a small swimming tube with no text";

            // [보완] 알 수 없는 objectKey는 그대로 프롬프트에 넣지 않습니다.
            //        key에 숫자, 한글, 기호가 섞여 있으면 이미지에 글자처럼 반영될 수 있기 때문입니다.
            default -> "a small cozy object from the user's placed object library";
        };
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