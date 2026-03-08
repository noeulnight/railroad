import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

type Direction = "UP" | "DOWN";

type Train = {
  id: string;
  type: string;
  direction: Direction;
  geometry: {
    bearing: number;
    longitude: number;
    latitude: number;
  };
  department: {
    station?: {
      name?: string;
    };
    date: string;
  };
  arrival: {
    stations?: {
      name?: string;
    };
    date: string;
  };
  currentStation?: {
    name?: string;
  };
  nextStation?: {
    name?: string;
  };
  delay: number;
};

type TrainSnapshotEventData = {
  trains: Train[];
  total: number;
  polledAt: string;
};

type TrainCreatedEventData = {
  train: Train;
  polledAt: string;
};

type TrainUpdatedEventData = {
  train: Train;
  polledAt: string;
};

type TrainRemovedEventData = {
  id: string;
  polledAt: string;
};

type Station = {
  name: string;
  grade?: number;
  geometry?: {
    longitude: number;
    latitude: number;
  };
};

const INITIAL_POSITION: [number, number] = [36.17, 127.83];

const MAP_BOUNDS = L.latLngBounds([32.5, 123.5], [39.0, 132.0]);

const panelStyle: CSSProperties = {
  position: "absolute",
  top: 16,
  left: 16,
  zIndex: 1000,
  width: 320,
  padding: 16,
  borderRadius: 16,
  background: "rgba(15, 23, 42, 0.88)",
  color: "#f8fafc",
  boxShadow: "0 18px 50px rgba(15, 23, 42, 0.35)",
  backdropFilter: "blur(12px)",
};

function getTrainEventsUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return new URL("/train/events", configuredBaseUrl).toString();
  }

  return "/train/events";
}

function getStationsUrl() {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return new URL("/station", configuredBaseUrl).toString();
  }

  return "/station";
}

function formatDateTime(value?: string) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

function getTrainColor(direction: Direction) {
  return direction === "UP" ? "#2563eb" : "#dc2626";
}

function shouldShowStation(zoom: number, grade?: number) {
  if (grade === undefined) {
    return false;
  }

  if (zoom >= 12) {
    return true;
  }

  if (zoom >= 10) {
    return grade <= 3;
  }

  if (zoom >= 9) {
    return grade <= 2;
  }

  return grade <= 1;
}

function ZoomStateTracker(props: { onZoomChange: (zoom: number) => void }) {
  useMapEvents({
    zoomend: (event) => {
      props.onZoomChange(event.target.getZoom());
    },
  });

  return null;
}

