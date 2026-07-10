import { useEffect } from "react";
import { useMap } from "react-leaflet";

export function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const visualViewport = window.visualViewport;
    let animationFrameId: number | undefined;

    const invalidateMapSize = () => {
      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = undefined;
        map.invalidateSize({
          animate: false,
          debounceMoveend: true,
          pan: false,
        });
      });
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        invalidateMapSize();
      }
    };

    const resizeObserver = new ResizeObserver(invalidateMapSize);
    resizeObserver.observe(container);
    visualViewport?.addEventListener("resize", invalidateMapSize);
    window.addEventListener("orientationchange", invalidateMapSize);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    invalidateMapSize();

    return () => {
      resizeObserver.disconnect();
      visualViewport?.removeEventListener("resize", invalidateMapSize);
      window.removeEventListener("orientationchange", invalidateMapSize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [map]);

  return null;
}
