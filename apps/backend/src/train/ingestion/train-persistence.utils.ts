import { TrainDirection, TrainEventType } from '@prisma/client';
import type {
  Train,
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainUpdatedEventData,
} from '../interface/train.interface';

export function mapTrainDirection(direction: 'UP' | 'DOWN'): TrainDirection {
  return direction === 'UP' ? TrainDirection.UP : TrainDirection.DOWN;
}

export function mapSnapshotRows(trains: Train[], sampledAt: Date) {
  return trains.map((train) => ({
    sampledAt,
    trainId: train.id,
    type: train.type,
    direction: mapTrainDirection(train.direction),
    delayMinutes: train.delay,
    currentStationName: train.currentStation?.name,
    nextStationName: train.nextStation?.name,
    departureStationName: train.department.station?.name,
    arrivalStationName: train.arrival.stations?.name,
    latitude: train.geometry.latitude,
    longitude: train.geometry.longitude,
  }));
}

export function mapCreatedEventRow(data: TrainCreatedEventData) {
  return {
    occurredAt: new Date(data.polledAt),
    eventType: TrainEventType.CREATED,
    trainId: data.train.id,
    type: data.train.type,
    direction: mapTrainDirection(data.train.direction),
    delayMinutes: data.train.delay,
    latitude: data.train.geometry.latitude,
    longitude: data.train.geometry.longitude,
    currentStationName: data.train.currentStation?.name,
    nextStationName: data.train.nextStation?.name,
  };
}

export function mapUpdatedEventRow(data: TrainUpdatedEventData) {
  return {
    occurredAt: new Date(data.polledAt),
    eventType: TrainEventType.UPDATED,
    trainId: data.train.id,
    type: data.train.type,
    direction: mapTrainDirection(data.train.direction),
    delayMinutes: data.train.delay,
    previousLatitude: data.previousGeometry.latitude,
    previousLongitude: data.previousGeometry.longitude,
    latitude: data.train.geometry.latitude,
    longitude: data.train.geometry.longitude,
    currentStationName: data.train.currentStation?.name,
    nextStationName: data.train.nextStation?.name,
  };
}

export function mapRemovedEventRow(data: TrainRemovedEventData) {
  return {
    occurredAt: new Date(data.polledAt),
    eventType: TrainEventType.REMOVED,
    trainId: data.id,
  };
}

export function calculateDelayMetrics(trains: Train[]) {
  const totalDelay = trains.reduce((sum, train) => sum + train.delay, 0);
  const delayedTrainCount = trains.filter((train) => train.delay > 0).length;
  const maxDelay = trains.reduce(
    (currentMaxDelay, train) => Math.max(currentMaxDelay, train.delay),
    0,
  );

  return {
    activeTrainCount: trains.length,
    delayedTrainCount,
    avgDelay: trains.length === 0 ? 0 : round(totalDelay / trains.length),
    maxDelay,
  };
}

export function round(value: number) {
  return Math.round(value * 100) / 100;
}
