import { Link } from "react-router-dom";
import { LoginForm } from "../../components/auth/LoginForm";

export default function LoginPage() {
  return (
    <div className="mw-app min-h-[100dvh] overflow-y-auto">
      <main className="flex min-h-[100dvh] items-center justify-center px-5 py-10">
        <div className="w-full max-w-[420px]">
          <Link
            to="/"
            className="mb-6 block text-center text-2xl font-semibold text-[#5a4632]"
            style={{ fontFamily: "'Noto Serif KR', Georgia, serif" }}
          >
            마음의 날씨
          </Link>

          <LoginForm />
        </div>
      </main>
    </div>

  );
}
