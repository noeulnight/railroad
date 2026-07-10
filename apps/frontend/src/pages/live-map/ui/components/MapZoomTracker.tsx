import { useEffect, useRef } from "react";
import type L from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import { useIsMobile } from "@/shared/hooks/use-mobile";

const MOBILE_DETAIL_OCCLUSION_RATIO = 0.72;

export function MapZoomTracker(props: {
  onZoomChange: (zoom: number) => void;
  followPosition?: [number, number];
  focusKey?: string;
  focusZoom?: number;
  onUserMoveStart?: () => void;
}) {
  const map = useMap();
  const isMobile = useIsMobile();
  const previousFocusKeyRef = useRef<string | undefined>(undefined);
  const previousFollowPositionRef = useRef<[number, number] | undefined>(
    undefined,
  );
  const followLatitude = props.followPosition?.[0];
  const followLongitude = props.followPosition?.[1];

  useMapEvents({
    dragstart: () => {
      props.onUserMoveStart?.();
    },
    zoomend: (event) => {
      props.onZoomChange(event.target.getZoom());
    },
  });

  useEffect(() => {
    if (followLatitude === undefined || followLongitude === undefined) {
      previousFocusKeyRef.current = props.focusKey;
      previousFollowPositionRef.current = undefined;
      return;
    }

    const nextPosition: [number, number] = [
      followLatitude,
      followLongitude,
    ];
    const isNewFocus = previousFocusKeyRef.current !== props.focusKey;
    const previousPosition = previousFollowPositionRef.current;
    const hasPositionChanged =
      !previousPosition ||
      previousPosition[0] !== followLatitude ||
      previousPosition[1] !== followLongitude;

    previousFocusKeyRef.current = props.focusKey;
    previousFollowPositionRef.current = nextPosition;

    if (isNewFocus && props.focusKey) {
      const nextZoom = props.focusZoom ?? map.getZoom();
      map.flyTo(getFollowCenter(map, nextPosition, nextZoom, isMobile), nextZoom, {
        animate: true,
        duration: 1.25,
        easeLinearity: 0.2,
      });
      return;
    }

    if (!hasPositionChanged) {
      return;
    }

    map.panTo(getFollowCenter(map, nextPosition, map.getZoom(), isMobile), {
      animate: true,
      duration: 0.9,
      easeLinearity: 0.2,
    });
  }, [
    followLatitude,
    followLongitude,
    map,
    isMobile,
    props.focusKey,
    props.focusZoom,
  ]);

  return null;
}

function getFollowCenter(
  map: L.Map,
  trainPosition: [number, number],
  zoom: number,
  isMobile: boolean,
): L.LatLngExpression {
  if (!isMobile) {
    return trainPosition;
  }

  const verticalOffset =
    (map.getSize().y * MOBILE_DETAIL_OCCLUSION_RATIO) / 2;
  const projectedCenter = map
    .project(trainPosition, zoom)
    .add([0, verticalOffset]);

  return map.unproject(projectedCenter, zoom);
}
