import {
  TRAIN_EARTH_RADIUS_KM,
  TRAIN_MAX_PLAUSIBLE_SPEED_KMH,
  TRAIN_SPEED_ROUNDING_FACTOR,
} from '../constants/train.constants';
import type { TrainGeometry } from '../interfaces/train.interface';

export function hasSameTrainPosition(
  left: TrainGeometry,
  right: TrainGeometry,
): boolean {
  return left.longitude === right.longitude && left.latitude === right.latitude;
}

export function calculateTrainSpeedKmh(
  previous: TrainGeometry,
  current: TrainGeometry,
  elapsedMilliseconds: number,
): number | null {
  if (elapsedMilliseconds <= 0) {
    return null;
  }

  const latitudeDelta = degreesToRadians(current.latitude - previous.latitude);
  const longitudeDelta = degreesToRadians(
    current.longitude - previous.longitude,
  );
  const previousLatitude = degreesToRadians(previous.latitude);
  const currentLatitude = degreesToRadians(current.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(previousLatitude) *
      Math.cos(currentLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;
  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
  const distanceKilometers = TRAIN_EARTH_RADIUS_KM * angularDistance;
  const elapsedHours = elapsedMilliseconds / (60 * 60 * 1_000);
  const speedKmh = distanceKilometers / elapsedHours;

  if (!Number.isFinite(speedKmh) || speedKmh > TRAIN_MAX_PLAUSIBLE_SPEED_KMH) {
    return null;
  }

  return (
    Math.round(speedKmh * TRAIN_SPEED_ROUNDING_FACTOR) /
    TRAIN_SPEED_ROUNDING_FACTOR
  );
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}
