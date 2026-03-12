import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { MapZoomTracker } from "../components/MapZoomTracker";
import { TrainPopup } from "../components/TrainPopup";
import { formatTrainSpeed, getTrainColor } from "../lib/format";
import type { DashboardData } from "../types/dashboard";
import L from "leaflet";
import { useState } from "react";
import { X } from "lucide-react";

const INITIAL_POSITION: [number, number] = [36.17, 127.83];
const MAP_BOUNDS = L.latLngBounds([32.5, 123.5], [39.0, 132.0]);

export function LiveMapPage(props: { data: DashboardData }) {
  const { data } = props;
  const [selectedTrainId, setSelectedTrainId] = useState<string>();
  const selectedTrain = data.trains.find((train) => train.id === selectedTrainId);
  const selectedTrainPosition = selectedTrain
    ? ([
        selectedTrain.geometry.latitude,
        selectedTrain.geometry.longitude,
      ] as [number, number])
    : undefined;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      {selectedTrain ? (
        <div className="pointer-events-none fixed inset-0 z-1000 flex items-end justify-center bg-slate-950/30 p-3 md:absolute md:inset-y-0 md:right-0 md:left-auto md:items-stretch md:justify-end md:bg-transparent md:p-0 md:py-4 md:pr-4">
          <div className="pointer-events-auto relative flex h-[calc(100vh-7.5rem)] w-full max-w-sm flex-col items-end gap-2 md:h-full md:w-auto">
            <button
              aria-label="열차 정보 닫기"
              className="z-10 flex px-3 py-2 items-center justify-center rounded-sm bg-white text-slate-500 shadow-lg cursor-pointer font-bold"
              onClick={() => {
                setSelectedTrainId(undefined);
              }}
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
        zoom={8}
        zoomSnap={0.5}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-screen w-screen"
      >
        <MapZoomTracker
          onZoomChange={data.setZoomLevel}
          followPosition={selectedTrainPosition}
          focusKey={selectedTrain?.id}
          focusZoom={
            selectedTrain ? Math.max(data.zoomLevel, 15) : undefined
          }
        />

        <TileLayer
          url="https://tiles.osm.kr/hot/{z}/{x}/{y}.png"
          maxZoom={20}
          minZoom={8}
        />

        {data.trains.map((train) => (
          <Marker
            key={train.id}
            position={[train.geometry.latitude, train.geometry.longitude]}
            icon={createTrainIcon(train, data.zoomLevel)}
            eventHandlers={{
              click: () => {
                setSelectedTrainId((current) =>
                  current === train.id ? undefined : train.id,
                );
              },
            }}
          />
        ))}

        {data.visibleStations.map((station) => (
          <CircleMarker
            key={station.name}
            center={[station.geometry!.latitude, station.geometry!.longitude]}
            radius={3}
            pathOptions={{
              color: "#0f172a",
              weight: 1,
              fillColor: "#f8fafc",
              fillOpacity: 0.9,
            }}
          >
            <Popup>
              <div className="min-w-36">
                <div className="mb-1 font-bold">{station.name}</div>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

function getTrainPrimaryColor(type: string) {
  const normalized = type.toLowerCase().replaceAll(" ", "").replaceAll("-", "");

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

function createTrainIcon(
  train: DashboardData["trains"][number],
  zoomLevel: number,
) {
  const primaryColor = getTrainPrimaryColor(train.type);
  const directionColor = getTrainColor(train.direction);
  const speedLabel = formatTrainSpeed(train.speedKph);
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
          <div style="display:flex;align-items:center;justify-content:center;width:24px;height:24px;font-size:11px;line-height:1;font-weight:800;transform:rotate(${bearing}deg);transform-origin:center center;color:${directionColor === "#dc2626" ? "#fee2e2" : "#dbeafe"};">&gt;</div>
        </div>
        ${
          showLabel
            ? `<div style="display:flex;align-items:center;gap:6px;padding:${speedLabel ? '2px 2px 2px 8px' : '2px 8px'};border-radius:9999px;background:${primaryColor};color:#ffffff;font-size:11px;line-height:1.2;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(15,23,42,0.12);"><span>${trainLabel}</span>${
                speedLabel
                  ? `<span style="padding:1px 6px;border-radius:9999px;background:rgba(255,255,255,0.18);font-size:10px;font-weight:700;">${escapeHtml(speedLabel)}</span>`
                  : ""
              }</div>`
            : ""
        }
      </div>
    `,
    iconSize: showLabel ? [speedLabel ? 168 : 96, 24] : [24, 24],
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
