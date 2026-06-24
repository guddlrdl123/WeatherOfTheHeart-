import { ArrowRight } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useRoomObjectCatalog } from "../../hooks/useRoomObjectCatalog";
import Room from "../room/Room";
import { LANDING_DEMO_ROOM, LANDING_DEMO_WEATHER_KEYS } from "./landingDemoRoom";
import plazaImg from "../../assets/landing-plaza.png";
import mailboxImg from "../../assets/landing-mailbox.png";
import brandLogo from "../../assets/image-logo2.png";

const SLIDE_INTERVAL_MS = 5000; // 자동 슬라이드 간격
const serif = { fontFamily: "'Noto Serif KR', Georgia, serif" } as const;
// 슬라이드 2~4 본문: 무료 고딕 웹폰트(나눔고딕)로 어디서나 동일하게 표시. (index.html에서 로드)
const gothic = {
    fontFamily: "'Nanum Gothic', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif",
} as const;

// 슬라이드 사진: 프레임을 잘라서 꽉 채워(여백 없음) 표시
const captureImageClass =
    "h-[520px] w-[620px] shrink-0 rounded-xl border border-[#5a4632]/20 object-cover";

export function LandingPage() {
    const navigate = useNavigate();
    useRoomObjectCatalog();
    const [demoWeather] = useState(
        () => LANDING_DEMO_WEATHER_KEYS[Math.floor(Math.random() * LANDING_DEMO_WEATHER_KEYS.length)],
    );
    const [index, setIndex] = useState(0);

    function moveToAuth(path: "/login" | "/signup") {
        navigate(path, { state: { fromLanding: true } });
    }

    const slides: ReactNode[] = [
        // 1. 인트로 — 가운데 큰 문구만
        <div className="text-center" key="intro">
            <p className="mb-6 text-[0.8rem] tracking-[0.32em] text-[#806554]/60">마음의 날씨</p>
            <h1 className="text-[4.2rem] font-light leading-[1.3] text-[#5a4632]" style={serif}>
                당신의 마음속 날씨는
                <br />
                어떤 모습인가요?
            </h1>
        </div>,

        // 2. 나만의 방 — 문구 + 방 데모
        <div className="flex w-[1180px] items-center justify-center gap-12" key="room">
            <div className="w-[460px] shrink-0">
                <h2 className="text-[1.7rem] font-normal leading-[1.55] text-[#5a4632]" style={gothic}>
                    나만의 방에서 말하지 못한 <br /> 이야기를 적어주세요.
                    <br />
                    그 이야기 속 마음은 창밖의 <br />날씨와 방 안의 사물이 됩니다.
                </h2>
            </div>
            <div className="pointer-events-none h-[520px] w-[620px] shrink-0 overflow-hidden rounded-xl border border-[#5a4632]/20 bg-[#faf8f2]">
                <Room
                    weatherKey={demoWeather}
                    placedObjects={LANDING_DEMO_ROOM.placedObjects}
                    objectScale={1.49}
                    isInteractive={false}
                />
            </div>
        </div>,

        // 3. 광장 — 문구 + 광장 캡처
        <div className="flex w-[1180px] items-center justify-center gap-12" key="plaza">
            <div className="w-[460px] shrink-0">
                <h2 className="text-[1.7rem] font-normal leading-[1.55] text-[#5a4632]" style={gothic}>
                    익명 소통 장소인 광장에서 <br />글을 남기고,
                    <br />
                    다른 사람들의 이야기를 들어보아요.
                </h2>
            </div>
            <img src={plazaImg} alt="광장 화면" className={captureImageClass} />
        </div>,

        // 4. 우편함 — 문구 + 우편함 캡처
        <div className="flex w-[1180px] items-center justify-center gap-12" key="mailbox">
            <div className="w-[460px] shrink-0">
                <h2 className="text-[1.7rem] font-normal leading-[1.55] text-[#5a4632]" style={gothic}>
                    우편함에서 여러 사람들고 함께 꾸민 광장의 모습을 <br />
                    AI로 변환한 이미지로 받아요.
                </h2>
            </div>
            <img src={mailboxImg} alt="우편함 화면" className={captureImageClass} />
        </div>,
    ];

    // index가 바뀔 때마다 5초 카운트다운을 다시 시작합니다. (수동 이동 시에도 타이머 리셋)
    useEffect(() => {
        const timer = window.setTimeout(
            () => setIndex((current) => (current + 1) % slides.length),
            SLIDE_INTERVAL_MS,
        );
        return () => window.clearTimeout(timer);
    }, [index, slides.length]);

    return (
        <div className="mw-app relative h-screen overflow-hidden">
            {/* 좌측 상단 브랜드 로고 */}
            <img
                src={brandLogo}
                alt="마음의 날씨"
                className="absolute left-10 top-8 z-20 h-10 w-auto"
            />
            {/* 슬라이드 영역: 화면 전체 높이를 차지해 본문이 정중앙에 오도록 함 */}
            <div className="h-full overflow-hidden">
                <div
                    className="flex h-full transition-transform duration-700 ease-in-out"
                    style={{ transform: `translateX(-${index * 100}%)` }}
                >
                    {slides.map((slide, i) => (
                        <div
                            key={i}
                            className="flex h-full w-full shrink-0 items-center justify-center px-16"
                            aria-hidden={i !== index}
                        >
                            {slide}
                        </div>
                    ))}
                </div>
            </div>

            {/* 하단 컨트롤: 인디케이터 + 상시 CTA (본문 위에 겹쳐 배치) */}
            <div className="absolute inset-x-0 bottom-10 flex flex-col items-center gap-5">
                <div className="flex items-center gap-2.5">
                    {slides.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setIndex(i)}
                            aria-label={`${i + 1}번째 슬라이드로 이동`}
                            className={`h-2 rounded-full transition-all duration-300 ${
                                i === index
                                    ? "w-6 bg-[#5a4632]/70"
                                    : "w-2 bg-[#5a4632]/25 hover:bg-[#5a4632]/45"
                            }`}
                        />
                    ))}
                </div>
                <button
                    type="button"
                    onClick={() => moveToAuth("/login")}
                    className="mw-button-solid inline-flex items-center gap-2 rounded-md px-6 py-3 text-sm"
                >
                    내 방 만들기
                    <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
}