function App() {
  const [trains, setTrains] = useState<Record<string, Train>>({});
  const [stations, setStations] = useState<Station[]>([]);
  const [connectionState, setConnectionState] = useState("connecting");
  const [lastPolledAt, setLastPolledAt] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [stationError, setStationError] = useState<string>();
  const [zoomLevel, setZoomLevel] = useState(8);

  useEffect(() => {
    let isDisposed = false;

    void fetch(getStationsUrl())
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(`station request failed: ${response.status}`);
        }

        return (await response.json()) as Station[];
      })
      .then((data) => {
        if (isDisposed) {
          return;
        }

        setStations(data.filter((station) => station.geometry));
        setStationError(undefined);
      })
      .catch((error: unknown) => {
        if (isDisposed) {
          return;
        }

        setStationError("역 정보를 불러오지 못했습니다.");
        console.error(error);
      });

    return () => {
      isDisposed = true;
    };
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(getTrainEventsUrl());

    const handleSnapshot = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainSnapshotEventData;
      const nextTrains = Object.fromEntries(
        data.trains.map((train) => [train.id, train]),
      );

      setTrains(nextTrains);
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
      setErrorMessage(undefined);
    };

    const handleCreated = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainCreatedEventData;

      setTrains((current) => ({
        ...current,
        [data.train.id]: data.train,
      }));
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
    };

    const handleUpdated = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainUpdatedEventData;

      setTrains((current) => ({
        ...current,
        [data.train.id]: data.train,
      }));
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
    };

    const handleRemoved = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainRemovedEventData;

      setTrains((current) => {
        const next = { ...current };
        delete next[data.id];
        return next;
      });
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
    };

    const handleOpen = () => {
      setConnectionState("live");
      setErrorMessage(undefined);
    };

    const handleError = () => {
      setConnectionState("reconnecting");
      setErrorMessage("SSE 연결이 끊어져 재연결을 시도 중입니다.");
    };

    eventSource.addEventListener("snapshot", handleSnapshot as EventListener);
    eventSource.addEventListener("created", handleCreated as EventListener);
    eventSource.addEventListener("updated", handleUpdated as EventListener);
    eventSource.addEventListener("removed", handleRemoved as EventListener);
    eventSource.onopen = handleOpen;
    eventSource.onerror = handleError;

    return () => {
      eventSource.removeEventListener(
        "snapshot",
        handleSnapshot as EventListener,
      );
      eventSource.removeEventListener(
        "created",
        handleCreated as EventListener,
      );
      eventSource.removeEventListener(
        "updated",
        handleUpdated as EventListener,
      );
      eventSource.removeEventListener(
        "removed",
        handleRemoved as EventListener,
      );
      eventSource.close();
    };
  }, []);

  const trainList = Object.values(trains);
  const visibleStations = stations.filter((station) =>
    shouldShowStation(zoomLevel, station.grade),
  );

  return (
    <div style={{ position: "relative" }}>
      <div style={panelStyle}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <strong style={{ fontSize: 18 }}>실시간 열차 위치</strong>
          <span
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              background:
                connectionState === "live"
                  ? "rgba(34, 197, 94, 0.2)"
                  : "rgba(245, 158, 11, 0.2)",
              color: connectionState === "live" ? "#86efac" : "#fcd34d",
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {connectionState === "live" ? "연결됨" : "재연결 중"}
          </span>
        </div>
        <div style={{ fontSize: 14, opacity: 0.9 }}>
          현재 표시 열차 {trainList.length}대
        </div>
        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>
          역 마커 {visibleStations.length}/{stations.length}개
        </div>
        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>
          현재 줌 {zoomLevel.toFixed(1)}
        </div>
        <div style={{ marginTop: 4, fontSize: 13, opacity: 0.75 }}>
          마지막 수신 {formatDateTime(lastPolledAt)}
        </div>
        {errorMessage ? (
          <div style={{ marginTop: 10, fontSize: 13, color: "#fda4af" }}>
            {errorMessage}
          </div>
        ) : null}
        {stationError ? (
          <div style={{ marginTop: 10, fontSize: 13, color: "#fdba74" }}>
            {stationError}
          </div>
        ) : null}
      </div>

      <MapContainer
        center={INITIAL_POSITION}
        zoom={8}
        zoomSnap={0.5}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        style={{ width: "100vw", height: "100vh" }}
      >
        <ZoomStateTracker onZoomChange={setZoomLevel} />

        <TileLayer
          url="https://tiles.osm.kr/hot/{z}/{x}/{y}.png"
          maxZoom={20}
          minZoom={8}
        />

        {visibleStations.map((station) => (
          <CircleMarker
            key={station.name}
            center={[
              station.geometry!.latitude,
              station.geometry!.longitude,
            ]}
            radius={3}
            pathOptions={{
              color: "#0f172a",
              weight: 1,
              fillColor: "#f8fafc",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div style={{ minWidth: 140 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>
                  {station.name}
                </div>
                <div>등급: {station.grade ?? "-"}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

        {trainList.map((train) => (
          <CircleMarker
            key={train.id}
            center={[train.geometry.latitude, train.geometry.longitude]}
            radius={6}
            pathOptions={{
              color: "#ffffff",
              weight: 1,
              fillColor: getTrainColor(train.direction),
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div style={{ minWidth: 180 }}>
                <div style={{ fontWeight: 700, marginBottom: 6 }}>
                  {train.type} #{train.id}
                </div>
                <div>방향: {train.direction === "UP" ? "상행" : "하행"}</div>
                <div>현재역: {train.currentStation?.name ?? "-"}</div>
                <div>다음역: {train.nextStation?.name ?? "-"}</div>
                <div>지연: {train.delay}분</div>
                <div>업데이트: {formatDateTime(lastPolledAt)}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

export default App;
