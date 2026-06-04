import type { ReactNode } from "react";
import { Navigate, Routes, Route, useLocation } from "react-router-dom";
import RoomPage from "../features/pages/RoomPage";
import LoginPage from "../features/pages/LoginPage";
import { SignupPage } from "../features/pages/SignupPage";
import { LandingPage } from "../features/pages/LandingPage";
import { isAuthenticated } from "../utils/authSession";
import "../styles/App.css";
import MyPage from "../features/pages/MyPage";
import PlazaPage from "../features/pages/PlazaPage";
import MailboxPage from "../features/pages/MailboxPage";

type RouteGuardProps = {
  children: ReactNode;
};

type AuthRouteState = {
  fromLanding?: boolean;
};

function LandingRoute() {
  return isAuthenticated() ? <Navigate to="/room" replace /> : <LandingPage />;
}

function ProtectedRoute({ children }: RouteGuardProps) {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function AuthEntryRoute({ children }: RouteGuardProps) {
  const location = useLocation();
  const routeState = location.state as AuthRouteState | null;

  if (isAuthenticated()) {
    return <Navigate to="/room" replace />;
  }

  if (!routeState?.fromLanding) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

function FallbackRoute() {
  return <Navigate to={isAuthenticated() ? "/room" : "/"} replace />;
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingRoute />} />
      <Route
        path="/room"
        element={
          <ProtectedRoute>
            <RoomPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/login"
        element={
          <AuthEntryRoute>
            <LoginPage />
          </AuthEntryRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <AuthEntryRoute>
            <SignupPage />
          </AuthEntryRoute>
        }
      />
      <Route
        path="/mypage"
        element={
          <ProtectedRoute>
            <MyPage />
          </ProtectedRoute>
        }
      />
      {/* 광장 목록과 광장 내부 화면은 같은 페이지 컴포넌트가 URL 파라미터로 구분 */}
      <Route
        path="/plaza"
        element={
          <ProtectedRoute>
            <PlazaPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/plaza/:plazaId"
        element={
          <ProtectedRoute>
            <PlazaPage />
          </ProtectedRoute>
        }
      />
      {/* 완성된 광장 이미지 우편을 백엔드 우편함 API에서 받아 보여주는 화면입니다. */}
      <Route
        path="/mailbox"
        element={
          <ProtectedRoute>
            <MailboxPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<FallbackRoute />} />
    </Routes>
  );
}

export default App;
