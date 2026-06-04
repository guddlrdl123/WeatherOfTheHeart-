import { useEffect, useState } from "react";

type ResponsiveStageWidthOptions = {
  designWidth: number;
  designHeight: number;
  minWidth?: number;
  pagePaddingX?: number;
  pagePaddingY?: number;
  headerHeight?: number;
};

function getResponsiveStageWidth({
  designWidth,
  designHeight,
  minWidth = 1180,
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

  return Math.round(Math.max(minWidth, fitWidth));
}

export function useResponsiveStageWidth(options: ResponsiveStageWidthOptions) {
  const [stageWidth, setStageWidth] = useState(() => getResponsiveStageWidth(options));

  useEffect(() => {
    let frameId = 0;

    function updateStageWidth() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        setStageWidth(getResponsiveStageWidth(options));
      });
    }

    updateStageWidth();
    window.addEventListener("resize", updateStageWidth);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", updateStageWidth);
    };
  }, [
    options.designWidth,
    options.designHeight,
    options.minWidth,
    options.pagePaddingX,
    options.pagePaddingY,
    options.headerHeight,
  ]);

  return stageWidth;
}
