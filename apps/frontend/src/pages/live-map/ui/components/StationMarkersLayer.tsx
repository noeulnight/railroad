import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Marker as MapLibreMarker,
  type Map as MapInstance,
} from "maplibre-gl";
import type { Station } from "@/entities/station/model/types";
import { cn } from "@/shared/lib/utils";

export const StationMarkersLayer = memo(function StationMarkersLayer(props: {
  map: MapInstance;
  stations: Station[];
  selectedStationName?: string;
  onStationToggle: (station: Station) => void;
}) {
  const [bounds, setBounds] = useState(() => props.map.getBounds());
  const [isMoving, setIsMoving] = useState(false);

  useEffect(() => {
    const handleMoveStart = () => setIsMoving(true);
    const handleMoveEnd = () => {
      setBounds(props.map.getBounds());
      setIsMoving(false);
    };

    props.map.on("movestart", handleMoveStart);
    props.map.on("moveend", handleMoveEnd);

    return () => {
      props.map.off("movestart", handleMoveStart);
      props.map.off("moveend", handleMoveEnd);
    };
  }, [props.map]);

  const renderedStations = props.stations.filter((station) => {
    if (station.name === props.selectedStationName) return true;
    if (isMoving || !station.geometry) return false;

    return bounds.contains([
      station.geometry.longitude,
      station.geometry.latitude,
    ]);
  });

  return renderedStations.map((station) => (
    <StationMarker
      key={station.name}
      map={props.map}
      station={station}
      isSelected={station.name === props.selectedStationName}
      onStationToggle={props.onStationToggle}
    />
  ));
});

const StationMarker = memo(function StationMarker(props: {
  map: MapInstance;
  station: Station;
  isSelected: boolean;
  onStationToggle: (station: Station) => void;
}) {
  const [markerElement] = useState(() => document.createElement("div"));
  const longitude = props.station.geometry?.longitude;
  const latitude = props.station.geometry?.latitude;

  useEffect(() => {
    if (longitude === undefined || latitude === undefined) return;

    markerElement.style.zIndex = props.isSelected ? "2" : "0";
    const marker = new MapLibreMarker({
      element: markerElement,
      anchor: "left",
      offset: [-6, 0],
    })
      .setLngLat([longitude, latitude])
      .addTo(props.map);

    return () => {
      marker.remove();
    };
  }, [latitude, longitude, markerElement, props.isSelected, props.map]);

  return createPortal(
    <button
      type="button"
      aria-label={`${props.station.name}역 선택`}
      aria-pressed={props.isSelected}
      className="group flex cursor-pointer items-center gap-1 border-0 bg-transparent p-0 focus-visible:outline-none"
      onClick={() => props.onStationToggle(props.station)}
    >
      <span
        className={cn(
          "relative flex size-3 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_1px_5px_rgba(15,23,42,0.5)] transition-transform group-hover:scale-125",
          props.isSelected && "scale-125 bg-blue-600",
        )}
      >
        <span
          className={cn(
            "size-1.5 rounded-full bg-slate-700",
            props.isSelected && "size-2 bg-white",
          )}
        />
      </span>
      <span
        className={cn(
          "whitespace-nowrap rounded bg-card/90 px-1.5 py-0.5 text-[10px] leading-none font-semibold text-card-foreground shadow-sm backdrop-blur-sm",
          props.isSelected && "bg-blue-600 text-white",
        )}
      >
        {props.station.name}
      </span>
    </button>,
    markerElement,
  );
});
