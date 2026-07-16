import { useEffect, useRef } from "react";
import type { Map as MapInstance } from "maplibre-gl";
import { useIsMobile } from "@/shared/hooks/use-mobile";
import { easeOutCubic } from "@/shared/lib/utils";

const MOBILE_DETAIL_OCCLUSION_RATIO = 0.82;

export function MapZoomTracker(props: {
  map: MapInstance;
  onZoomChange: (zoom: number) => void;
  followPosition?: [number, number];
  focusKey?: string;
  focusZoom?: number;
  onUserMoveStart?: () => void;
}) {
  const {
    map,
    onZoomChange,
    onUserMoveStart,
    followPosition,
    focusKey,
    focusZoom,
  } = props;
  const isMobile = useIsMobile();
  const previousFocusKeyRef = useRef<string | undefined>(undefined);
  const previousFollowPositionRef = useRef<[number, number] | undefined>(
    undefined,
  );
  const followLongitude = followPosition?.[0];
  const followLatitude = followPosition?.[1];

  useEffect(() => {
    const handleDragStart = () => {
      onUserMoveStart?.();
    };
    const handleZoomEnd = () => {
      onZoomChange(map.getZoom());
    };

    map.on("dragstart", handleDragStart);
    map.on("zoomend", handleZoomEnd);

    return () => {
      map.off("dragstart", handleDragStart);
      map.off("zoomend", handleZoomEnd);
    };
  }, [map, onUserMoveStart, onZoomChange]);

  useEffect(() => {
    if (followLongitude === undefined || followLatitude === undefined) {
      previousFocusKeyRef.current = focusKey;
      previousFollowPositionRef.current = undefined;
      return;
    }

    const nextPosition: [number, number] = [
      followLongitude,
      followLatitude,
    ];
    const isNewFocus = previousFocusKeyRef.current !== focusKey;
    const previousPosition = previousFollowPositionRef.current;
    const hasPositionChanged =
      !previousPosition ||
      previousPosition[0] !== followLongitude ||
      previousPosition[1] !== followLatitude;

    previousFocusKeyRef.current = focusKey;
    previousFollowPositionRef.current = nextPosition;

    if (isNewFocus && focusKey) {
      const nextZoom = focusZoom ?? map.getZoom();
      map.flyTo({
        center: nextPosition,
        zoom: nextZoom,
        offset: getFollowOffset(map, isMobile),
        duration: 1_250,
        easing: easeOutCubic,
      });
      return;
    }

    if (!hasPositionChanged) {
      return;
    }

    map.panTo(
      nextPosition,
      {
        offset: getFollowOffset(map, isMobile),
        duration: 900,
        easing: easeOutCubic,
      },
    );
  }, [
    followLatitude,
    followLongitude,
    map,
    isMobile,
    focusKey,
    focusZoom,
  ]);

  return null;
}

function getFollowOffset(
  map: MapInstance,
  isMobile: boolean,
): [number, number] {
  if (!isMobile) {
    return [0, 0];
  }

  const verticalOffset =
    (map.getContainer().clientHeight * MOBILE_DETAIL_OCCLUSION_RATIO) / 2;
  return [0, -verticalOffset];
}
