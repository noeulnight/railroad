import { memo, useEffect } from "react";
import type { Map as MapInstance, RasterTileSource } from "maplibre-gl";
import { MapResizeHandler } from "@/pages/live-map/ui/components/MapResizeHandler";
import { MapZoomTracker } from "@/pages/live-map/ui/components/MapZoomTracker";
import {
  BASE_SOURCE_ID,
  getBaseTiles,
} from "@/pages/live-map/ui/components/mapStyle";

export const StaticMapLayers = memo(function StaticMapLayers(props: {
  map: MapInstance;
  theme: "light" | "dark";
  onZoomChange: (zoom: number) => void;
  onUserMoveStart?: () => void;
  followPosition?: [number, number];
  focusKey?: string;
  focusZoom?: number;
}) {
  const {
    map,
    theme,
    onZoomChange,
    onUserMoveStart,
    followPosition,
    focusKey,
    focusZoom,
  } = props;

  useEffect(() => {
    const updateTiles = () => {
      const source = map.getSource(BASE_SOURCE_ID) as
        | RasterTileSource
        | undefined;
      source?.setTiles(getBaseTiles(theme));
    };

    if (map.isStyleLoaded()) {
      updateTiles();
      return;
    }

    map.once("load", updateTiles);
    return () => {
      map.off("load", updateTiles);
    };
  }, [map, theme]);

  return (
    <>
      <MapResizeHandler map={map} />
      <MapZoomTracker
        map={map}
        onZoomChange={onZoomChange}
        onUserMoveStart={onUserMoveStart}
        followPosition={followPosition}
        focusKey={focusKey}
        focusZoom={focusZoom}
      />
    </>
  );
});
