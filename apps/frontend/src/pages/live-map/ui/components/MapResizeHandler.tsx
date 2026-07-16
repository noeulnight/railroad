import { useEffect } from "react";
import type { Map as MapInstance } from "maplibre-gl";

export function MapResizeHandler(props: { map: MapInstance }) {
  useEffect(() => {
    const container = props.map.getContainer();
    const visualViewport = window.visualViewport;
    let animationFrameId: number | undefined;

    const invalidateMapSize = () => {
      if (animationFrameId !== undefined) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        animationFrameId = undefined;
        props.map.resize();
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
  }, [props.map]);

  return null;
}
