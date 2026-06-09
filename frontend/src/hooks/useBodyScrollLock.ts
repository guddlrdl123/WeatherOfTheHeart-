import { useEffect } from "react";

let lockCount = 0;
let previousBodyOverflow = "";
let previousBodyPaddingRight = "";
let previousRootOverscrollBehavior = "";

export function useBodyScrollLock(active = true) {
  useEffect(() => {
    if (!active || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    const { body, documentElement } = document;

    if (lockCount === 0) {
      previousBodyOverflow = body.style.overflow;
      previousBodyPaddingRight = body.style.paddingRight;
      previousRootOverscrollBehavior = documentElement.style.overscrollBehavior;

      const scrollbarWidth = window.innerWidth - documentElement.clientWidth;
      const currentPaddingRight = Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0;

      body.style.overflow = "hidden";
      documentElement.style.overscrollBehavior = "none";

      if (scrollbarWidth > 0) {
        body.style.paddingRight = `${currentPaddingRight + scrollbarWidth}px`;
      }
    }

    lockCount += 1;

    return () => {
      lockCount = Math.max(0, lockCount - 1);

      if (lockCount === 0) {
        body.style.overflow = previousBodyOverflow;
        body.style.paddingRight = previousBodyPaddingRight;
        documentElement.style.overscrollBehavior = previousRootOverscrollBehavior;
      }
    };
  }, [active]);
}
