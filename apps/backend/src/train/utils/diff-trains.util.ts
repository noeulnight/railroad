import type {
  Train,
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainUpdatedEventData,
} from '../interface/train.interface';

export type TrainDelta =
  | {
      type: 'created';
      data: TrainCreatedEventData;
    }
  | {
      type: 'updated';
      data: TrainUpdatedEventData;
    }
  | {
      type: 'removed';
      data: TrainRemovedEventData;
    };

export function buildTrainSnapshot(trains: Train[]): Map<string, Train> {
  return new Map(trains.map((train) => [train.id, train]));
}

export function diffTrains(
  previousSnapshot: Map<string, Train>,
  nextTrains: Train[],
  polledAt: string,
): TrainDelta[] {
  const deltas: TrainDelta[] = [];
  const nextSnapshot = buildTrainSnapshot(nextTrains);

  for (const train of nextTrains) {
    const previousTrain = previousSnapshot.get(train.id);

    if (!previousTrain) {
      deltas.push({
        type: 'created',
        data: {
          train,
          polledAt,
        },
      });
      continue;
    }

    if (!hasGeometryChanged(previousTrain, train)) {
      continue;
    }

    deltas.push({
      type: 'updated',
      data: {
        train,
        previousGeometry: { ...previousTrain.geometry },
        polledAt,
      },
    });
  }

  for (const previousId of previousSnapshot.keys()) {
    if (nextSnapshot.has(previousId)) {
      continue;
    }

    deltas.push({
      type: 'removed',
      data: {
        id: previousId,
        polledAt,
      },
    });
  }

  return deltas;
}

function hasGeometryChanged(previousTrain: Train, nextTrain: Train): boolean {
  return (
    previousTrain.geometry.bearing !== nextTrain.geometry.bearing ||
    previousTrain.geometry.longitude !== nextTrain.geometry.longitude ||
    previousTrain.geometry.latitude !== nextTrain.geometry.latitude
  );
}
