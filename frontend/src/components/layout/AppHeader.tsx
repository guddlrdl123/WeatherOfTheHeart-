import { House, Home, Inbox, LogOut, UserRound, CastleIcon } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { clearAuthenticated } from "../../utils/authSession";

export function AppHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const isMyPage = location.pathname === "/mypage";
    const isPlazaPage = location.pathname.startsWith("/plaza");
    const plazaNavTarget = isPlazaPage ? "/room" : "/plaza";
    const plazaNavLabel = isPlazaPage ? "내 방 돌아가기" : "광장 들어가기";
    const PlazaNavIcon = isPlazaPage ? House : CastleIcon;

    function handleLogout() {
        clearAuthenticated();
        navigate("/", { replace: true });
    }

    return (
        <header className="sticky top-0 z-50 w-full mw-header shadow-xs border-b">
            <div className="px-6">
                <div className="mx-auto flex h-16 w-full max-w-[1460px] items-center justify-between py-2">
                    <Link to="/" className="font-semibold text-2xl text-[#5a4632]" style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}>
                        마음의 날씨
                    </Link>

                    <nav className="flex items-center gap-2 text-xs text-gray-600">
                        <Link
                            to={plazaNavTarget}
                            className="group inline-flex h-8 max-w-8 items-center justify-start gap-0 overflow-hidden whitespace-nowrap rounded-md border border-[#5a4632]/20 p-2 text-[#5a4632]/80 transition-[max-width,gap,background-color,color]
                                duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] hover:max-w-[160px] hover:gap-1.5 hover:bg-[#5a4632]/10"
                            title={plazaNavLabel}
                            aria-label={plazaNavLabel}
                        >
                            <PlazaNavIcon size={14} className="shrink-0" />
                            <span className="max-w-0 overflow-hidden text-xs opacity-0 transition-[max-width,opacity] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:max-w-[120px] group-hover:opacity-100 group-hover:delay-75">
                                {plazaNavLabel}
                            </span>
                        </Link>

                        {!isMyPage && (
                            <Link
                                to="/mypage"
                                className="p-2 rounded-md border border-[#5a4632]/20 hover:bg-[#5a4632]/10 text-[#5a4632]/80"
                                title="마이페이지"
                                aria-label="마이페이지"
                            >
                                <UserRound size={14} />
                            </Link>
                        )}
                        {isMyPage && (
                            <Link
                                to="/"
                                className="p-2 rounded-md border border-[#5a4632]/20 hover:bg-[#5a4632]/10 text-[#5a4632]/80"
                                title="홈"
                                aria-label="내 방"
                            >
                                <Home size={14} />
                            </Link>
                        )}
                        {/* 우편함은 완성된 광장 이미지가 도착하는 별도 메뉴입니다. */}
                        <Link
                            to="/mailbox"
                            className="p-2 rounded-md border border-[#5a4632]/20 hover:bg-[#5a4632]/10 text-[#5a4632]/80"
                            title="우편함"
                            aria-label="우편함"
                        >
                            <Inbox size={14} />
                        </Link>
                        <button
                            type="button"
                            onClick={handleLogout}
                            className="p-2 rounded-md border border-[#5a4632]/20 hover:bg-[#5a4632]/10 text-[#5a4632]/80"
                            title="로그아웃"
                            aria-label="로그아웃"
                        >
                            <LogOut size={14} />
                        </button>
                    </nav>
                </div>
            </div>
        </header>
    );
}
