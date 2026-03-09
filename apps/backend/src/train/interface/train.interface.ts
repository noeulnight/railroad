import type { Station } from 'src/korail/interface/station.interface';
import { Direction } from 'src/korail/interface/train.interface';

export interface TrainGeometry {
  bearing: number;
  longitude: number;
  latitude: number;
}

export interface Train {
  id: string;
  type: string;
  direction: Direction;
  geometry: TrainGeometry;
  department: {
    station?: Station;
    date: Date;
  };
  arrival: {
    stations?: Station;
    date: Date;
  };
  currentStation?: Station;
  nextStation?: Station;
  delay: number;
  speedKph?: number;
}

export interface TrainListResponse {
  trains: Train[];
  total: number;
}

export interface TrainSnapshotEventData extends TrainListResponse {
  polledAt: string;
}

export interface TrainCreatedEventData {
  train: Train;
  polledAt: string;
}

export interface TrainUpdatedEventData {
  train: Train;
  previousGeometry: TrainGeometry;
  polledAt: string;
}

export interface TrainRemovedEventData {
  id: string;
  polledAt: string;
}
