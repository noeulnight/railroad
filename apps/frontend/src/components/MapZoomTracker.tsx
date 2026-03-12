import { useEffect } from "react";
import { useMap, useMapEvents } from "react-leaflet";

export function MapZoomTracker(props: {
  onZoomChange: (zoom: number) => void;
  followPosition?: [number, number];
  focusKey?: string;
  focusZoom?: number;
}) {
  const map = useMap();

  useMapEvents({
    zoomend: (event) => {
      props.onZoomChange(event.target.getZoom());
    },
  });

  useEffect(() => {
    if (!props.followPosition) {
      return;
    }

    map.panTo(props.followPosition, { animate: true });
  }, [map, props.followPosition]);

  useEffect(() => {
    if (!props.followPosition || !props.focusKey) {
      return;
    }

    const nextZoom = props.focusZoom ?? map.getZoom();
    map.flyTo(props.followPosition, nextZoom, { animate: true });
  }, [map, props.focusKey, props.followPosition, props.focusZoom]);

  return null;
}
