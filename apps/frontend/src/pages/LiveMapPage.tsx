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
import { getTrainColor } from "../lib/format";
import type { DashboardData } from "../types/dashboard";
import L from "leaflet";

const INITIAL_POSITION: [number, number] = [36.17, 127.83];
const MAP_BOUNDS = L.latLngBounds([32.5, 123.5], [39.0, 132.0]);

export function LiveMapPage(props: { data: DashboardData }) {
  const { data } = props;

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <MapContainer
        center={INITIAL_POSITION}
        zoom={8}
        zoomSnap={0.5}
        maxBounds={MAP_BOUNDS}
        maxBoundsViscosity={1}
        zoomControl={false}
        className="h-screen w-screen"
      >
        <MapZoomTracker onZoomChange={data.setZoomLevel} />

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
          >
            <Popup className="m-0 p-0 select-none">
              <TrainPopup
                key={`${train.id}-${train.department.date}`}
                train={train}
                lastPolledAt={data.lastPolledAt}
              />
            </Popup>
          </Marker>
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
            ? `<div style="padding:2px 8px;border-radius:9999px;background:${primaryColor};color:#ffffff;font-size:11px;line-height:1.2;font-weight:700;white-space:nowrap;box-shadow:0 4px 12px rgba(15,23,42,0.12);">${trainLabel}</div>`
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
