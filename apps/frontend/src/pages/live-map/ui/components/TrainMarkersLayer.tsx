import { memo, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Marker as MapLibreMarker,
  type Map as MapInstance,
} from "maplibre-gl";
import type { DashboardData, Train } from "@/entities/train/model/types";
import type { TrainVisualizationMode } from "@/pages/live-map/model/trainVisualization";
import { getTrainVisualizationColor } from "@/pages/live-map/model/trainVisualization";
import { easeOutCubic } from "@/shared/lib/utils";

const TRAIN_MARKER_EASING_DURATION_MS = 1_400;
const TRAIN_LABEL_MIN_ZOOM = 11.5;

export const TrainMarkersLayer = memo(function TrainMarkersLayer(props: {
  map: MapInstance;
  trains: DashboardData["trains"];
  zoomLevel: number;
  visualizationMode: TrainVisualizationMode;
  selectedTrainId?: string;
  onTrainToggle: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
  onTrainClear: () => void;
}) {
  const {
    map,
    trains,
    zoomLevel,
    visualizationMode,
    selectedTrainId,
    onTrainToggle,
    onTrainClear,
  } = props;

  useEffect(() => {
    const container = map.getContainer();
    let labelsHidden: boolean | undefined;

    const syncLabelVisibility = () => {
      const nextLabelsHidden = map.getZoom() < TRAIN_LABEL_MIN_ZOOM;

      if (nextLabelsHidden === labelsHidden) {
        return;
      }

      labelsHidden = nextLabelsHidden;
      container.classList.toggle(
        "train-map-labels-hidden",
        nextLabelsHidden,
      );
    };

    syncLabelVisibility();
    map.on("zoom", syncLabelVisibility);

    return () => {
      map.off("zoom", syncLabelVisibility);
      container.classList.remove("train-map-labels-hidden");
    };
  }, [map]);

  return (
    <>
      {trains.map((train) => (
        <AnimatedTrainMarker
          key={train.id}
          map={map}
          train={train}
          zoomLevel={zoomLevel}
          visualizationMode={visualizationMode}
          isSelected={selectedTrainId === train.id}
          onTrainToggle={onTrainToggle}
          onTrainClear={onTrainClear}
        />
      ))}
    </>
  );
});

