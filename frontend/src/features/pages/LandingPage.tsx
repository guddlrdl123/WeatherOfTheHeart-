import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Room from "../room/Room";

export function LandingPage() {
    const navigate = useNavigate();

    function moveToAuth(path: "/login" | "/signup") {
        navigate(path, { state: { fromLanding: true } });
    }

    return (
        <div className="mw-app min-h-screen overflow-auto">
            <main className="mx-auto flex min-h-screen w-[1280px] items-center gap-10 px-16 py-10">
                <section className="w-[520px] shrink-0">
                    <p className="mb-4 text-[0.72rem] tracking-[0.28em] text-[#806554]/60">마음의 날씨</p>
                    <h1
                        className="text-[3.1rem] font-light leading-[1.35] text-[#5a4632]"
                        style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}
                    >
                        오늘 마음속 날씨는
                        <br />
                        어떤 모습인가요?
                    </h1>
                    <p className="mt-7 max-w-[520px] text-[0.98rem] leading-9 text-[#5a4632]/70">
                        말하지 못한 이야기를 적으면, 그 마음은 창밖의 날씨와 방 안의 사물이 됩니다.
                    </p>
                    <div className="mt-9 flex flex-wrap gap-3">
                        <button
                            type="button"
                            onClick={() => moveToAuth("/login")}
                            className="mw-button-solid inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm"
                        >
                            내 방 만들기
                            <ArrowRight size={16} />
                        </button>
                        {/* <button
                            type="button"
                            onClick={() => moveToAuth("/signup")}
                            className="mw-button inline-flex items-center gap-2 rounded-md px-5 py-3 text-sm"
                        >
                            <UserPlus size={16} />
                            회원가입
                        </button> */}
                    </div>
                </section>

                <div className="w-[620px] shrink-0">
                    <div className="h-[520px] overflow-hidden rounded-xl border border-[#5a4632]/20 bg-[#faf8f2]">
                        <Room weatherKey="sunny" />
                    </div>
                </div>
            </main>
        </div>
    );
}
