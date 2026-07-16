import { memo, useEffect, useRef, useState } from "react";
import type {
  GeoJSONSource,
  Map as MapInstance,
  MapLayerMouseEvent,
} from "maplibre-gl";
import type { DashboardData, Train } from "@/entities/train/model/types";
import type { TrainVisualizationMode } from "@/pages/live-map/model/trainVisualization";
import { getTrainVisualizationColor } from "@/pages/live-map/model/trainVisualization";
import { easeOutCubic } from "@/shared/lib/utils";

const SOURCE_ID = "train-markers";
const SHADOW_LAYER_ID = "train-marker-shadows";
const CIRCLE_LAYER_ID = "train-marker-circles";
const ARROW_LAYER_ID = "train-marker-arrows";
const DELAY_LAYER_ID = "train-marker-delays";
const LABEL_LAYER_ID = "train-marker-labels";
const ARROW_IMAGE_ID = "train-marker-arrow";
const INTERACTIVE_LAYER_IDS = [
  LABEL_LAYER_ID,
  DELAY_LAYER_ID,
  ARROW_LAYER_ID,
  CIRCLE_LAYER_ID,
];
const TRAIN_MARKER_EASING_DURATION_MS = 1_400;
const TRAIN_MARKER_FRAME_INTERVAL_MS = 1_000 / 30;
const TRAIN_LABEL_MIN_ZOOM = 11.5;
const IMAGE_PIXEL_RATIO = 2;

type TrainMarkerProperties = {
  id: string;
  type: string;
  color: string;
  bearing: number;
  selected: number;
  delayed: number;
  labelImageId: string;
};

type TrainMarkerData = {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    id: string;
    properties: TrainMarkerProperties;
    geometry: { type: "Point"; coordinates: [number, number] };
  }>;
};

