import { type FormEvent, useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, CornerDownRight, Lock, MessageCircleQuestion, Send } from "lucide-react";
import { AppHeader } from "../../components/layout/AppHeader";
import { answerInquiry, createInquiry, fetchInquiries, type InquiryItem, type InquiryPage } from "../../services/inquiryService";

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
    question: "비밀번호를 잊어버렸어요.",
    answer:
      "로그인 화면의 '비밀번호 찾기'를 눌러 가입한 이메일로 인증코드를 받으면, 코드 확인 후 새 비밀번호를 설정할 수 있습니다.",
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

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

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

function InquiryRow({
  item,
  viewerIsAdmin,
  onAnswered,
}: {
  item: InquiryItem;
  viewerIsAdmin: boolean;
  onAnswered: () => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [answerDraft, setAnswerDraft] = useState(item.answer ?? "");
  const [isSaving, setIsSaving] = useState(false);
  const [answerError, setAnswerError] = useState("");

  // 관리자도 작성자 본인도 아니면 서버가 내용을 내려주지 않으므로(masked) 비공개 안내만 표시합니다.
  if (item.masked) {
    return (
      <div className="mw-surface flex items-center justify-between gap-4 rounded-xl px-5 py-4">
        <span className="inline-flex items-center gap-2 text-sm text-[#5a4632]/55">
          <Lock size={15} className="shrink-0" />
          비공개된 문의입니다.
        </span>
        <span className="shrink-0 text-xs text-[#5a4632]/42">{formatDateTime(item.createdAt)}</span>
      </div>
    );
  }

  async function handleSaveAnswer() {
    if (answerDraft.trim().length === 0 || isSaving) {
      return;
    }

    try {
      setIsSaving(true);
      setAnswerError("");
      await answerInquiry(item.id, answerDraft.trim());
      setIsEditing(false);
      onAnswered();
    } catch (caughtError) {
      setAnswerError(caughtError instanceof Error ? caughtError.message : "답변 등록에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="mw-surface rounded-xl px-5 py-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 truncate text-sm font-semibold text-[#5a4632]">{item.title}</h3>
          {item.mine && (
            <span className="shrink-0 rounded-full bg-[#9b6b54]/12 px-2 py-0.5 text-[10px] text-[#9b6b54]">내 문의</span>
          )}
        </div>
        <span className="shrink-0 text-xs text-[#5a4632]/42">{formatDateTime(item.createdAt)}</span>
      </div>
      <p className="mt-1 text-xs text-[#5a4632]/50">
        {item.authorNickname || "알 수 없음"}
        {item.authorEmail ? ` · ${item.authorEmail}` : ""}
      </p>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-[#5a4632]/72">{item.content}</p>

      {/* 관리자가 작성한 답변 표시 */}
      {item.answer && (
        <div className="mt-4 rounded-lg border border-[#9b6b54]/20 bg-[#9b6b54]/[0.06] px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9b6b54]">
              <CornerDownRight size={13} className="shrink-0" />
              관리자 답변{item.answererNickname ? ` · ${item.answererNickname}` : ""}
            </span>
            {item.answeredAt && (
              <span className="shrink-0 text-[11px] text-[#5a4632]/42">{formatDateTime(item.answeredAt)}</span>
            )}
          </div>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-[#5a4632]/72">{item.answer}</p>
        </div>
      )}

      {/* 관리자만 답변 작성/수정 */}
      {viewerIsAdmin && (
        <div className="mt-3">
          {isEditing ? (
            <div className="flex flex-col gap-2">
              <textarea
                value={answerDraft}
                onChange={(event) => setAnswerDraft(event.target.value)}
                placeholder="답변을 입력해 주세요."
                rows={3}
                className="mw-input resize-y px-3 py-2 text-sm leading-6"
                maxLength={2000}
              />
              {answerError && <p className="text-xs text-[#c86f67]">{answerError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setAnswerDraft(item.answer ?? "");
                    setAnswerError("");
                  }}
                  disabled={isSaving}
                  className="rounded-md border border-[#5a4632]/20 px-3 py-1.5 text-xs text-[#5a4632]/70 hover:bg-[#5a4632]/10 disabled:opacity-50"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAnswer()}
                  disabled={isSaving || answerDraft.trim().length === 0}
                  className="mw-button-solid inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs disabled:opacity-50"
                >
                  <Send size={13} />
                  {isSaving ? "저장 중" : "답변 저장"}
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAnswerDraft(item.answer ?? "");
                setIsEditing(true);
              }}
              className="mw-button inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs"
            >
              <CornerDownRight size={13} />
              {item.answer ? "답변 수정" : "답변 작성"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function QnaPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [formNotice, setFormNotice] = useState("");

  const [page, setPage] = useState(0);
  const [inquiryPage, setInquiryPage] = useState<InquiryPage | null>(null);
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [listError, setListError] = useState("");

  const canSubmit = subject.trim().length > 0 && message.trim().length > 0 && !isSubmitting;

  const loadInquiries = useCallback(async (targetPage: number) => {
    try {
      setIsLoadingList(true);
      setListError("");
      const result = await fetchInquiries(targetPage);
      setInquiryPage(result);
    } catch (caughtError) {
      setListError(caughtError instanceof Error ? caughtError.message : "문의 목록을 불러오지 못했습니다.");
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    // 린트 규칙(effect 내 동기 setState 금지)에 맞춰 호출을 다음 틱으로 넘깁니다.
    const timerId = window.setTimeout(() => {
      void loadInquiries(page);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [loadInquiries, page]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!canSubmit) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");
      setFormNotice("");
      await createInquiry({ title: subject.trim(), content: message });
      setSubject("");
      setMessage("");
      setFormNotice("문의가 등록되었습니다.");

      // 새 문의가 맨 위에 보이도록 항상 첫 페이지로 이동/갱신합니다.
      if (page === 0) {
        void loadInquiries(0);
      } else {
        setPage(0);
      }
    } catch (caughtError) {
      setFormError(caughtError instanceof Error ? caughtError.message : "문의 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const totalPages = inquiryPage?.totalPages ?? 0;
  const currentPage = inquiryPage?.page ?? page;
  const items = inquiryPage?.items ?? [];

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
              자주 묻는 질문을 먼저 확인하고, 해결되지 않으면 아래에서 문의해 주세요.
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
              문의를 남기면 아래 목록에 기록되며, 내용은 관리자만 확인할 수 있어요.
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

              {formError && <p className="text-xs text-[#c86f67]">{formError}</p>}
              {formNotice && <p className="text-xs text-[#5a8f5a]">{formNotice}</p>}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="mw-button-solid inline-flex h-10 items-center justify-center gap-2 rounded-[8px] px-4 text-sm disabled:opacity-50"
                >
                  <Send size={15} />
                  {isSubmitting ? "등록 중" : "문의 등록"}
                </button>
              </div>
            </form>
          </section>

          <section className="mt-12">
            <div className="mb-4 flex items-end justify-between gap-4">
              <h2 className="text-base font-medium text-[#5a4632]">문의 내역</h2>
              {inquiryPage && (
                <span className="text-xs text-[#5a4632]/48">총 {inquiryPage.totalElements}건</span>
              )}
            </div>

            {listError && (
              <div className="mb-3 rounded-xl border border-[#a76c5d]/25 bg-[#a76c5d]/10 px-4 py-3 text-sm text-[#c86f67]">
                {listError}
              </div>
            )}

            {isLoadingList ? (
              <div className="mw-surface grid min-h-[120px] place-items-center rounded-xl p-6 text-sm text-[#5a4632]/55">
                문의 내역을 불러오는 중입니다.
              </div>
            ) : items.length === 0 ? (
              <div className="mw-surface grid min-h-[120px] place-items-center rounded-xl p-6 text-sm text-[#5a4632]/55">
                아직 등록된 문의가 없어요.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {items.map((item) => (
                  <InquiryRow
                    key={item.id}
                    item={item}
                    viewerIsAdmin={inquiryPage?.viewerIsAdmin ?? false}
                    onAnswered={() => void loadInquiries(currentPage)}
                  />
                ))}
              </div>
            )}

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(0, current - 1))}
                  disabled={currentPage <= 0 || isLoadingList}
                  className="grid h-8 w-8 place-items-center rounded-md border border-[#5a4632]/20 text-[#5a4632]/80 hover:bg-[#5a4632]/10 disabled:opacity-40"
                  aria-label="이전 페이지"
                >
                  <ChevronLeft size={15} />
                </button>

                {Array.from({ length: totalPages }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => setPage(index)}
                    disabled={isLoadingList}
                    aria-current={index === currentPage ? "page" : undefined}
                    className={`h-8 min-w-8 rounded-md border px-2 text-sm transition-colors ${index === currentPage
                      ? "border-[#9b6b54]/60 bg-[#9b6b54]/15 text-[#9b6b54]"
                      : "border-[#5a4632]/20 text-[#5a4632]/80 hover:bg-[#5a4632]/10"
                      }`}
                  >
                    {index + 1}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={!inquiryPage?.hasNext || isLoadingList}
                  className="grid h-8 w-8 place-items-center rounded-md border border-[#5a4632]/20 text-[#5a4632]/80 hover:bg-[#5a4632]/10 disabled:opacity-40"
                  aria-label="다음 페이지"
                >
                  <ChevronRight size={15} />
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}

export default QnaPage;
