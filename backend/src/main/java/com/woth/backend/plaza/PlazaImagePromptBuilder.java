package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    private static final int MAX_TOTAL_OBJECTS = 30;
    private static final int MAIN_OBJECT_LIMIT = 12;
    private static final int SUPPORTING_OBJECT_LIMIT = 12;

    public String build(Plaza plaza, List<PlazaEntry> entries) {
        List<PlazaEntry> safeEntries = entries == null
                ? List.of()
                : entries.stream()
                  .limit(MAX_TOTAL_OBJECTS)
                  .collect(Collectors.toList());

        List<PlazaEntry> mainEntries = safeEntries.stream()
                .limit(MAIN_OBJECT_LIMIT)
                .collect(Collectors.toList());

        List<PlazaEntry> supportingEntries = safeEntries.stream()
                .skip(MAIN_OBJECT_LIMIT)
                .limit(SUPPORTING_OBJECT_LIMIT)
                .collect(Collectors.toList());

        List<PlazaEntry> backgroundEntries = safeEntries.stream()
                .skip(MAIN_OBJECT_LIMIT + SUPPORTING_OBJECT_LIMIT)
                .collect(Collectors.toList());

        String mainObjects = buildObjectSection(
                mainEntries,
                PromptRole.MAIN,
                "- a cozy emotional plaza with a few clearly visible animals, furniture, plants, and lights"
        );

        String supportingObjects = buildObjectSection(
                supportingEntries,
                PromptRole.SUPPORTING,
                "- small cozy furniture, plants, lights, props, and soft decorations"
        );

        String backgroundDetails = buildObjectSection(
                backgroundEntries,
                PromptRole.BACKGROUND,
                "- subtle background plants, soft lighting, small blank decorations, and gentle plaza details"
        );

        String backgroundType = safe(plaza.getBackgroundType());
        String backgroundColor = plaza.getBackgroundColor() == null ? "none" : safe(plaza.getBackgroundColor());
        String backgroundWeather = toWeatherPrompt(plaza.getBackgroundKey());

        return """
                Create one finished high-resolution illustration for an emotional plaza scene.

                Core concept:
                This image is for a Korean emotional memo web app called "Weather of the Heart".
                The app turns quiet personal feelings into weather, objects, and a shared cozy plaza.
                The image should feel warm, quiet, poetic, soft, nostalgic, and emotionally safe.

                Important:
                This is not an inventory image.
                This is not a sticker sheet.
                This is not a UI screenshot.
                This must be one coherent place where objects naturally belong together.

                Scene direction:
                Create a cozy hybrid space between a private room and a small outdoor plaza.
                The scene may have indoor comfort, outdoor air, soft plants, gentle lights, and a peaceful open feeling.
                Make it look like a completed shared memory space made from many people's feelings.

                Visual style:
                Hand-painted cozy illustration.
                Soft pastel colors.
                Warm gentle lighting.
                Clean readable silhouettes.
                Gentle shadows.
                Calm Korean diary mood.
                No harsh contrast.
                No realistic photography.
                No 3D render.
                No anime character style.
                No comic panel style.

                Composition rules:
                Use foreground, middle ground, and background.
                Keep the scene visually organized.
                Avoid clutter.
                Avoid overlapping too many animals or props.
                Do not make every object equally large.
                Make only the main visible objects clearly recognizable.
                Supporting objects should be smaller and naturally placed.
                Background details should be subtle.
                It is acceptable if not every footprint object is fully visible.
                The goal is an emotionally coherent plaza, not exact object counting.

                Object placement rules:
                Each object has an approximate placement area based on the user's plaza layout.
                Follow the placement area as much as possible.
                If an object is marked as foreground left, place it near the lower-left area.
                If an object is marked as foreground center, place it near the lower-center area.
                If an object is marked as foreground right, place it near the lower-right area.
                If an object is marked as middle ground left, place it around the center-left area.
                If an object is marked as middle ground center, place it around the center area.
                If an object is marked as middle ground right, place it around the center-right area.
                If an object is marked as background left, place it near the upper-left or far-left background.
                If an object is marked as background center, place it near the upper-center or far background.
                If an object is marked as background right, place it near the upper-right or far-right background.
                Do not place all objects in the center.
                Do not randomly scatter objects.
                Keep the user's rough object layout while making the scene natural and beautiful.

                Main visible objects:
                %s

                Supporting objects:
                %s

                Background details:
                %s

                Weather and atmosphere:
                Background type: %s
                Background color: %s
                Background weather mood: %s
                Reflect the weather through the sky, window view, light, air, shadows, floor reflections, and overall atmosphere.
                Do not draw weather icons.
                Do not draw UI symbols.

                Plaza context:
                Plaza title, used only as emotional context: "%s"
                Plaza topic, used only as emotional context: "%s"
                Total user footprints, used only as emotional context: %d

                Absolute text and number ban:
                Do not write the plaza title in the image.
                Do not write the plaza topic in the image.
                Do not write user memos in the image.
                Do not write the total footprint number in the image.
                Do not include any readable text.
                Do not include any letters.
                Do not include Korean letters.
                Do not include English letters.
                Do not include numbers.
                Do not include symbols.
                Do not include punctuation marks.
                Do not include labels.
                Do not include captions.
                Do not include signs with text.
                Do not include logos.
                Do not include UI elements.
                Do not include watermarks.
                Do not include book titles.
                Do not include poster text.
                Do not include calendar numbers.
                Do not include clock numbers.
                Do not include mailbox text.
                Do not include street sign text.
                Do not include product labels.
                Do not include letter-like shapes.

                Blank surface rules:
                Posters must be blank or have only abstract shapes.
                Books must have blank covers and blank spines.
                Signs must be blank.
                Papers must be blank.
                Letters must be blank.
                Boards must be blank.
                Labels must be blank.
                Clocks must not show numbers.
                Calendars must not show numbers.
                Mailboxes must not show letters or numbers.
                If a surface needs detail, use only soft abstract marks that cannot be read as text, letters, numbers, or symbols.

                Human and privacy rules:
                Do not include people.
                Do not include human faces.
                Do not include usernames.
                Do not include profile images.
                Do not include any personal information.

                Final goal:
                A single beautiful emotional plaza illustration.
                It should look cozy, quiet, complete, and emotionally meaningful.
                The final image should feel like many small feelings have gathered into one gentle place.
                """.formatted(
                mainObjects,
                supportingObjects,
                backgroundDetails,
                backgroundType,
                backgroundColor,
                backgroundWeather,
                safe(plaza.getTitle()),
                safe(plaza.getTopic()),
                entries == null ? 0 : entries.size()
        );
    }

    private String buildObjectSection(List<PlazaEntry> entries, PromptRole role, String fallback) {
        if (entries == null || entries.isEmpty()) {
            return fallback;
        }

        return entries.stream()
                .map(entry -> toPromptLine(entry, role))
                .collect(Collectors.joining("\n"));
    }

    private String toPromptLine(PlazaEntry entry, PromptRole role) {
        String objectDescription = toEnglishObjectDescription(entry.getObjectKey());
        String positionLabel = toPositionLabel(entry.getPositionX(), entry.getPositionY());
        String moodPrompt = toMoodPrompt(entry.getMoodKey());
        String weatherPrompt = toWeatherPrompt(entry.getWeatherKey());

        return switch (role) {
            case MAIN -> String.format(
                    "- %s. Approximate user placement: %s. Keep this object near that area. Make it clearly recognizable. Emotional mood: %s. Weather feeling: %s.",
                    objectDescription,
                    positionLabel,
                    moodPrompt,
                    weatherPrompt
            );

            case SUPPORTING -> String.format(
                    "- %s. Approximate user placement: %s. Keep it as a smaller supporting detail near that area. Emotional mood: %s.",
                    objectDescription,
                    positionLabel,
                    moodPrompt
            );

            case BACKGROUND -> String.format(
                    "- %s. Approximate user placement: %s. Use it only as a subtle background detail near that area. Do not make it large.",
                    objectDescription,
                    positionLabel
            );
        };
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
            if (value instanceof Number num) {
                number = num.doubleValue();
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

        // positionX/Y가 픽셀값으로 들어오는 경우를 위한 대략적인 보정값입니다.
        // 실제 광장 캔버스 크기가 다르면 이 값은 프론트 기준에 맞춰 바꾸면 됩니다.
        double assumedMax = xAxis ? 1024.0 : 768.0;
        double percent = (number / assumedMax) * 100.0;

        if (percent < 0) {
            return 0;
        }

        return Math.min(percent, 100.0);
    }

    private String toMoodPrompt(Object moodKey) {
        String key = safe(moodKey).toLowerCase(Locale.ROOT);

        return switch (key) {
            case "happy", "joy", "기쁨", "행복" -> "gentle happiness";
            case "sad", "sadness", "슬픔", "우울" -> "quiet sadness with comfort";
            case "angry", "anger", "화남", "분노" -> "softly released tension";
            case "anxious", "anxiety", "불안" -> "calm and reassuring";
            case "lonely", "loneliness", "외로움" -> "lonely but warm";
            case "tired", "피곤", "지침" -> "tired but resting";
            case "peaceful", "calm", "평온", "차분" -> "peaceful and calm";
            case "excited", "설렘" -> "quiet excitement";
            case "empty", "허무" -> "empty but gentle";
            default -> key.isBlank() ? "quiet and calm" : key;
        };
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

        return switch (key) {
            // 동물
            case "수달", "otter" -> "a cute otter resting near a small water area";
            case "나비", "butterfly" -> "a small butterfly gently flying near flowers";
            case "새", "bird" -> "a small bird perched quietly on a branch";
            case "누워 있는 강아지", "lying dog" -> "a relaxed dog lying down on the floor";
            case "앉아있는 강아지", "sitting dog" -> "a friendly sitting dog";
            case "앉아있는 갈색 강아지", "brown sitting dog" -> "a small brown sitting dog";
            case "앉아있는 고양이", "sitting cat" -> "a calm sitting cat";
            case "잠자는 고양이", "sleeping cat" -> "a curled sleeping cat";
            case "앉아있는 삼색 고양이", "calico cat" -> "a sitting calico cat";
            case "여우", "fox" -> "a quiet small fox";
            case "펭귄", "penguin" -> "a small cute penguin";

            // 가구
            case "사이드 테이블" -> "a small side table";
            case "등받이 의자" -> "a cozy chair with a backrest";
            case "바구니 거치대" -> "a small basket stand";
            case "벤치" -> "a warm wooden bench";
            case "책장" -> "a cozy bookshelf with completely blank book spines";
            case "싱글 침대" -> "a simple single bed with soft bedding";
            case "벽 선반" -> "a simple wall shelf with small blank decorations";
            case "수납 상자" -> "a small storage box with no label";
            case "서랍장" -> "a warm wooden drawer cabinet";
            case "낮은 테이블" -> "a low wooden table";
            case "협탁" -> "a small bedside table";
            case "미니 냉장고" -> "a small mini refrigerator with no logo, no letters, and no numbers";
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
            case "벽걸이 수경재배 병" -> "a wall-mounted hydroponic glass bottle with no label";
            case "벽걸이 아이비 화분" -> "a wall-mounted ivy plant";
            case "물뿌리개" -> "a small watering can with no letters or numbers";
            case "꽃밭" -> "a small flower bed";
            case "벚나무 화분" -> "a small cherry blossom tree in a pot";
            case "씨앗 봉투" -> "small completely blank seed packets with no letters, no numbers, and no symbols";
            case "눈덮인 소나무 화분" -> "a small snow-covered pine tree in a pot";
            case "회색 화분" -> "a calm gray plant pot";
            case "식물 테이블" -> "a small table filled with potted plants";
            case "꽃아치" -> "a soft flower arch";
            case "꽃 수레" -> "a small flower cart with no sign and no text";
            case "온실" -> "a tiny cozy greenhouse";

            // 패브릭
            case "파란 러너 카펫" -> "a blue runner carpet like a small stream";
            case "쿠션" -> "a soft cushion";
            case "접힌 담요" -> "a neatly folded blanket";
            case "긴 쿠션" -> "a long soft cushion";
            case "타원형 카펫" -> "an oval carpet";
            case "패치워크 카펫" -> "a patchwork carpet with abstract shapes only";
            case "베개" -> "a soft pillow";
            case "직사각형 카펫" -> "a rectangular carpet";
            case "둥근 쿠션" -> "a round cushion";
            case "둥근 러그" -> "a soft round rug";
            case "로즈 카펫" -> "a rose-toned carpet";
            case "세이지 카펫" -> "a calm sage-colored carpet";

            // 소품
            case "달 포스터" -> "a moon poster with no readable text, no letters, and no numbers";
            case "별 가랜드" -> "a small star garland";
            case "구겨진 캔", "구겨진 캔2" -> "a crumpled empty can with no label";
            case "커피 컵" -> "a small coffee cup with no logo, no letters, and no numbers";
            case "작은 쓰레기 더미", "쓰레기 더미", "쓰레기" -> "a tiny pile of harmless clutter";
            case "알람 시계" -> "a small alarm clock with no numbers, no letters, and blank clock face";
            case "풍선 다발" -> "a small bunch of balloons";
            case "나무통" -> "a small wooden barrel";
            case "나란히 꽃힌 책" -> "several books with completely blank spines";
            case "책 더미" -> "a small stack of books with completely blank covers";
            case "도자기 머그컵" -> "a ceramic mug with no logo, no letters, and no numbers";
            case "토분" -> "a small clay pot";
            case "과자 봉지" -> "a small snack bag with no text, no letters, no numbers, and no logo";
            case "사진 스티커" -> "small photo stickers with no faces, no text, no letters, and no numbers";
            case "실내 슬리퍼" -> "a pair of indoor slippers";
            case "노트북" -> "a closed laptop with no logo, no letters, and no numbers";
            case "미니 액자" -> "a tiny picture frame with no readable text";
            case "종이 비행기" -> "a small blank paper airplane with no writing";
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
            case "표지판" -> "a completely blank sign with no text, no letters, no numbers, and no symbols";
            case "하늘 퍼즐 조각" -> "a small sky-colored puzzle piece with no letters or numbers";
            case "유리병 편지" -> "a glass bottle with a completely blank letter inside";
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
            case "공사 표지판" -> "a completely blank construction sign with no text, no letters, no numbers, and no symbols";
            case "위험 구역 표지판" -> "a completely blank warning sign with no text, no letters, no numbers, and no symbols";
            case "잔디 출입 금지 표지판" -> "a completely blank grass protection sign with no text, no letters, no numbers, and no symbols";
            case "마켓 표지판" -> "a completely blank market sign with no text, no letters, no numbers, and no symbols";
            case "출입 금지 표지판" -> "a completely blank no-entry sign with no text, no letters, no numbers, and no symbols";
            case "쓰레기 투기 금지 표지판" -> "a completely blank anti-littering sign with no text, no letters, no numbers, and no symbols";
            case "게시판" -> "a completely blank notice board with no readable text, no letters, no numbers, and no symbols";
            case "공용 쓰테기통", "공용 쓰레기통" -> "a public trash bin with no text, no letters, and no numbers";
            case "그늘막 우산" -> "a shade umbrella";
            case "미끄럼 주의 표지판" -> "a completely blank slippery-floor sign with no text, no letters, no numbers, and no symbols";
            case "우물" -> "a small old well";
            case "돌 표지석" -> "a completely blank stone marker with no text, no letters, and no numbers";
            case "찻상" -> "a small tea table";
            case "철망 쓰레기통" -> "a wire mesh trash bin with no label";
            case "나무 상자" -> "a wooden crate with no letters or numbers";
            case "나무 울타리" -> "a small wooden fence";
            case "첫집 가판대", "찻집 가판대" -> "a small cozy tea stall with no text, no letters, no numbers, and no sign";
            case "우산꽂이" -> "an umbrella stand";
            case "간판" -> "a completely blank shop sign with no text, no letters, no numbers, and no symbols";
            case "공용 테이블" -> "a shared outdoor table";
            case "꽃잎 수거함" -> "a small petal collection bin with no text, no letters, and no numbers";
            case "나무 데크 조각" -> "a small wooden deck piece";
            case "등대" -> "a small lighthouse with no markings";
            case "우체통" -> "a small mailbox with no text, no letters, and no numbers";
            case "벙어리장갑 표지판" -> "a completely blank mitten-shaped sign with no text, no letters, no numbers, and no symbols";
            case "달 벤치" -> "a crescent moon-shaped bench";
            case "달 분수" -> "a crescent moon fountain";
            case "벚꽃 피크닉 테이블" -> "a cherry blossom picnic table";
            case "피크닉 테이블" -> "a picnic table";
            case "모래성" -> "a small sandcastle";
            case "조개껍데기" -> "small seashells";
            case "해초" -> "small seaweed decorations";
            case "이정표" -> "a completely blank direction sign with no text, no letters, no numbers, and no symbols";
            case "불가사리" -> "a small starfish";
            case "벚꽃 디딤돌" -> "cherry blossom stepping stones";
            case "비 오는 날 디딤돌" -> "rainy day stepping stones";
            case "벚꽃 찻수레" -> "a cherry blossom tea cart with no text, no letters, no numbers, and no sign";
            case "노란 찻수레" -> "a yellow tea cart with no text, no letters, no numbers, and no sign";
            case "벤치 2" -> "a second warm wooden bench";
            case "눈 덮인 벤치" -> "a snow-covered bench";
            case "천 표지판" -> "a completely blank fabric sign with no text, no letters, no numbers, and no symbols";
            case "코코아 가판대" -> "a cozy cocoa stand with no text, no letters, no numbers, and no sign";
            case "별자리 표지만", "별자리 표지판" -> "a completely blank constellation sign with no text, no letters, no numbers, and no symbols";
            case "산호" -> "a small coral decoration";
            case "배수구" -> "a small drain cover";
            case "유목" -> "a piece of driftwood";
            case "분수대" -> "a small fountain";
            case "과일 가판대" -> "a fruit stand with no text, no letters, no numbers, and no sign";
            case "대문" -> "a small gate";
            case "얼음 디딤돌" -> "shiny ice stepping stones";
            case "구멍 튜브" -> "a small swimming tube with no letters, no numbers, and no pattern that looks like text";

            default -> "a small cozy object with no text, no letters, no numbers, and no symbols";
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

    private enum PromptRole {
        MAIN,
        SUPPORTING,
        BACKGROUND
    }
}