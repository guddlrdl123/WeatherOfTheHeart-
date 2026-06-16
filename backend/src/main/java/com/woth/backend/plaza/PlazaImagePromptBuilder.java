package com.woth.backend.plaza;

import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Component
public class PlazaImagePromptBuilder {

    private static final int MAX_TOTAL_OBJECTS = 30;

    // [수정] 오브젝트가 12개 이하이면 전부 필수 오브젝트로 처리합니다.
//        지금처럼 광장에 12개를 직접 배치한 경우,
//        AI가 하나라도 임의로 생략하거나 다른 물건으로 대체하지 않게 하기 위한 기준입니다.
    private static final int STRICT_LAYOUT_OBJECT_LIMIT = 12;

    // [수정] 오브젝트가 13개 이상일 때만 대표 오브젝트를 제한합니다.
//        30개 전체를 모두 크게 그리라고 하면 뭉개짐이 심해지기 때문입니다.
    private static final int MAX_MAIN_VISIBLE_OBJECTS_WHEN_MANY = 10;

    private static final int MAX_SUPPORTING_OBJECTS = 10;

    // [유지] 프론트 광장 캔버스 크기와 맞춰야 합니다.
//        현재 캔버스가 1024x768이 아니면 여기 값을 실제 광장 캔버스 크기로 바꾸세요.
    private static final double ASSUMED_CANVAS_WIDTH = 1024.0;
    private static final double ASSUMED_CANVAS_HEIGHT = 768.0;

