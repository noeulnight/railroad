import type {
  Train,
  TrainSnapshotEventData,
} from '../interface/train.interface';
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

export type TrainStreamMessage = {
  type: 'snapshot' | 'created' | 'updated' | 'removed';
  data: TrainSnapshotEventData | TrainDelta['data'];
};
