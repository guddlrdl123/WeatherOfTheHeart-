import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import RoomPage from "../features/pages/RoomPage";
import LoginPage from "../features/pages/LoginPage";
import { SignupPage } from "../features/pages/SignupPage";
import { ResetPasswordPage } from "../features/pages/ResetPasswordPage";
import { LandingPage } from "../features/pages/LandingPage";
import { OAuthCallbackPage } from "../features/pages/OAuthCallbackPage";
import { AUTH_SESSION_CHANGED_EVENT, isAuthenticated } from "../utils/authSession";
import "../styles/App.css";
import MyPage from "../features/pages/MyPage";
import PlazaPage from "../features/pages/PlazaPage";
import MailboxPage from "../features/pages/MailboxPage";

type RouteGuardProps = {
  children: ReactNode;
};

type AuthAwareRouteProps = RouteGuardProps & {
  authenticated: boolean;
};

type AuthRouteState = {
  fromLanding?: boolean;
};

// 이미 로그인한 사용자가 랜딩에 머물지 않도록 개인 방으로 바로 보냅니다.
function LandingRoute({ authenticated }: Pick<AuthAwareRouteProps, "authenticated">) {
  return authenticated ? <Navigate to="/room" replace /> : <LandingPage />;
}

// 로그인 상태가 필요한 화면을 감싸는 라우트 가드입니다.
function ProtectedRoute({ children, authenticated }: AuthAwareRouteProps) {
  if (!authenticated) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// 로그인/회원가입은 랜딩의 진입 버튼을 통해서만 접근하게 해 흐름을 단순하게 유지합니다.
function AuthEntryRoute({ children, authenticated }: AuthAwareRouteProps) {
  const location = useLocation();
  const routeState = location.state as AuthRouteState | null;

  if (authenticated) {
    return <Navigate to="/room" replace />;
  }

  if (!routeState?.fromLanding) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// 알 수 없는 URL은 현재 인증 상태에 맞는 시작 화면으로 정리합니다.
function FallbackRoute({ authenticated }: Pick<AuthAwareRouteProps, "authenticated">) {
  return <Navigate to={authenticated ? "/room" : "/"} replace />;
}

function App() {
  const [authenticated, setAuthenticatedState] = useState(() => isAuthenticated());

  useEffect(() => {
    const syncAuthenticated = () => {
      setAuthenticatedState(isAuthenticated());
    };

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthenticated);
    window.addEventListener("storage", syncAuthenticated);
    window.addEventListener("focus", syncAuthenticated);

    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, syncAuthenticated);
      window.removeEventListener("storage", syncAuthenticated);
      window.removeEventListener("focus", syncAuthenticated);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<LandingRoute authenticated={authenticated} />} />
      <Route
        path="/room"
        element={
          <ProtectedRoute authenticated={authenticated}>
            <RoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <AuthEntryRoute authenticated={authenticated}>
            <LoginPage />
          </AuthEntryRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthEntryRoute authenticated={authenticated}>
            <SignupPage />
          </AuthEntryRoute>
        }
      />
      <Route
        path="/reset-password"
        element={authenticated ? <Navigate to="/room" replace /> : <ResetPasswordPage />}
      />
      <Route
        path="/oauth/callback/:provider"
        element={authenticated ? <Navigate to="/room" replace /> : <OAuthCallbackPage />}
      />
      <Route
        path="/mypage"
        element={
          <ProtectedRoute authenticated={authenticated}>
            <MyPage />
          </ProtectedRoute>
        }
      />
      {/* 광장 목록과 광장 내부 화면은 같은 페이지 컴포넌트가 URL 파라미터로 구분 */}
      <Route
        path="/plaza"
        element={
          <ProtectedRoute authenticated={authenticated}>
            <PlazaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plaza/:plazaId"
        element={
          <ProtectedRoute authenticated={authenticated}>
            <PlazaPage />
          </ProtectedRoute>
        }
      />
      {/* 완성된 광장 이미지 우편을 백엔드 우편함 API에서 받아 보여주는 화면입니다. */}
      <Route
        path="/mailbox"
        element={
          <ProtectedRoute authenticated={authenticated}>
            <MailboxPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<FallbackRoute authenticated={authenticated} />} />
    </Routes>
  );
}

export default App;