    public String build(Plaza plaza, List<PlazaEntry> entries) {
        List<PlazaEntry> safeEntries = entries == null
                ? List.of()
                : entries.stream()
                .limit(MAX_TOTAL_OBJECTS)
                .collect(Collectors.toList());

        // [추가] 오브젝트가 12개 이하이면 "엄격한 배치 재구성 모드"로 처리합니다.
        //        지금 문제처럼 사용자가 12개 PNG를 직접 배치한 상황에서는
        //        AI가 새 방을 창작하지 말고, 기존 오브젝트 캔버스를 완성 이미지처럼 다듬어야 합니다.
        boolean strictLayoutMode = !safeEntries.isEmpty()
                && safeEntries.size() <= STRICT_LAYOUT_OBJECT_LIMIT;

        int mainObjectLimit = strictLayoutMode
                ? safeEntries.size()
                : MAX_MAIN_VISIBLE_OBJECTS_WHEN_MANY;

        List<PlazaEntry> mainEntries = safeEntries.stream()
                .limit(mainObjectLimit)
                .collect(Collectors.toList());

        List<PlazaEntry> supportingEntries = strictLayoutMode
                ? List.of()
                : safeEntries.stream()
                .skip(mainObjectLimit)
                .limit(MAX_SUPPORTING_OBJECTS)
                .collect(Collectors.toList());

        List<PlazaEntry> backgroundEntries = strictLayoutMode
                ? List.of()
                : safeEntries.stream()
                .skip(mainObjectLimit + MAX_SUPPORTING_OBJECTS)
                .collect(Collectors.toList());

        String mainObjects = buildObjectSection(
                mainEntries,
                strictLayoutMode ? PromptRole.MANDATORY : PromptRole.MAIN,
                "None. No footprint objects are provided. Do not add intentional objects."
        );

        String supportingObjects = buildObjectSection(
                supportingEntries,
                PromptRole.SUPPORTING,
                strictLayoutMode
                        ? "None. Strict layout mode is active. Do not add supporting footprint objects."
                        : "None. Do not add extra supporting footprint objects."
        );

        String backgroundDetails = buildObjectSection(
                backgroundEntries,
                PromptRole.BACKGROUND,
                strictLayoutMode
                        ? "None. Strict layout mode is active. Do not add background footprint objects."
                        : "None. Do not add extra background footprint objects."
        );

        String backgroundType = plaza == null ? "" : safe(plaza.getBackgroundType());
        String backgroundColor = plaza == null || plaza.getBackgroundColor() == null
                ? "none"
                : safe(plaza.getBackgroundColor());
        String backgroundWeather = plaza == null
                ? "soft emotional weather"
                : toWeatherPrompt(plaza.getBackgroundKey());

        String sceneStructure = toSceneStructurePrompt(backgroundType);

        // [수정] 제목, 주제, 발자취 숫자는 프롬프트에서 제거했습니다.
        //        이유: 이미지 안에 글자나 숫자 비슷한 흔적이 생기는 원인이 될 수 있습니다.
        //        화면 UI에는 그대로 표시하고, 이미지 생성에는 넘기지 않는 편이 안전합니다.

        // [수정] strictLayoutMode일 때는 "새로운 감성 방을 창작"하는 프롬프트가 아니라
        //        "사용자가 배치한 오브젝트 캔버스를 완성 일러스트로 재해석"하는 프롬프트를 사용합니다.
        //        이전 결과처럼 라디오, 기타, 화로 같은 엉뚱한 오브젝트가 추가되는 문제를 줄이기 위한 수정입니다.
        String layoutModeRule = strictLayoutMode
                ? """
              Strict placed-object reconstruction mode:
              The listed mandatory objects are the user's actual placed plaza objects.
              Include every mandatory object.
              Do not omit any mandatory object.
              Do not replace mandatory objects with unrelated objects.
              Do not transform animals into furniture or props.
              Do not transform props into unrelated indoor objects.
              The final image should look like a polished illustration based on the user's existing object canvas.
              Do not redesign the scene into a completely different room.
              """
                : """
              Atmospheric plaza summary mode:
              There are many footprint objects.
              Make the main visible objects recognizable.
              Supporting objects may be smaller.
              Background details may be subtle.
              The goal is a coherent emotional plaza, not a perfect inventory image.
              """;

        return """
            Create one finished high-resolution illustration based on the user's placed-object plaza canvas.

            Core concept:
            This image is for a Korean emotional memo web app called "Weather of the Heart".
            The app turns quiet personal feelings into weather, objects, and a shared cozy plaza.
            The image should feel warm, quiet, poetic, soft, nostalgic, and emotionally safe.

            Most important direction:
            Do not create a new unrelated room scene.
            Do not ignore the user's placed objects.
            Reinterpret the user's existing object layout as a polished cozy illustration.
            Keep the same rough object placement and object identity.
            The result should feel like a cleaned-up final illustration of the current plaza canvas.

            Scene structure:
            %s

            Layout mode:
            %s

            Camera and layout:
            Use a wide landscape composition.
            Use a gentle front-facing plaza view with slight depth.
            Preserve the feeling of a broad canvas with sky or open background above and object area below.
            Keep the main objects fully visible.
            Do not crop the main objects.
            Keep enough breathing space between objects.

            Object count rule:
            Use only the listed footprint objects as intentional placed objects.
            Do not invent extra animals.
            Do not invent extra furniture.
            Do not invent extra plants.
            Do not invent extra props.
            Do not invent extra food.
            Do not invent extra signs.
            Do not invent extra books.
            Do not invent extra posters.
            Do not invent extra boards.
            Do not invent extra letters.
            Do not add unrelated indoor objects such as a radio, guitar, fireplace, pumpkin, open book, table, cup, or basket unless that exact object is listed below.
            The environment may include only simple structural and atmospheric elements such as sky, clouds, horizon, ground, floor plane, wall plane, soft light, shadow, air, rain, snow, mist, and weather atmosphere.

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

            Object clarity rules:
            Keep animals separated enough so they do not merge into each other.
            Keep furniture and props separated enough so they do not become one melted shape.
            Do not merge multiple objects into one unclear blob.
            Prefer simple readable silhouettes over excessive detail.
            Each mandatory object should have a clear recognizable shape.
            If an object is small in the layout, keep it small but still recognizable.

            Object placement rules:
            Each object has an approximate placement area based on the user's plaza layout.
            Follow the placement area as much as possible.
            foreground left means lower-left area.
            foreground center means lower-center area.
            foreground right means lower-right area.
            middle ground left means center-left area.
            middle ground center means center area.
            middle ground right means center-right area.
            background left means upper-left or far-left background.
            background center means upper-center or far background.
            background right means upper-right or far-right background.
            Do not place all objects in the center.
            Do not randomly scatter objects.
            Keep the user's rough layout while making the scene natural and beautiful.

            Mandatory main objects:
            %s

            Supporting objects:
            %s

            Background footprint details:
            %s

            Weather and atmosphere:
            Background type: %s
            Background color: %s
            Background weather mood: %s
            Reflect the weather through the sky, light, air, shadows, floor reflections, and overall atmosphere.
            Do not draw weather icons.
            Do not draw UI symbols.

            Absolute text and number ban:
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
            If any flat surface appears, keep it blank.
            If a listed object has a surface, keep the surface blank or use only soft abstract marks that cannot be read as text, letters, numbers, or symbols.

            Human and privacy rules:
            Do not include people.
            Do not include human faces.
            Do not include usernames.
            Do not include profile images.
            Do not include any personal information.

            Final goal:
            A single beautiful emotional plaza illustration.
            It should look like a polished version of the user's placed-object plaza.
            It should look cozy, quiet, complete, and emotionally meaningful.
            """.formatted(
                sceneStructure,
                layoutModeRule,
                mainObjects,
                supportingObjects,
                backgroundDetails,
                backgroundType,
                backgroundColor,
                backgroundWeather
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

        // [수정] entry별 weatherKey는 제거했습니다.
        //        각 오브젝트마다 날씨가 다르게 들어가면 AI가 장면을 비/눈/맑음/안개가 섞인 이상한 공간으로 해석할 수 있습니다.
        //        날씨는 plaza.getBackgroundKey() 하나로 전체 장면에만 반영합니다.
        return switch (role) {
            case MANDATORY -> String.format(
                    "- Mandatory object: %s. Approximate user placement: %s. This object must appear near that area. Do not omit it. Do not replace it with another object. Emotional mood: %s.",
                    objectDescription,
                    positionLabel,
                    moodPrompt
            );

            case MAIN -> String.format(
                    "- Main object: %s. Approximate user placement: %s. Keep this object near that area. Make it clearly recognizable. Emotional mood: %s.",
                    objectDescription,
                    positionLabel,
                    moodPrompt
            );

            case SUPPORTING -> String.format(
                    "- Supporting object: %s. Approximate user placement: %s. Keep it as a smaller supporting detail near that area. Emotional mood: %s.",
                    objectDescription,
                    positionLabel,
                    moodPrompt
            );

            case BACKGROUND -> String.format(
                    "- Background detail: %s. Approximate user placement: %s. Use it only as a subtle background detail near that area. Do not make it large.",
                    objectDescription,
                    positionLabel
            );
        };
    }

    private String toSceneStructurePrompt(Object backgroundType) {
        String key = safe(backgroundType).toLowerCase(Locale.ROOT);

        // [추가] backgroundType이 weather라면 실내 방으로 바꾸지 말고,
        //        현재 PNG처럼 하늘과 바닥이 있는 열린 광장 구조를 우선하게 합니다.
        if (key.equals("weather")) {
            return """
                Use an open outdoor emotional plaza structure.
                Keep a clear sky or weather atmosphere in the upper area.
                Keep a simple ground or plaza floor in the lower area.
                Do not turn the scene into a closed indoor room.
                Do not add random indoor furniture unless it is listed as a footprint object.
                """;
        }

        // [추가] color 배경은 실내/야외 둘 다 가능하지만,
        //        그래도 사용자가 배치한 오브젝트 캔버스 느낌은 유지하게 합니다.
        if (key.equals("color")) {
            return """
                Use a simple cozy emotional space based on the provided background color.
                It may be an indoor room or a quiet plaza, but it must preserve the user's placed-object layout.
                Do not redesign it into a new unrelated room.
                """;
        }

        return """
            Use a simple cozy emotional plaza structure.
            Preserve the user's placed-object layout.
            Keep the background simple and do not add unrelated objects.
            """;
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

        if (number >= 0 && number <= 1) {
            return number * 100.0;
        }

        if (number >= 0 && number <= 100) {
            return number;
        }

        // [수정] 기존에는 1024x768이 메서드 안에 직접 박혀 있었는데,
        //        상수로 빼서 프론트 캔버스 크기가 바뀌어도 수정하기 쉽게 만들었습니다.
        double assumedMax = xAxis ? ASSUMED_CANVAS_WIDTH : ASSUMED_CANVAS_HEIGHT;
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

        // [추가] 고양이1, 햄스터1처럼 숫자가 붙은 오브젝트는 공백/언더바/하이픈이 섞여 들어올 수 있어서
        //        compactKey로 한 번 더 보정합니다.
        //        예: "고양이 1", "고양이_1", "cat-1" 모두 같은 오브젝트로 처리 가능.
        String compactKey = key
                .replaceAll("[\\s_\\-]", "");

        // [추가] 숫자형 식별자가 붙은 신규 동물은 switch 전에 먼저 처리합니다.
        //        프롬프트에는 cat1, hamster1 같은 숫자 이름을 직접 노출하지 않고 외형 묘사만 넣습니다.
        if (compactKey.equals("고양이1") || compactKey.equals("cat1")) {
            return "a small cozy cream-colored cat sitting calmly, soft rounded body, gentle expression";
        }

        if (compactKey.equals("고양이2") || compactKey.equals("cat2")) {
            return "a small cozy gray-and-white cat resting quietly, soft rounded body, calm expression";
        }

        if (compactKey.equals("햄스터1") || compactKey.equals("hamster1")) {
            return "a small cozy cream and beige hamster sitting upright, tiny rounded ears, soft fluffy body";
        }

        if (compactKey.equals("햄스터2") || compactKey.equals("hamster2")) {
            return "a small cozy warm-brown hamster crawling softly, belly close to the ground, tiny paws forward";
        }

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
            case "레서판다", "lesser panda", "red panda" -> "a cute red panda sitting gently, fluffy ringed tail, round ears, warm reddish-brown fur";

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

            // [수정] 기존 default는 알 수 없는 objectKey를 프롬프트에 그대로 붙였습니다.
            //        objectKey가 한국어/숫자/기호를 포함하면 이미지 안에 글자 비슷한 흔적이 생길 수 있어서,
            //        이제는 원본 key를 노출하지 않고 안전한 일반 오브젝트 묘사로 처리합니다.
            default -> "a small unspecified cozy object from the user's placed object library, with no text, no letters, no numbers, and no symbols";
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
        MANDATORY,
        MAIN,
        SUPPORTING,
        BACKGROUND
    }
}