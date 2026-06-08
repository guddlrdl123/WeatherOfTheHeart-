import { useEffect, useState } from "react";

type ResponsiveStageWidthOptions = {
  designWidth: number;
  designHeight: number;
  minWidth?: number;
  minViewportWidth?: number;
  pagePaddingX?: number;
  pagePaddingY?: number;
  headerHeight?: number;
};

const DEFAULT_MIN_PC_VIEWPORT_WIDTH = 1280;

// 고정 디자인 캔버스를 뷰포트 안에 맞추되, 너무 작아져 레이아웃이 깨지지 않도록 최소 너비를 보장합니다.
function getResponsiveStageWidth({
  designWidth,
  designHeight,
  minWidth,
  minViewportWidth = DEFAULT_MIN_PC_VIEWPORT_WIDTH,
  pagePaddingX = 48,
  pagePaddingY = 48,
  headerHeight = 64,
}: ResponsiveStageWidthOptions) {
  if (typeof window === "undefined") {
    return designWidth;
  }

  const availableWidth = window.innerWidth - pagePaddingX;
  const availableHeight = window.innerHeight - headerHeight - pagePaddingY;
  const heightFitWidth = availableHeight * (designWidth / designHeight);
  const fitWidth = Math.min(designWidth, availableWidth, heightFitWidth);
  const minimumWidth = minWidth ?? Math.min(designWidth, Math.max(1, minViewportWidth - pagePaddingX));

  return Math.round(Math.max(minimumWidth, fitWidth, 1));
}

export function useResponsiveStageWidth(options: ResponsiveStageWidthOptions) {
  const {
    designWidth,
    designHeight,
    minWidth,
    minViewportWidth,
    pagePaddingX,
    pagePaddingY,
    headerHeight,
  } = options;
  const [stageWidth, setStageWidth] = useState(() => getResponsiveStageWidth({
    designWidth,
    designHeight,
    minWidth,
    minViewportWidth,
    pagePaddingX,
    pagePaddingY,
    headerHeight,
  }));

  useEffect(() => {
    let frameId = 0;

    function updateStageWidth() {
      // resize 이벤트가 연속으로 발생할 때 한 프레임에 한 번만 계산해 불필요한 렌더를 줄입니다.
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setStageWidth(getResponsiveStageWidth({
          designWidth,
          designHeight,
          minWidth,
          minViewportWidth,
          pagePaddingX,
          pagePaddingY,
          headerHeight,
        }));
      });
    }

    updateStageWidth();
    window.addEventListener("resize", updateStageWidth);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateStageWidth);
    };
  }, [
    designWidth,
    designHeight,
    minWidth,
    minViewportWidth,
    pagePaddingX,
    pagePaddingY,
    headerHeight,
  ]);

  return stageWidth;
}
