import type {
  Train,
  TrainGeometry,
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
  previousPolledAt: string,
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
          train: withoutSpeed(train),
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
        train: withCalculatedSpeed(
          previousTrain,
          train,
          previousPolledAt,
          polledAt,
        ),
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

function withCalculatedSpeed(
  previousTrain: Train,
  nextTrain: Train,
  previousPolledAt: string,
  polledAt: string,
): Train {
  const speedKph = calculateSpeedKph(
    previousTrain.geometry,
    nextTrain.geometry,
    previousPolledAt,
    polledAt,
  );

  if (speedKph === undefined) {
    return withoutSpeed(nextTrain);
  }

  return {
    ...nextTrain,
    speedKph,
  };
}

function withoutSpeed(train: Train): Train {
  return {
    ...train,
    speedKph: undefined,
  };
}

function calculateSpeedKph(
  previousGeometry: TrainGeometry,
  nextGeometry: TrainGeometry,
  previousPolledAt: string,
  polledAt: string,
): number | undefined {
  if (
    !isValidCoordinate(previousGeometry.latitude, previousGeometry.longitude) ||
    !isValidCoordinate(nextGeometry.latitude, nextGeometry.longitude)
  ) {
    return undefined;
  }

  const previousTimestamp = new Date(previousPolledAt).getTime();
  const nextTimestamp = new Date(polledAt).getTime();
  const elapsedMs = nextTimestamp - previousTimestamp;

  if (
    !Number.isFinite(previousTimestamp) ||
    !Number.isFinite(nextTimestamp) ||
    elapsedMs <= 0
  ) {
    return undefined;
  }

  const distanceKm = calculateDistanceKm(
    previousGeometry.latitude,
    previousGeometry.longitude,
    nextGeometry.latitude,
    nextGeometry.longitude,
  );

  if (!Number.isFinite(distanceKm)) {
    return undefined;
  }

  return distanceKm / (elapsedMs / 3_600_000);
}

function calculateDistanceKm(
  previousLatitude: number,
  previousLongitude: number,
  nextLatitude: number,
  nextLongitude: number,
): number {
  const latitudeDelta = toRadians(nextLatitude - previousLatitude);
  const longitudeDelta = toRadians(nextLongitude - previousLongitude);
  const previousLatitudeRadians = toRadians(previousLatitude);
  const nextLatitudeRadians = toRadians(nextLatitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(previousLatitudeRadians) *
      Math.cos(nextLatitudeRadians) *
      Math.sin(longitudeDelta / 2) ** 2;
  const centralAngle =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return 6371 * centralAngle;
}

function isValidCoordinate(latitude: number, longitude: number): boolean {
  return (
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    longitude >= -180 &&
    longitude <= 180
  );
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}
