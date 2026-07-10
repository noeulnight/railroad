import type { Station } from "@/entities/station/model/types";

export type Direction = "UP" | "DOWN";

export type Train = {
  id: string;
  type: string;
  direction: Direction;
  geometry: {
    bearing: number;
    longitude: number;
    latitude: number;
  };
  departure: {
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
  speedKmh: number | null;
};

export type TrainScheduleItem = {
  id: string;
  date: string;
  delay: number;
  station: Station;
  arrivalTime: string;
  departureTime: string;
};

export type TrainSnapshotEventData = {
  trains: Train[];
  total: number;
  polledAt: string;
};

export type TrainCreatedEventData = {
  train: Train;
  polledAt: string;
};

export type TrainUpdatedEventData = {
  train: Train;
  polledAt: string;
};

export type TrainRemovedEventData = {
  id: string;
  polledAt: string;
};

export type DashboardData = {
  connectionState: "connecting" | "live" | "reconnecting";
  errorMessage?: string;
  lastPolledAt?: string;
  stationError?: string;
  stations: Station[];
  trains: Train[];
  visibleStations: Station[];
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};
