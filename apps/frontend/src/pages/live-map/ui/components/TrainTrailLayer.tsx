import { useEffect } from "react";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapInstance,
} from "maplibre-gl";
import type { TrainPositionSample } from "@/entities/train/model/types";

const SOURCE_ID = "selected-train-trail";
const GLOW_LAYER_ID = "selected-train-trail-glow";
const LINE_LAYER_ID = "selected-train-trail-line";

export function TrainTrailLayer(props: {
  map: MapInstance;
  positions: TrainPositionSample[];
  color: string;
}) {
  useEffect(() => {
    const addLayers = () => {
      if (props.map.getSource(SOURCE_ID)) return;

      props.map.addSource(SOURCE_ID, {
        type: "geojson",
        data: createTrailData([]),
        lineMetrics: true,
      });
      props.map.addLayer({
        id: GLOW_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": "#ffffff",
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 3, 15, 9],
          "line-opacity": 0.2,
          "line-blur": 3,
        },
      });
      props.map.addLayer({
        id: LINE_LAYER_ID,
        type: "line",
        source: SOURCE_ID,
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-width": ["interpolate", ["linear"], ["zoom"], 6, 1.5, 15, 4],
          "line-gradient": createTrailGradient("#ffffff"),
        },
      });
    };

    if (props.map.isStyleLoaded()) {
      addLayers();
    } else {
      props.map.once("load", addLayers);
    }

    return () => {
      props.map.off("load", addLayers);
      if (props.map.getLayer(LINE_LAYER_ID)) props.map.removeLayer(LINE_LAYER_ID);
      if (props.map.getLayer(GLOW_LAYER_ID)) props.map.removeLayer(GLOW_LAYER_ID);
      if (props.map.getSource(SOURCE_ID)) props.map.removeSource(SOURCE_ID);
    };
  }, [props.map]);

  useEffect(() => {
    const source = props.map.getSource(SOURCE_ID) as GeoJSONSource | undefined;

    source?.setData(createTrailData(props.positions));
    if (props.map.getLayer(GLOW_LAYER_ID)) {
      props.map.setPaintProperty(GLOW_LAYER_ID, "line-color", props.color);
    }
    if (props.map.getLayer(LINE_LAYER_ID)) {
      props.map.setPaintProperty(
        LINE_LAYER_ID,
        "line-gradient",
        createTrailGradient(props.color),
      );
    }
  }, [props.color, props.map, props.positions]);

  return null;
}

function createTrailData(positions: TrainPositionSample[]) {
  return {
    type: "FeatureCollection" as const,
    features:
      positions.length < 2
        ? []
        : [
            {
              type: "Feature" as const,
              properties: {},
              geometry: {
                type: "LineString" as const,
                coordinates: positions.map((position) => [
                  position.longitude,
                  position.latitude,
                ]),
              },
            },
          ],
  };
}

function createTrailGradient(color: string): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["line-progress"],
    0,
    withAlpha(color, 0),
    0.35,
    withAlpha(color, 0.35),
    1,
    color,
  ];
}

function withAlpha(color: string, alpha: number) {
  const hex = color.replace("#", "");
  const red = Number.parseInt(hex.slice(0, 2), 16);
  const green = Number.parseInt(hex.slice(2, 4), 16);
  const blue = Number.parseInt(hex.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}
