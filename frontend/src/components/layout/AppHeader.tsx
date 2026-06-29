import { House, Home, Inbox, LogOut, UserRound, CastleIcon, MessageCircleQuestion, Megaphone, ShieldAlert } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { fetchMailboxUnreadCount, MAILBOX_CHANGED_EVENT } from "../../services/mailboxService";
import { clearAuthenticated } from "../../utils/authSession";
import { fetchUserProfile } from "../../services/userService";

export function AppHeader() {
    const navigate = useNavigate();
    const location = useLocation();
    const isMyPage = location.pathname === "/mypage";
    const isPlazaPage = location.pathname.startsWith("/plaza");
    const plazaNavTarget = isPlazaPage ? "/room" : "/plaza";
    const plazaNavLabel = isPlazaPage ? "내 방 돌아가기" : "광장 들어가기";
    const PlazaNavIcon = isPlazaPage ? House : CastleIcon;
    const [unreadMailboxCount, setUnreadMailboxCount] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);

    const loadUnreadMailboxCount = useCallback(async () => {
        try {
            const count = await fetchMailboxUnreadCount();
            setUnreadMailboxCount(count);
        } catch {
            setUnreadMailboxCount(0);
        }
    }, []);

    useEffect(() => {
        const initialRefreshId = window.setTimeout(() => {
            void loadUnreadMailboxCount();
        }, 0);

        const intervalId = window.setInterval(() => {
            void loadUnreadMailboxCount();
        }, 30_000);

        const handleRefresh = () => {
            void loadUnreadMailboxCount();
        };

        window.addEventListener("focus", handleRefresh);
        window.addEventListener(MAILBOX_CHANGED_EVENT, handleRefresh);

        return () => {
            window.clearTimeout(initialRefreshId);
            window.clearInterval(intervalId);
            window.removeEventListener("focus", handleRefresh);
            window.removeEventListener(MAILBOX_CHANGED_EVENT, handleRefresh);
        };
    }, [loadUnreadMailboxCount, location.pathname]);

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            void fetchUserProfile()
                .then((profile) => setIsAdmin(Boolean(profile.isAdmin)))
                .catch(() => setIsAdmin(false));
        }, 0);

        return () => window.clearTimeout(timerId);
    }, []);

    function handleLogout() {
        clearAuthenticated();
        navigate("/", { replace: true });
    }

    return (
        <header className="sticky top-0 z-50 w-full mw-header shadow-xs border-b">
            <div className="px-6">
                <div className="mx-auto flex h-16 w-full max-w-[1460px] items-center justify-between py-2">
                    <Link to="/" className="flex items-center gap-2 font-semibold text-2xl text-[#5a4632]" style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}>
                        <img src="/favicon.png" alt="" className="h-7 w-auto" />
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
                            className="relative p-2 rounded-md border border-[#5a4632]/20 hover:bg-[#5a4632]/10 text-[#5a4632]/80"
                            title="우편함"
                            aria-label="우편함"
                        >
                            <Inbox size={14} />
                            {unreadMailboxCount > 0 && (
                                <span className="absolute -right-1.5 -top-1.5 grid min-h-4 min-w-4 place-items-center rounded-full border border-[#fffbf6] bg-[#d96a5f] px-1 text-[0.6rem] leading-none text-white shadow-sm">
                                    {unreadMailboxCount > 99 ? "99+" : unreadMailboxCount}
                                </span>
                            )}
                        </Link>
                        {/* 상담·공지: 마우스를 올리면 두 메뉴가 펼쳐집니다. (우편함과 로그아웃 사이) */}
                        <div className="group relative">
                            <button
                                type="button"
                                className="p-2 rounded-md border border-[#5a4632]/20 hover:bg-[#5a4632]/10 group-hover:bg-[#5a4632]/10 text-[#5a4632]/80"
                                title="문의 · 공지"
                                aria-label="문의 · 공지"
                                aria-haspopup="menu"
                            >
                                <MessageCircleQuestion size={14} />
                            </button>

                            {/* hover 또는 포커스 시 표시되는 드롭다운 메뉴 */}
                            <div className="invisible absolute right-0 top-full z-50 pt-2 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                                <div className="min-w-[168px] overflow-hidden rounded-md border border-[#5a4632]/15 bg-[#fffbf6] py-1 shadow-lg">
                                    <Link
                                        to="/qna"
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-[#5a4632]/85 hover:bg-[#5a4632]/10"
                                    >
                                        <MessageCircleQuestion size={14} className="shrink-0 text-[#9b6b54]" />
                                        상담 및 QnA
                                    </Link>
                                    <Link
                                        to="/notices"
                                        className="flex items-center gap-2 px-3 py-2 text-xs text-[#5a4632]/85 hover:bg-[#5a4632]/10"
                                    >
                                        <Megaphone size={14} className="shrink-0 text-[#9b6b54]" />
                                        공지사항
                                    </Link>
                                    {isAdmin && (
                                        <Link
                                            to="/admin/reports"
                                            className="flex items-center gap-2 px-3 py-2 text-xs text-[#5a4632]/85 hover:bg-[#5a4632]/10"
                                        >
                                            <ShieldAlert size={14} className="shrink-0 text-[#a75e55]" />
                                            신고내역
                                        </Link>
                                    )}
                                </div>
                            </div>
                        </div>
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
