import { MapContainer, Marker, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapZoomTracker } from "../components/MapZoomTracker";
import { TrainPopup } from "../components/TrainPopup";
import { getTrainColor } from "../lib/format";
import type { DashboardData, Train } from "../types/dashboard";
import L from "leaflet";
import { memo, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const INITIAL_POSITION: [number, number] = [36.17, 127.83];
const MAP_BOUNDS = L.latLngBounds([32.5, 123.5], [39.0, 132.0]);
const TRAIN_MARKER_EASING_DURATION_MS = 1400;

export function LiveMapPage(props: {
  data: DashboardData;
  theme: "light" | "dark";
}) {
  const { data, theme } = props;
  const [selectedTrainId, setSelectedTrainId] = useState<string>();
  const [isFollowingTrain, setIsFollowingTrain] = useState(false);
  const [urlSelection, setUrlSelection] = useState(readTrainSelectionFromUrl);
  const zoomTargetType = urlSelection.type;
  const zoomTargetId = urlSelection.id;
  const attemptedZoomTargetRef = useRef<string | undefined>(undefined);
  const selectedTrain = data.trains.find(
    (train) => train.id === selectedTrainId,
  );
  const selectedTrainPosition = selectedTrain
    ? ([selectedTrain.geometry.latitude, selectedTrain.geometry.longitude] as [
        number,
        number,
      ])
    : undefined;

  const updateTrainSearchParams = (train?: Pick<Train, "id" | "type">) => {
    const nextParams = new URLSearchParams(window.location.search);

    if (!train) {
      nextParams.delete("type");
      nextParams.delete("id");
    } else {
      nextParams.set(
        "type",
        normalizeTrainQueryParam(train.type) ?? train.type,
      );
      nextParams.set("id", train.id);
    }

    window.history.replaceState(
      window.history.state,
      "",
      `${window.location.pathname}${nextParams.toString() ? `?${nextParams.toString()}` : ""}${window.location.hash}`,
    );
    setUrlSelection({
      type: nextParams.get("type"),
      id: nextParams.get("id"),
    });
  };

  const selectTrain = (train: Pick<Train, "id" | "type">, follow = true) => {
    setSelectedTrainId(train.id);
    setIsFollowingTrain(follow);
    updateTrainSearchParams(train);
  };

  const clearSelectedTrain = () => {
    setSelectedTrainId(undefined);
    setIsFollowingTrain(false);
    updateTrainSearchParams(undefined);
  };

  useEffect(() => {
    const handlePopState = () => {
      setUrlSelection(readTrainSelectionFromUrl());
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  useEffect(() => {
    const requestedType = normalizeTrainQueryParam(zoomTargetType);
    const requestedId = zoomTargetId?.trim();

    if (!requestedType || !requestedId) {
      attemptedZoomTargetRef.current = undefined;
      return;
    }

    const zoomTargetKey = `${requestedType}:${requestedId}`;

    if (attemptedZoomTargetRef.current === zoomTargetKey) {
      return;
    }

    const matchingTrain = data.trains.find(
      (train) =>
        train.id === requestedId &&
        normalizeTrainQueryParam(train.type) === requestedType,
    );

    if (!matchingTrain) {
      return;
    }

    attemptedZoomTargetRef.current = zoomTargetKey;
    const animationFrameId = requestAnimationFrame(() => {
      setSelectedTrainId(matchingTrain.id);
      setIsFollowingTrain(true);
    });

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [data.trains, zoomTargetId, zoomTargetType]);

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {selectedTrain ? (
        <div className="pointer-events-none fixed inset-0 z-1000 flex items-end justify-center bg-slate-950/30 p-3 md:absolute md:inset-y-0 md:right-0 md:left-auto md:items-stretch md:justify-end md:bg-transparent md:p-0 md:py-4 md:pr-4">
          <div className="pointer-events-auto relative flex h-[calc(100vh-7.5rem)] w-full max-w-sm flex-col items-end gap-2 md:h-full md:w-auto">
            <button
              aria-label="열차 정보 닫기"
              className="bg-card text-muted-foreground border-border/70 z-10 flex cursor-pointer items-center justify-center rounded-sm border px-3 py-2 font-bold shadow-lg"
              onClick={clearSelectedTrain}
              type="button"
            >
              <X className="size-4 mr-2" />
              닫기
            </button>
            <div className="leaflet-popup-content-wrapper h-full w-full overflow-hidden">
              <div className="leaflet-popup-content h-full">
                <TrainPopup
                  key={`${selectedTrain.id}-${selectedTrain.department.date}`}
                  train={selectedTrain}
                  lastPolledAt={data.lastPolledAt}
                />
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <MapContainer
        center={INITIAL_POSITION}
        zoom={data.zoomLevel}
        zoomSnap={0.5}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-screen w-screen"
      >
        <StaticMapLayers
          theme={theme}
          onZoomChange={data.setZoomLevel}
          onUserMoveStart={selectedTrain ? clearSelectedTrain : undefined}
          followPosition={isFollowingTrain ? selectedTrainPosition : undefined}
          focusKey={selectedTrain?.id}
          focusZoom={selectedTrain ? Math.max(data.zoomLevel, 15) : undefined}
        />
        <TrainMarkersLayer
          trains={data.trains}
          zoomLevel={data.zoomLevel}
          selectedTrainId={selectedTrainId}
          onTrainToggle={selectTrain}
          onTrainClear={clearSelectedTrain}
        />
      </MapContainer>
    </div>
  );
}

const StaticMapLayers = memo(function StaticMapLayers(props: {
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
        attribution='&copy; <a href="https://openstreetmap.org/copyright">OpenStreetMap contributors</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={20}
        minZoom={8}
      />

      <TileLayer
        url="https://osm.lth.so/tiles/railway/{z}/{x}/{y}.png"
        attribution='&copy; <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA 2.0</a> <a href="https://www.openrailwaymap.org/">OpenRailwayMap</a> and <a href="https://osm.org/copyright"</a>OpenStreetMap</a>'
        maxZoom={20}
        minZoom={8}
      />
    </>
  );
});

const TrainMarkersLayer = memo(function TrainMarkersLayer(props: {
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

function getTrainPrimaryColor(type: string) {
  const normalized = normalizeTrainQueryParam(type);

  switch (normalized) {
    case "srt":
      return "#651C5C";
    case "ktx산천":
    case "ktx":
    case "ktx이음":
    case "청룡":
      return "#1B4298";
    case "무궁화":
    case "누리로":
    case "새마을":
      return "#54565A";
    case "itx":
    case "itx새마을":
    case "itx마음":
    case "itx청춘":
      return "#C10230";
    default:
      return "#54565A";
  }
}

function normalizeTrainQueryParam(value?: string | null) {
  return value?.trim().toLowerCase().replaceAll(/\s+/g, "").replaceAll("-", "");
}

function readTrainSelectionFromUrl() {
  const searchParams = new URLSearchParams(window.location.search);

  return {
    type: searchParams.get("type"),
    id: searchParams.get("id"),
  };
}

function createTrainIcon(
  train: DashboardData["trains"][number],
  zoomLevel: number,
) {
  const primaryColor = getTrainPrimaryColor(train.type);
  const directionColor = getTrainColor(train.direction);
  const bearingScale = Number.isFinite(train.geometry.bearing)
    ? train.geometry.bearing
    : 0;
  const bearing = bearingScale * 36;
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

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
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
