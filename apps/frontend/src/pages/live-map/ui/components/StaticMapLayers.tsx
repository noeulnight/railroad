import { memo } from "react";
import { TileLayer } from "react-leaflet";
import { MapZoomTracker } from "@/pages/live-map/ui/components/MapZoomTracker";

export const StaticMapLayers = memo(function StaticMapLayers(props: {
  theme: "light" | "dark";
  onZoomChange: (zoom: number) => void;
  onUserMoveStart?: () => void;
  followPosition?: [number, number];
  focusKey?: string;
  focusZoom?: number;
}) {
  const {
    theme,
    onZoomChange,
    onUserMoveStart,
    followPosition,
    focusKey,
    focusZoom,
  } = props;

  return (
    <>
      <MapZoomTracker
        onZoomChange={onZoomChange}
        onUserMoveStart={onUserMoveStart}
        followPosition={followPosition}
        focusKey={focusKey}
        focusZoom={focusZoom}
      />

      <TileLayer
        url={`https://{s}.basemaps.cartocdn.com/${theme === "dark" ? "dark_nolabels" : "light_nolabels"}/{z}/{x}/{y}{r}.png`}
        subdomains={["a", "b", "c", "d"]}
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
        minZoom={8}
      />

      <TileLayer
        url="https://osm.lth.so/tiles/railway/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> | 열차 정보: <a href="https://www.korail.com/">KORAIL</a>'
        maxZoom={20}
        minZoom={8}
      />
    </>
  );
});