export const TrainMarkersLayer = memo(function TrainMarkersLayer(props: {
  map: MapInstance;
  trains: DashboardData["trains"];
  theme: "light" | "dark";
  visualizationMode: TrainVisualizationMode;
  selectedTrainId?: string;
  onTrainToggle: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
  onTrainClear: () => void;
}) {
  const {
    map,
    trains,
    theme,
    visualizationMode,
    selectedTrainId,
    onTrainToggle,
    onTrainClear,
  } = props;
  const [layersReady, setLayersReady] = useState(false);
  const labelImageIdsRef = useRef(new Set<string>());
  const displayedPositionsRef = useRef(new Map<string, [number, number]>());

  useEffect(() => {
    const addLayers = () => {
      if (map.getSource(SOURCE_ID)) return;

      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: emptyTrainData(),
      });
      map.addImage(ARROW_IMAGE_ID, createArrowImage(), {
        pixelRatio: IMAGE_PIXEL_RATIO,
      });
      map.addLayer({
        id: SHADOW_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": "rgba(15, 23, 42, 0.22)",
          "circle-blur": 0.35,
          "circle-radius": [
            "step",
            ["zoom"],
            ["case", ["==", ["get", "selected"], 1], 16, 11],
            7.5,
            ["case", ["==", ["get", "selected"], 1], 16, 15],
          ],
        },
      });
      map.addLayer({
        id: CIRCLE_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-color": ["get", "color"],
          "circle-radius": [
            "step",
            ["zoom"],
            ["case", ["==", ["get", "selected"], 1], 13, 8],
            7.5,
            ["case", ["==", ["get", "selected"], 1], 13, 12],
          ],
        },
      });
      map.addLayer({
        id: ARROW_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        layout: {
          "icon-image": ARROW_IMAGE_ID,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "viewport",
          "icon-size": [
            "step",
            ["zoom"],
            ["case", ["==", ["get", "selected"], 1], 1.1, 0.75],
            7.5,
            ["case", ["==", ["get", "selected"], 1], 1.1, 1],
          ],
        },
      });
      map.addLayer({
        id: DELAY_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "delayed"], 1],
        paint: {
          "circle-color": "#ef4444",
          "circle-radius": 3,
          "circle-translate": [7, -7],
          "circle-translate-anchor": "viewport",
        },
      });
      map.addLayer({
        id: LABEL_LAYER_ID,
        type: "symbol",
        source: SOURCE_ID,
        minzoom: TRAIN_LABEL_MIN_ZOOM,
        layout: {
          "icon-image": ["get", "labelImageId"],
          "icon-anchor": "left",
          "icon-offset": [14, 0],
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
      setLayersReady(true);
    };

    if (map.isStyleLoaded()) addLayers();
    else map.once("load", addLayers);

    return () => {
      map.off("load", addLayers);
      for (const layerId of [
        LABEL_LAYER_ID,
        DELAY_LAYER_ID,
        ARROW_LAYER_ID,
        CIRCLE_LAYER_ID,
        SHADOW_LAYER_ID,
      ]) {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
      }
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
      for (const imageId of labelImageIdsRef.current) {
        if (map.hasImage(imageId)) map.removeImage(imageId);
      }
      labelImageIdsRef.current.clear();
      if (map.hasImage(ARROW_IMAGE_ID)) {
        map.removeImage(ARROW_IMAGE_ID);
      }
    };
  }, [map]);

  useEffect(() => {
    if (!layersReady) return;

    const source = map.getSource(SOURCE_ID) as GeoJSONSource | undefined;
    if (!source) return;

    const nextImageIds = new Set<string>();
    for (const train of trains) {
      const color = getTrainVisualizationColor(train, visualizationMode);
      const imageId = getLabelImageId(train, color, theme);
      nextImageIds.add(imageId);

      if (!map.hasImage(imageId)) {
        map.addImage(imageId, createLabelImage(train, color, theme), {
          pixelRatio: IMAGE_PIXEL_RATIO,
        });
      }
    }

    const previousImageIds = labelImageIdsRef.current;
    labelImageIdsRef.current = nextImageIds;
    for (const imageId of previousImageIds) {
      if (!nextImageIds.has(imageId) && map.hasImage(imageId)) {
        map.removeImage(imageId);
      }
    }

    const starts = new Map<string, [number, number]>();
    let hasMovement = false;
    for (const train of trains) {
      const target: [number, number] = [
        train.geometry.longitude,
        train.geometry.latitude,
      ];
      const start = displayedPositionsRef.current.get(train.id) ?? target;
      starts.set(train.id, start);
      hasMovement ||= start[0] !== target[0] || start[1] !== target[1];
    }

    const updateSource = (progress: number) => {
      const easedProgress = easeOutCubic(progress);
      const positions = new Map<string, [number, number]>();

      for (const train of trains) {
        const start = starts.get(train.id)!;
        positions.set(train.id, [
          start[0] + (train.geometry.longitude - start[0]) * easedProgress,
          start[1] + (train.geometry.latitude - start[1]) * easedProgress,
        ]);
      }

      displayedPositionsRef.current = positions;
      source.setData(
        createTrainData(
          { trains, theme, visualizationMode, selectedTrainId },
          positions,
        ),
      );
    };

    if (!hasMovement) {
      updateSource(1);
      return;
    }

    const animationStartedAt = performance.now();
    let lastRenderedAt = 0;
    let animationFrameId = requestAnimationFrame(function animate(frameTime) {
      const progress = Math.min(
        (frameTime - animationStartedAt) / TRAIN_MARKER_EASING_DURATION_MS,
        1,
      );

      if (
        progress === 1 ||
        frameTime - lastRenderedAt >= TRAIN_MARKER_FRAME_INTERVAL_MS
      ) {
        lastRenderedAt = frameTime;
        updateSource(progress);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(animate);
      }
    });

    return () => cancelAnimationFrame(animationFrameId);
  }, [
    layersReady,
    map,
    selectedTrainId,
    theme,
    trains,
    visualizationMode,
  ]);

  useEffect(() => {
    const handleClick = (event: MapLayerMouseEvent) => {
      const properties = event.features?.[0]?.properties as
        | TrainMarkerProperties
        | undefined;
      if (!properties) return;

      if (properties.id === selectedTrainId) onTrainClear();
      else onTrainToggle({ id: properties.id, type: properties.type });
    };
    const showPointer = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const hidePointer = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("click", INTERACTIVE_LAYER_IDS, handleClick);
    map.on("mouseenter", INTERACTIVE_LAYER_IDS, showPointer);
    map.on("mouseleave", INTERACTIVE_LAYER_IDS, hidePointer);

    return () => {
      map.off("click", INTERACTIVE_LAYER_IDS, handleClick);
      map.off("mouseenter", INTERACTIVE_LAYER_IDS, showPointer);
      map.off("mouseleave", INTERACTIVE_LAYER_IDS, hidePointer);
      hidePointer();
    };
  }, [map, onTrainClear, onTrainToggle, selectedTrainId]);

  return null;
});

