import { useMapEvents } from "react-leaflet";

export function MapZoomTracker(props: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => {
      props.onZoomChange(event.target.getZoom());
    },
  });

  return null;
}
