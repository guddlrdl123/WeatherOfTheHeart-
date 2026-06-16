package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    // [수정] 크레딧 절약용 테스트 버전입니다.
    // 처음부터 30개를 넣으면 프롬프트가 길어지고 결과도 쉽게 뭉개질 수 있습니다.
    // 현재 광장 테스트가 12개 기준이므로 우선 12개까지만 이미지 생성 프롬프트에 반영합니다.
    private static final int MAX_OBJECTS_FOR_PROMPT = 12;

    // [수정] positionX/Y가 픽셀값으로 들어올 때 기준이 되는 광장 캔버스 크기입니다.
    // 프론트 광장 캔버스가 1024x768이 아니면 여기만 실제 크기에 맞게 바꾸면 됩니다.
    private static final double ASSUMED_CANVAS_WIDTH = 1024.0;
    private static final double ASSUMED_CANVAS_HEIGHT = 768.0;

    public String build(Plaza plaza, List<PlazaEntry> entries) {
        List<PlazaEntry> safeEntries = entries == null
                ? List.of()
                : entries.stream()
                .limit(MAX_OBJECTS_FOR_PROMPT)
                .collect(Collectors.toList());

        String objects = safeEntries.isEmpty()
                ? "A quiet empty emotional plaza with soft light."
                : safeEntries.stream()
                .map(entry -> String.format(
                        "- %s, rough placement: %s",
                        toEnglishObjectDescription(entry.getObjectKey()),
                        toPositionLabel(entry.getPositionX(), entry.getPositionY())
                ))
                .collect(Collectors.joining("\n"));

        String backgroundType = plaza == null ? "" : safe(plaza.getBackgroundType());
        String backgroundColor = plaza == null || plaza.getBackgroundColor() == null
                ? "none"
                : safe(plaza.getBackgroundColor());

        String backgroundWeather = plaza == null
                ? "soft emotional weather"
                : toWeatherPrompt(plaza.getBackgroundKey());

        // [수정] API 크레딧 절약용 초간단 프롬프트입니다.
        // 기존처럼 규칙을 많이 넣으면 AI가 오히려 장면을 과하게 재구성하거나,
        // 사용자가 놓은 오브젝트와 무관한 실내 소품을 추가하는 문제가 생겼습니다.
        //
        // [수정] plazaTitle, plazaTopic, totalFootprints는 일부러 제거했습니다.
        // 제목, 주제, 숫자가 프롬프트에 들어가면 이미지 안에 글자나 숫자 흔적이 생길 수 있습니다.
        // 이 정보들은 오른쪽 UI에서 이미 보여주므로 이미지 생성에는 넣지 않는 편이 안전합니다.
        //
        // [수정] 오브젝트는 "정확한 복사"가 아니라 "부드러운 감성 재해석"으로 유도합니다.
        // 이미지 AI는 좌표 기반 렌더러가 아니라 장면 재해석 모델이라서,
        // 너무 강하게 "무조건 그대로 그려라"라고 하면 오히려 결과가 망가질 수 있습니다.
        return """
                Create one warm hand-painted cozy plaza illustration for a Korean emotional memo app.

                Use the user's placed objects as the main inspiration.
                Keep their rough placement when possible.
                Do not create a completely unrelated room.
                Make it feel like a polished emotional version of the current plaza canvas.

                Style:
                soft pastel, warm light, calm, poetic, cozy, gentle, nostalgic.

                Background:
                type: %s
                color: %s
                weather mood: %s

                If weather type is used, show an open sky, soft air, simple ground, and gentle weather atmosphere.

                Objects:
                %s

                Keep the upper area open and airy.
                Place most objects in the lower and middle area.
                Avoid clutter and unclear merged shapes.

                No readable text, no letters, no numbers, no UI, no logo, no watermark.
                No people, no human faces.
                """.formatted(
                backgroundType,
                backgroundColor,
                backgroundWeather,
                objects
        );
    }

    private String toPositionLabel(Object xValue, Object yValue) {
        double x = toPercent(xValue, true);
        double y = toPercent(yValue, false);

        String vertical;
        if (y < 33) {
            vertical = "background";
        } else if (y < 66) {
            vertical = "middle ground";
        } else {
            vertical = "foreground";
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

        // 0.0 ~ 1.0 비율값으로 들어온 경우
        if (number >= 0 && number <= 1) {
            return number * 100.0;
        }

        // 0 ~ 100 퍼센트값으로 들어온 경우
        if (number >= 0 && number <= 100) {
            return number;
        }

        // 픽셀값으로 들어온 경우
        double assumedMax = xAxis ? ASSUMED_CANVAS_WIDTH : ASSUMED_CANVAS_HEIGHT;
        double percent = (number / assumedMax) * 100.0;

        if (percent < 0) {
            return 0;
        }

        return Math.min(percent, 100.0);
    }

    private String toWeatherPrompt(Object weatherKey) {
        String key = safe(weatherKey).toLowerCase(Locale.ROOT);

        return switch (key) {
            case "sunny", "clear", "맑음", "sun" -> "warm sunlight and clear soft air";
            case "cloudy", "cloud", "흐림", "구름" -> "soft cloudy light and muted air";
            case "rain", "rainy", "비" -> "gentle rainy atmosphere with soft reflections";
            case "snow", "snowy", "눈" -> "quiet snowy air and soft white light";
            case "night", "밤" -> "deep calm night light with small warm lamps";
            case "fog", "foggy", "안개" -> "misty air and quiet distant background";
            case "wind", "windy", "바람" -> "gentle breeze and softly moving plants";
            case "storm", "stormy", "폭풍" -> "dramatic but still comforting weather mood";
            default -> key.isBlank() ? "soft emotional weather" : key;
        };
    }

    private String toEnglishObjectDescription(Object objectKey) {
        String key = safe(objectKey).toLowerCase(Locale.ROOT);

        // [추가] 숫자가 붙은 오브젝트는 프롬프트에 숫자 이름을 직접 노출하지 않고 외형 묘사로 바꿉니다.
        // 예: 고양이1 -> cat one 이 아니라 cream-colored cat
        String compactKey = key.replaceAll("[\\s_\\-]", "");

        if (compactKey.equals("고양이1") || compactKey.equals("cat1")) {
            return "a small cozy cream-colored cat sitting calmly";
        }

        if (compactKey.equals("고양이2") || compactKey.equals("cat2")) {
            return "a small cozy gray-and-white cat resting quietly";
        }

        if (compactKey.equals("햄스터1") || compactKey.equals("hamster1")) {
            return "a small cozy cream and beige hamster sitting upright";
        }

        if (compactKey.equals("햄스터2") || compactKey.equals("hamster2")) {
            return "a small cozy warm-brown hamster crawling softly";
        }

        return switch (key) {
            // 동물
            case "수달", "otter" -> "a cute otter resting near a small water area";
            case "나비", "butterfly" -> "a small butterfly gently flying near flowers";
            case "새", "bird" -> "a small bird flying softly";
            case "누워 있는 강아지", "lying dog" -> "a relaxed dog lying down";
            case "앉아있는 강아지", "sitting dog" -> "a friendly sitting dog";
            case "앉아있는 갈색 강아지", "brown sitting dog" -> "a small brown sitting dog";
            case "앉아있는 고양이", "sitting cat" -> "a calm sitting cat";
            case "잠자는 고양이", "sleeping cat" -> "a curled sleeping cat";
            case "앉아있는 삼색 고양이", "calico cat" -> "a sitting calico cat";
            case "여우", "fox" -> "a quiet small fox";
            case "펭귄", "penguin" -> "a small cute penguin";
            case "레서판다", "lesser panda", "red panda" -> "a cute red panda with a fluffy tail";

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
            case "책 더미" -> "a small stack of books with blank covers";
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

            default -> "a small cozy object from the user's placed object library";
        };
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