import { useMemo, useState } from "react";
import { ChevronDown, Mail, MessageCircleQuestion, Send } from "lucide-react";
import { AppHeader } from "../../components/layout/AppHeader";

// 문의 메일을 받을 주소입니다
const SUPPORT_EMAIL = "guddlrdl123@gmail.com";

type FaqItem = {
  question: string;
  answer: string;
};

// 자주 묻는 질문은 서비스 주요 기능(인증/광장/우편함/마이페이지) 기준으로 정리했습니다.
const FAQ_ITEMS: FaqItem[] = [
  {
    question: "회원가입 인증번호가 오지 않아요.",
    answer:
      "인증 메일이 스팸함으로 분류되는 경우가 있어 먼저 스팸함을 확인해 주세요. 인증번호는 발송 후 10분 동안만 유효하며, 시간이 지났다면 인증번호 받기를 다시 눌러 새 번호를 받을 수 있습니다.",
  },
  {
    question: "집에 가고 싶어요.",
    answer:
      "어쩔 수 없어요.. 힘내세요.",
  },
  {
    question: "광장은 무엇인가요?",
    answer:
      "광장은 여러 사람이 함께 발자취를 남기는 공간입니다. 정해진 기간이 끝나면 모두의 기록이 모인 완성 이미지가 만들어져 우편함으로 도착합니다.",
  },
  {
    question: "우편함에는 무엇이 도착하나요?",
    answer:
      "참여한 광장이 완성되면 생성된 이미지가 우편으로 도착합니다. 우편함에서 이미지를 확인하고 내려받거나, 연결된 광장으로 이동할 수 있습니다.",
  },
  {
    question: "닉네임이나 프로필은 어디서 바꾸나요?",
    answer:
      "헤더의 사람 모양 아이콘을 눌러 마이페이지로 이동하면 닉네임 등 프로필 정보를 변경할 수 있습니다.",
  },
  {
    question: "회원 탈퇴는 어떻게 하나요?",
    answer:
      "마이페이지에서 회원 탈퇴를 진행할 수 있습니다. 탈퇴 시 계정 정보는 복구할 수 없으니 신중히 결정해 주세요.",
  },
];

function FaqAccordionItem({
  item,
  isOpen,
  onToggle,
}: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="mw-surface overflow-hidden rounded-xl">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-[#5a4632] transition-colors hover:bg-[#5a4632]/[0.04]"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-medium leading-6">{item.question}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-[#5a4632]/55 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
      >
        <div className="overflow-hidden">
          <p className="px-5 pb-5 text-sm leading-7 text-[#5a4632]/68">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

function QnaPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0;

  // 작성한 제목/내용을 메일 본문으로 채운 mailto 링크를 만듭니다.
  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams({
      subject: `[마음의 날씨 문의] ${subject.trim()}`,
      body: message,
    });

    return `mailto:${SUPPORT_EMAIL}?${params.toString()}`;
  }, [subject, message]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    // 사용자의 기본 메일 앱을 열어 작성 내용을 그대로 전달합니다.
    window.location.href = mailtoHref;
  }

  return (
    <div className="mw-app flex min-h-screen flex-col select-none">
      <AppHeader />

      <main className="min-h-0 flex-1 overflow-auto px-6 py-10">
        <div className="mx-auto w-full max-w-[760px]">
          <section className="text-center">
            <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-full border border-[#5a4632]/15 bg-white/35 text-[#9b6b54]">
              <MessageCircleQuestion size={22} />
            </div>
            <h1 className="text-2xl font-normal text-[#5a4632]">무엇을 도와드릴까요?</h1>
            <p className="mt-2 text-sm text-[#5a4632]/58">
              자주 묻는 질문 이외의 문의 사항은 1:1 문의를 통해 보내 주세요.
            </p>
          </section>

          <section className="mt-10">
            <h2 className="mb-4 text-base font-medium text-[#5a4632]">자주 묻는 질문</h2>
            <div className="flex flex-col gap-3">
              {FAQ_ITEMS.map((item, index) => (
                <FaqAccordionItem
                  key={item.question}
                  item={item}
                  isOpen={openIndex === index}
                  onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
                />
              ))}
            </div>
          </section>

          <section className="mt-12">
            <h2 className="mb-1 text-base font-medium text-[#5a4632]">1:1 문의</h2>
            <p className="mb-4 text-sm text-[#5a4632]/58">
              아래 내용을 작성하면 기본 메일 앱이 열려 문의를 보낼 수 있어요.
            </p>

            <form onSubmit={handleSubmit} className="mw-surface flex flex-col gap-4 rounded-xl p-6">
              <label className="flex flex-col gap-2">
                <span className="text-sm text-[#5a4632]/72">제목</span>
                <input
                  type="text"
                  value={subject}
                  onChange={(event) => setSubject(event.target.value)}
                  placeholder="문의 제목을 입력해 주세요."
                  className="mw-input h-10 px-3 text-sm"
                  maxLength={100}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="text-sm text-[#5a4632]/72">내용</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  placeholder="문의하실 내용을 자세히 적어 주세요."
                  rows={6}
                  className="mw-input resize-y px-3 py-2 text-sm leading-6"
                  maxLength={2000}
                />
              </label>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <p className="inline-flex items-center gap-2 text-xs text-[#5a4632]/52">
                  <Mail size={14} className="shrink-0" />
                  {SUPPORT_EMAIL}
                </p>
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mw-button-solid inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-sm disabled:opacity-50"
                >
                  <Send size={15} />
                  메일로 문의하기
                </button>
              </div>
            </form>
          </section>
        </div>
      </main>
    </div>
  );
}

export default QnaPage;
