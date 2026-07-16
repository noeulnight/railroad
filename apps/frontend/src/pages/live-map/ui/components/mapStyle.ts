import type { StyleSpecification } from "maplibre-gl";
import { buildExternalUrl } from "@/shared/api/railroadApi";

export const BASE_SOURCE_ID = "base-map";
export const MIN_MAP_ZOOM = 6;

export function getBaseTiles(theme: "light" | "dark") {
  const style = theme === "dark" ? "dark_nolabels" : "light_nolabels";

  return ["a", "b", "c", "d"].map(
    (subdomain) =>
      `https://${subdomain}.basemaps.cartocdn.com/${style}/{z}/{x}/{y}.png`,
  );
}

export function createMapStyle(
  theme: "light" | "dark",
): StyleSpecification {
  return {
    version: 8,
    sources: {
      [BASE_SOURCE_ID]: {
        type: "raster",
        tiles: getBaseTiles(theme),
        tileSize: 256,
        minzoom: MIN_MAP_ZOOM,
        maxzoom: 20,
        attribution:
          '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
      },
      railway: {
        type: "raster",
        tiles: [buildExternalUrl("/api/map/railway/{z}/{x}/{y}.png")],
        tileSize: 256,
        minzoom: MIN_MAP_ZOOM,
        maxzoom: 20,
        attribution:
          '&copy; <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> | 열차 정보: <a href="https://www.korail.com/">KORAIL</a>',
      },
    },
    layers: [
      {
        id: BASE_SOURCE_ID,
        type: "raster",
        source: BASE_SOURCE_ID,
        paint: { "raster-fade-duration": 250 },
      },
      {
        id: "railway",
        type: "raster",
        source: "railway",
        paint: { "raster-fade-duration": 250 },
      },
    ],
  };
}
