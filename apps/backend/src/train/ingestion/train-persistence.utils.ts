import { TrainDirection, TrainEventType } from '@prisma/client';
import type {
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainUpdatedEventData,
} from '../interfaces/train.interface';

export function mapTrainDirection(direction: 'UP' | 'DOWN'): TrainDirection {
  return direction === 'UP' ? TrainDirection.UP : TrainDirection.DOWN;
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
