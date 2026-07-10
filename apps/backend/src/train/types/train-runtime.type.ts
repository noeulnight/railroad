import type {
  Train,
  TrainGeometry,
  TrainSnapshotEventData,
} from '../interfaces/train.interface';
import type { TrainDelta } from '../utils/diff-trains.util';

export type TrainPollBatch = {
  trains: Train[];
  polledAt: string;
};

export type TrainPollResult = {
  batch: TrainPollBatch;
  snapshot: Map<string, Train>;
  deltas: TrainDelta[];
  hasPreviousSnapshot: boolean;
};

export type TrainPositionSample = {
  geometry: TrainGeometry;
  observedAt: number;
  speedKmh: number | null;
};

export type TrainStreamMessage =
  | {
      type: 'snapshot';
      data: TrainSnapshotEventData;
    }
  | TrainDelta;