const AnimatedTrainMarker = memo(function AnimatedTrainMarker(props: {
  map: MapInstance;
  train: Train;
  zoomLevel: number;
  visualizationMode: TrainVisualizationMode;
  isSelected: boolean;
  onTrainToggle: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
  onTrainClear: () => void;
}) {
  const {
    map,
    train,
    zoomLevel,
    visualizationMode,
    isSelected,
    onTrainToggle,
    onTrainClear,
  } = props;
  const targetLatitude = train.geometry.latitude;
  const targetLongitude = train.geometry.longitude;
  const markerRef = useRef<MapLibreMarker | undefined>(undefined);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const initialPositionRef = useRef<[number, number]>([
    targetLongitude,
    targetLatitude,
  ]);
  const [markerElement] = useState(() => document.createElement("div"));

  useEffect(() => {
    markerElement.className = "train-map-icon";
    markerElement.style.width = "24px";
    markerElement.style.height = "24px";

    const marker = new MapLibreMarker({
      element: markerElement,
      anchor: "center",
    })
      .setLngLat(initialPositionRef.current)
      .addTo(map)
      .setSubpixelPositioning(true);

    markerRef.current = marker;

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      marker.remove();
      markerRef.current = undefined;
    };
  }, [map, markerElement]);

  useEffect(() => {
    const marker = markerRef.current;

    if (!marker) {
      return;
    }

    const startPosition = marker.getLngLat();

    if (
      startPosition.lat === targetLatitude &&
      startPosition.lng === targetLongitude
    ) {
      return;
    }

    const animationStartedAt = performance.now();

    const animate = (frameTime: number) => {
      const progress = Math.min(
        (frameTime - animationStartedAt) / TRAIN_MARKER_EASING_DURATION_MS,
        1,
      );
      const easedProgress = easeOutCubic(progress);

      marker.setLngLat([
        startPosition.lng +
          (targetLongitude - startPosition.lng) * easedProgress,
        startPosition.lat +
          (targetLatitude - startPosition.lat) * easedProgress,
      ]);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetLatitude, targetLongitude]);

  const primaryColor = getTrainVisualizationColor(train, visualizationMode);
  const bearing = ((train.geometry.bearing * 180) / Math.PI - 90 + 360) % 360;
  const isOverview = zoomLevel < 7.5;
  const showLabel = zoomLevel >= TRAIN_LABEL_MIN_ZOOM;
  const isDelayed = train.delay > 0;

  return createPortal(
    <button
      type="button"
      aria-label={`${train.type} ${train.id} 열차${isDelayed ? `, ${train.delay}분 지연` : ""} 선택`}
      aria-pressed={isSelected}
      className={`group relative flex h-6 w-max cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 transition-transform hover:scale-110 focus-visible:outline-none ${isSelected ? "scale-110" : ""}`}
      onClick={() => {
        if (isSelected) {
          onTrainClear();
          return;
        }

        onTrainToggle(train);
      }}
    >
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-full transition-shadow ${isOverview ? "size-4" : "size-6"}`}
        style={{
          backgroundColor: primaryColor,
          boxShadow: isOverview
            ? "0 2px 7px rgba(15,23,42,0.24)"
            : "0 4px 12px rgba(15,23,42,0.22)",
        }}
      >
        <span
          className={`flex items-center justify-center ${isOverview ? "size-3" : "size-[18px]"}`}
          style={{ transform: `rotate(${bearing}deg)` }}
        >
          <svg
            aria-hidden="true"
            fill="none"
            height={isOverview ? 11 : 15}
            shapeRendering="geometricPrecision"
            viewBox="0 0 24 24"
            width={isOverview ? 11 : 15}
          >
            <path
              d="M5.5 5.5 19.5 12l-14 6.5L8 12 5.5 5.5Z"
              fill="rgba(255,255,255,0.92)"
            />
          </svg>
        </span>
        {isDelayed ? (
          <span className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full bg-red-500 shadow-sm" />
        ) : null}
      </span>
      {showLabel ? (
        <span
          className="train-map-label flex items-center gap-1.5 whitespace-nowrap rounded-full border border-border/70 bg-card/95 px-2 py-1 text-[11px] leading-none font-bold text-card-foreground shadow-[0_4px_12px_rgba(15,23,42,0.14)] backdrop-blur-sm"
        >
          <span
            className="size-1.5 rounded-full"
            style={{ backgroundColor: primaryColor }}
          />
          <span>
            {train.type}#{train.id}
          </span>
          {isDelayed ? (
            <span className="font-semibold text-red-500">+{train.delay}분</span>
          ) : null}
        </span>
      ) : null}
    </button>,
    markerElement,
  );
}, areTrainMarkerPropsEqual);

function areTrainMarkerPropsEqual(
  previous: Readonly<{
    map: MapInstance;
    train: Train;
    zoomLevel: number;
    visualizationMode: TrainVisualizationMode;
    isSelected: boolean;
    onTrainToggle: (
      train: Pick<Train, "id" | "type">,
      follow?: boolean,
    ) => void;
    onTrainClear: () => void;
  }>,
  next: Readonly<{
    map: MapInstance;
    train: Train;
    zoomLevel: number;
    visualizationMode: TrainVisualizationMode;
    isSelected: boolean;
    onTrainToggle: (
      train: Pick<Train, "id" | "type">,
      follow?: boolean,
    ) => void;
    onTrainClear: () => void;
  }>,
) {
  return (
    previous.map === next.map &&
    previous.zoomLevel === next.zoomLevel &&
    previous.visualizationMode === next.visualizationMode &&
    previous.isSelected === next.isSelected &&
    previous.onTrainToggle === next.onTrainToggle &&
    previous.onTrainClear === next.onTrainClear &&
    previous.train.id === next.train.id &&
    previous.train.type === next.train.type &&
    previous.train.direction === next.train.direction &&
    previous.train.delay === next.train.delay &&
    previous.train.speedKmh === next.train.speedKmh &&
    previous.train.geometry.latitude === next.train.geometry.latitude &&
    previous.train.geometry.longitude === next.train.geometry.longitude &&
    previous.train.geometry.bearing === next.train.geometry.bearing
  );
}