function createTrainData(
  props: {
    trains: DashboardData["trains"];
    theme: "light" | "dark";
    visualizationMode: TrainVisualizationMode;
    selectedTrainId?: string;
  },
  positions: Map<string, [number, number]>,
): TrainMarkerData {
  return {
    type: "FeatureCollection",
    features: props.trains.map((train) => {
      const color = getTrainVisualizationColor(train, props.visualizationMode);

      return {
        type: "Feature",
        id: train.id,
        properties: {
          id: train.id,
          type: train.type,
          color,
          bearing:
            ((train.geometry.bearing * 180) / Math.PI - 90 + 360) % 360,
          selected: train.id === props.selectedTrainId ? 1 : 0,
          delayed: train.delay > 0 ? 1 : 0,
          labelImageId: getLabelImageId(train, color, props.theme),
        },
        geometry: {
          type: "Point",
          coordinates: positions.get(train.id) ?? [
            train.geometry.longitude,
            train.geometry.latitude,
          ],
        },
      };
    }),
  };
}

function emptyTrainData(): TrainMarkerData {
  return { type: "FeatureCollection", features: [] };
}

function getLabelImageId(
  train: Train,
  color: string,
  theme: "light" | "dark",
) {
  return `train-label:${theme}:${color}:${train.type}:${train.id}:${train.delay}`;
}

function createArrowImage() {
  const canvas = document.createElement("canvas");
  canvas.width = 18 * IMAGE_PIXEL_RATIO;
  canvas.height = 18 * IMAGE_PIXEL_RATIO;
  const context = canvas.getContext("2d")!;
  context.scale(IMAGE_PIXEL_RATIO, IMAGE_PIXEL_RATIO);
  context.fillStyle = "rgba(255, 255, 255, 0.92)";
  context.beginPath();
  context.moveTo(3, 4.5);
  context.lineTo(16, 9);
  context.lineTo(3, 13.5);
  context.lineTo(6, 9);
  context.closePath();
  context.fill();
  return context.getImageData(0, 0, canvas.width, canvas.height);
}

function createLabelImage(
  train: Train,
  color: string,
  theme: "light" | "dark",
) {
  const label = `${train.type}#${train.id}`;
  const delay = train.delay > 0 ? ` +${train.delay}분` : "";
  const measurementCanvas = document.createElement("canvas");
  const measurementContext = measurementCanvas.getContext("2d")!;
  measurementContext.font = "700 11px system-ui, sans-serif";
  const labelWidth = measurementContext.measureText(label).width;
  const delayWidth = measurementContext.measureText(delay).width;
  const width = Math.ceil(20 + labelWidth + delayWidth + (delay ? 4 : 0));
  const height = 22;
  const canvas = document.createElement("canvas");
  canvas.width = width * IMAGE_PIXEL_RATIO;
  canvas.height = height * IMAGE_PIXEL_RATIO;
  const context = canvas.getContext("2d")!;
  context.scale(IMAGE_PIXEL_RATIO, IMAGE_PIXEL_RATIO);
  context.beginPath();
  context.roundRect(0.5, 0.5, width - 1, height - 1, height / 2);
  context.fillStyle = theme === "dark" ? "rgba(24, 24, 27, 0.95)" : "rgba(255, 255, 255, 0.95)";
  context.fill();
  context.strokeStyle = theme === "dark" ? "rgba(63, 63, 70, 0.8)" : "rgba(226, 232, 240, 0.9)";
  context.stroke();
  context.beginPath();
  context.arc(8, height / 2, 3, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
  context.font = "700 11px system-ui, sans-serif";
  context.textBaseline = "middle";
  context.fillStyle = theme === "dark" ? "#fafafa" : "#18181b";
  context.fillText(label, 14, height / 2);
  if (delay) {
    context.fillStyle = "#ef4444";
    context.fillText(delay, 14 + labelWidth + 4, height / 2);
  }
  return context.getImageData(0, 0, canvas.width, canvas.height);
}
