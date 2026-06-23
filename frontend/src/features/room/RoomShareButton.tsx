import { Camera, Download, Loader2, Share2, X } from "lucide-react";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { useBodyScrollLock } from "../../hooks/useBodyScrollLock";

type RoomShareButtonProps = {
  targetRef: RefObject<HTMLDivElement | null>;
  monthLabel: string;
  fileName: string;
  disabled?: boolean;
  onPrepareCapture?: () => void;
};

function waitForNextPaint() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => resolve());
    });
  });
}

async function waitForImages(target: HTMLElement) {
  const images = Array.from(target.querySelectorAll("img"));

  await Promise.all(images.map(async (image) => {
    if (!image.complete) {
      await new Promise<void>((resolve) => {
        image.addEventListener("load", () => resolve(), { once: true });
        image.addEventListener("error", () => resolve(), { once: true });
      });
    }

    if (typeof image.decode === "function") {
      await image.decode().catch(() => undefined);
    }
  }));
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 0);
}

export function RoomShareButton({
  targetRef,
  monthLabel,
  fileName,
  disabled = false,
  onPrepareCapture,
}: RoomShareButtonProps) {
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState("");

  useBodyScrollLock(Boolean(previewUrl));

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function closePreview() {
    if (isSharing) {
      return;
    }

    setPreviewUrl("");
    setImageBlob(null);
  }

  async function handleCapture() {
    const target = targetRef.current;

    if (!target || disabled || isCapturing) {
      return;
    }

    try {
      setIsCapturing(true);
      onPrepareCapture?.();
      await document.fonts?.ready;
      await waitForImages(target);
      await waitForNextPaint();

      const { toBlob } = await import("html-to-image");
      const blob = await toBlob(target, {
        backgroundColor: "#faf8f2",
        cacheBust: true,
        pixelRatio: 2,
        filter: (node) => (
          !(node instanceof HTMLElement)
          || node.dataset.roomCaptureExclude !== "true"
        ),
      });

      if (!blob) {
        throw new Error("empty room image");
      }

      setImageBlob(blob);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch {
      window.alert("방 사진을 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsCapturing(false);
    }
  }

  function handleDownload() {
    if (!imageBlob) {
      return;
    }

    downloadBlob(imageBlob, fileName);
  }

  async function handleInstagramShare() {
    if (!imageBlob || isSharing) {
      return;
    }

    const imageFile = new File([imageBlob], fileName, { type: "image/png" });
    const shareData = {
      files: [imageFile],
      title: `${monthLabel}의 마음의 날씨`,
      text: `${monthLabel}의 방을 공유해요.`,
    };
    const canShareFile = typeof navigator.share === "function"
      && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [imageFile] });

    if (!canShareFile) {
      downloadBlob(imageBlob, fileName);
      window.alert("이 브라우저에서는 앱으로 바로 공유할 수 없어 사진을 저장했습니다. Instagram에서 저장된 사진을 선택해 주세요.");
      return;
    }

    try {
      setIsSharing(true);
      await navigator.share(shareData);
      setPreviewUrl("");
      setImageBlob(null);
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== "AbortError") {
        window.alert("공유 화면을 열지 못했습니다. 사진 저장을 이용해 주세요.");
      }
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <>
      <div
        data-room-capture-exclude="true"
        className="absolute right-3 top-3 z-[90]"
      >
        <button
          type="button"
          onClick={() => void handleCapture()}
          disabled={disabled || isCapturing}
          className="group inline-flex h-9 items-center gap-0 overflow-hidden rounded-md border border-[#5a4632]/15 bg-[#fffbf6]/85 px-2.5 text-[#5a4632]/75 shadow-sm backdrop-blur-sm transition-[max-width,gap,background-color] duration-300 hover:gap-1.5 hover:bg-[#fffbf6] disabled:cursor-not-allowed disabled:opacity-45"
          aria-label="내 방 사진 찍기"
          title={disabled ? "방 배치를 마친 뒤 사진을 찍을 수 있어요" : "내 방 사진 찍기"}
        >
          {isCapturing ? <Loader2 size={15} className="shrink-0 animate-spin" /> : <Camera size={15} className="shrink-0" />}
          <span className="max-w-0 overflow-hidden whitespace-nowrap text-xs opacity-0 transition-[max-width,opacity] duration-300 group-hover:max-w-[90px] group-hover:opacity-100">
            {isCapturing ? "사진 만드는 중" : "사진 찍기"}
          </span>
        </button>
      </div>

      {previewUrl && typeof document !== "undefined" ? createPortal(
        <div
          className="fixed inset-0 z-[160] flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="room-share-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closePreview();
            }
          }}
        >
          <section className="w-full max-w-[920px] overflow-hidden rounded-2xl border border-white/30 bg-[#fffbf6] shadow-2xl">
            <header className="flex items-center justify-between border-b border-[#5a4632]/10 px-5 py-4">
              <div>
                <p className="text-[0.65rem] tracking-[0.2em] text-[#9b6b54]">MY ROOM</p>
                <h2 id="room-share-title" className="mt-1 text-base font-medium text-[#5a4632]">
                  {monthLabel}의 방 사진
                </h2>
              </div>
              <button
                type="button"
                onClick={closePreview}
                disabled={isSharing}
                className="grid h-9 w-9 place-items-center rounded-full text-[#5a4632]/60 hover:bg-[#5a4632]/10 disabled:opacity-40"
                aria-label="공유 창 닫기"
              >
                <X size={18} />
              </button>
            </header>

            <div className="bg-[#5a4632]/[0.06] p-4 sm:p-6">
              <img
                src={previewUrl}
                alt={`${monthLabel}의 방 캡처 미리보기`}
                className="mx-auto max-h-[62vh] w-full rounded-xl object-contain shadow-lg"
              />
            </div>

            <footer className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs leading-5 text-[#5a4632]/55">
                모바일에서는 공유 목록에서 Instagram을 선택해 주세요.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={isSharing}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg border border-[#5a4632]/20 px-4 text-sm text-[#5a4632] transition hover:bg-[#5a4632]/[0.07] disabled:opacity-45 sm:flex-none"
                >
                  <Download size={16} />
                  사진 저장
                </button>
                <button
                  type="button"
                  onClick={() => void handleInstagramShare()}
                  disabled={isSharing}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-[#833ab4] via-[#e1306c] to-[#f77737] px-4 text-sm font-medium text-white shadow-sm transition hover:brightness-105 disabled:opacity-55 sm:flex-none"
                >
                  {isSharing ? <Loader2 size={16} className="animate-spin" /> : <Share2 size={16} />}
                  Instagram 공유
                </button>
              </div>
            </footer>
          </section>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
