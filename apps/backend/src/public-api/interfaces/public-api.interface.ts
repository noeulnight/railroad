import type { MessageEvent } from '@nestjs/common';
import type { Direction } from 'src/korail/interfaces/train.interface';

export interface PublicPosition {
  longitude: number;
  latitude: number;
}

export interface PublicTrainPosition extends PublicPosition {
  bearing: number;
}

export interface PublicStation {
  name: string;
  grade?: number;
  position?: PublicPosition;
}

export interface PublicRouteEndpoint {
  station?: PublicStation;
  scheduledAt: string;
}

export interface PublicTrain {
  trainNo: string;
  type: string;
  direction: Direction;
  position: PublicTrainPosition;
  departure: PublicRouteEndpoint;
  arrival: PublicRouteEndpoint;
  currentStation?: PublicStation;
  nextStation?: PublicStation;
  delayMinutes: number;
  speedKmh: number | null;
}

export interface PublicTrainList {
  trains: PublicTrain[];
  total: number;
  polledAt: string;
}

export interface PublicScheduleStop {
  stationCode: string;
  station: PublicStation;
  arrivalAt?: string;
  departureAt?: string;
  delayMinutes: number;
}

export interface PublicTrainSchedule {
  trainNo: string;
  serviceDate: string;
  stops: PublicScheduleStop[];
}

export type PublicTrainStreamMessage =
  | (MessageEvent & {
      type: 'snapshot';
      data: PublicTrainList;
    })
  | (MessageEvent & {
      type: 'created';
      data: {
        train: PublicTrain;
        polledAt: string;
      };
    })
  | (MessageEvent & {
      type: 'updated';
      data: {
        train: PublicTrain;
        previousPosition: PublicTrainPosition;
        polledAt: string;
      };
    })
  | (MessageEvent & {
      type: 'removed';
      data: {
        trainNo: string;
        polledAt: string;
      };
    });
