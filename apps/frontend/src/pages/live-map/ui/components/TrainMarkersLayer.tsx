import { memo, useEffect, useRef, useState } from "react";
import { Marker } from "react-leaflet";
import L from "leaflet";
import type { DashboardData, Train } from "@/entities/train/model/types";
import {
  easeOutCubic,
  escapeHtml,
  getTrainColor,
  getTrainPrimaryColor,
} from "@/shared/lib/utils";

const TRAIN_MARKER_EASING_DURATION_MS = 1400;

export const TrainMarkersLayer = memo(function TrainMarkersLayer(props: {
  trains: DashboardData["trains"];
  zoomLevel: number;
  selectedTrainId?: string;
  onTrainToggle: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
  onTrainClear: () => void;
}) {
  const { trains, zoomLevel, selectedTrainId, onTrainToggle, onTrainClear } =
    props;

  return (
    <>
      {trains.map((train) => (
        <AnimatedTrainMarker
          key={train.id}
          train={train}
          zoomLevel={zoomLevel}
          isSelected={selectedTrainId === train.id}
          onTrainToggle={onTrainToggle}
          onTrainClear={onTrainClear}
        />
      ))}
    </>
  );
});

const AnimatedTrainMarker = memo(function AnimatedTrainMarker(props: {
  train: Train;
  zoomLevel: number;
  isSelected: boolean;
  onTrainToggle: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
  onTrainClear: () => void;
}) {
  const { train, zoomLevel, isSelected, onTrainToggle, onTrainClear } = props;
  const targetLatitude = train.geometry.latitude;
  const targetLongitude = train.geometry.longitude;
  const targetPosition = [targetLatitude, targetLongitude] as [number, number];
  const markerRef = useRef<L.Marker>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [position, setPosition] = useState(targetPosition);

  useEffect(() => {
    const marker = markerRef.current;

    if (!marker) {
      return;
    }

    const startPosition = marker.getLatLng();

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
      const nextPosition = [
        startPosition.lat +
          (targetLatitude - startPosition.lat) * easedProgress,
        startPosition.lng +
          (targetLongitude - startPosition.lng) * easedProgress,
      ] as [number, number];

      marker.setLatLng(nextPosition);
      setPosition(nextPosition);

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

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== undefined) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <Marker
      ref={markerRef}
      position={position}
      icon={createTrainIcon(train, zoomLevel)}
      eventHandlers={{
        click: () => {
          if (isSelected) {
            onTrainClear();
            return;
          }

          onTrainToggle(train);
        },
      }}
    />
  );
}, areTrainMarkerPropsEqual);

function createTrainIcon(
  train: DashboardData["trains"][number],
  zoomLevel: number,
) {
  const primaryColor = getTrainPrimaryColor(train.type);
  const directionColor = getTrainColor(train.direction);
  const bearing = ((train.geometry.bearing * 180) / Math.PI - 90 + 360) % 360;
  const showLabel = zoomLevel >= 11.5;
  const trainLabel = escapeHtml(`${train.type}#${train.id}`);

  return L.divIcon({
    className: "train-map-icon",
    html: `
      <div style="display:flex;align-items:center;gap:6px;">
        <div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:9999px;background:${primaryColor};box-shadow:0 4px 12px rgba(15,23,42,0.18);overflow:hidden;flex:none;">
          <div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;transform:rotate(${bearing}deg);transform-origin:center center;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" shape-rendering="geometricPrecision">
              <path d="m9 18 6-6-6-6" stroke="${directionColor === "#dc2626" ? "#fee2e2" : "#dbeafe"}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
            </svg>
          </div>
        </div>
        ${
          showLabel
            ? `<div style="display:flex;align-items:center;gap:6px;padding:2px 8px;border-radius:9999px;background:${primaryColor};color:#ffffff;font-size:11px;line-height:1.2;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(15,23,42,0.12);"><span>${trainLabel}</span></div>`
            : ""
        }
      </div>
    `,
    iconSize: showLabel ? [96, 24] : [24, 24],
    iconAnchor: [12, 12],
    popupAnchor: [0, -12],
  });
}

function areTrainMarkerPropsEqual(
  previous: Readonly<{
    train: Train;
    zoomLevel: number;
    isSelected: boolean;
    onTrainToggle: (
      train: Pick<Train, "id" | "type">,
      follow?: boolean,
    ) => void;
    onTrainClear: () => void;
  }>,
  next: Readonly<{
    train: Train;
    zoomLevel: number;
    isSelected: boolean;
    onTrainToggle: (
      train: Pick<Train, "id" | "type">,
      follow?: boolean,
    ) => void;
    onTrainClear: () => void;
  }>,
) {
  return (
    previous.zoomLevel === next.zoomLevel &&
    previous.isSelected === next.isSelected &&
    previous.onTrainToggle === next.onTrainToggle &&
    previous.onTrainClear === next.onTrainClear &&
    previous.train.id === next.train.id &&
    previous.train.type === next.train.type &&
    previous.train.direction === next.train.direction &&
    previous.train.geometry.latitude === next.train.geometry.latitude &&
    previous.train.geometry.longitude === next.train.geometry.longitude &&
    previous.train.geometry.bearing === next.train.geometry.bearing
  );
}
