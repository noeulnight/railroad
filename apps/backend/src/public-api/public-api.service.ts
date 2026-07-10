import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import type { Request } from 'express';
import { map, type Observable } from 'rxjs';
import type { Schedule } from 'src/korail/interfaces/schedule.interface';
import type { Station } from 'src/korail/interfaces/station.interface';
import { KorailService } from 'src/korail/korail.service';
import type { Train } from 'src/train/interfaces/train.interface';
import { TrainPollingService } from 'src/train/runtime/train-polling.service';
import { TrainStreamBroadcasterService } from 'src/train/runtime/train-stream-broadcaster.service';
import type { TrainStreamMessage } from 'src/train/types/train-runtime.type';
import {
  PUBLIC_API_SCHEDULE_CACHE_PREFIX,
  PUBLIC_API_SCHEDULE_CACHE_TTL_MS,
} from './constants/public-api.constants';
import type {
  PublicScheduleStop,
  PublicStation,
  PublicTrain,
  PublicTrainList,
  PublicTrainPosition,
  PublicTrainSchedule,
  PublicTrainStreamMessage,
} from './interfaces/public-api.interface';

@Injectable()
export class PublicApiService {
  constructor(
    private readonly korailService: KorailService,
    private readonly trainPollingService: TrainPollingService,
    private readonly trainStreamBroadcaster: TrainStreamBroadcasterService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  public async getTrains(): Promise<PublicTrainList> {
    const snapshot = this.trainPollingService.getSnapshot();
    const trains = snapshot?.trains ?? (await this.korailService.getTrains());

    return {
      trains: trains.map((train) => this.mapTrain(train)),
      total: trains.length,
      polledAt: snapshot?.polledAt ?? new Date().toISOString(),
    };
  }

  public async getStations(): Promise<PublicStation[]> {
    const stations = await this.korailService.getStations();

    return stations.map((station) => this.mapStation(station));
  }

  public async getSchedule(
    trainNo: string,
    serviceDate: string,
  ): Promise<PublicTrainSchedule> {
    const cacheKey = `${PUBLIC_API_SCHEDULE_CACHE_PREFIX}:${serviceDate}:${trainNo}`;
    const cached = await this.cacheManager.get<PublicTrainSchedule>(cacheKey);

    if (cached) {
      return cached;
    }

    const schedule = await this.korailService.getSchedule(
      trainNo,
      serviceDate.replaceAll('-', ''),
    );
    const response = {
      trainNo,
      serviceDate,
      stops: schedule.map((stop) => this.mapScheduleStop(stop)),
    };

    await this.cacheManager.set(
      cacheKey,
      response,
      PUBLIC_API_SCHEDULE_CACHE_TTL_MS,
    );

    return response;
  }

  public createTrainEventsStream(
    request: Pick<Request, 'on' | 'off'>,
  ): Observable<PublicTrainStreamMessage> {
    return this.trainStreamBroadcaster
      .createEventsStream(request)
      .pipe(map((event) => this.mapTrainStreamMessage(event)));
  }

  private mapTrain(train: Train): PublicTrain {
    return {
      trainNo: train.id,
      type: train.type,
      direction: train.direction,
      position: {
        longitude: train.geometry.longitude,
        latitude: train.geometry.latitude,
        bearing: train.geometry.bearing,
      },
      departure: {
        ...(train.departure.station
          ? { station: this.mapStation(train.departure.station) }
          : {}),
        scheduledAt: train.departure.date.toISOString(),
      },
      arrival: {
        ...(train.arrival.stations
          ? { station: this.mapStation(train.arrival.stations) }
          : {}),
        scheduledAt: train.arrival.date.toISOString(),
      },
      ...(train.currentStation
        ? { currentStation: this.mapStation(train.currentStation) }
        : {}),
      ...(train.nextStation
        ? { nextStation: this.mapStation(train.nextStation) }
        : {}),
      delayMinutes: train.delay,
      speedKmh: train.speedKmh,
    };
  }

  private mapStation(station: Station): PublicStation {
    return {
      name: station.name,
      ...(station.grade !== undefined ? { grade: station.grade } : {}),
      ...(station.geometry
        ? {
            position: {
              longitude: station.geometry.longitude,
              latitude: station.geometry.latitude,
            },
          }
        : {}),
    };
  }

  private mapScheduleStop(stop: Schedule): PublicScheduleStop {
    return {
      stationCode: stop.id,
      station: this.mapStation(stop.station),
      ...(stop.arrivalTime
        ? { arrivalAt: stop.arrivalTime.toISOString() }
        : {}),
      ...(stop.departureTime
        ? { departureAt: stop.departureTime.toISOString() }
        : {}),
      delayMinutes: stop.delay,
    };
  }

  private mapTrainStreamMessage(
    event: TrainStreamMessage,
  ): PublicTrainStreamMessage {
    switch (event.type) {
      case 'snapshot':
        return {
          type: event.type,
          data: {
            trains: event.data.trains.map((train) => this.mapTrain(train)),
            total: event.data.total,
            polledAt: event.data.polledAt,
          },
        };
      case 'created':
        return {
          type: event.type,
          data: {
            train: this.mapTrain(event.data.train),
            polledAt: event.data.polledAt,
          },
        };
      case 'updated':
        return {
          type: event.type,
          data: {
            train: this.mapTrain(event.data.train),
            previousPosition: this.mapTrainPosition(
              event.data.previousGeometry,
            ),
            polledAt: event.data.polledAt,
          },
        };
      case 'removed':
        return {
          type: event.type,
          data: {
            trainNo: event.data.id,
            polledAt: event.data.polledAt,
          },
        };
    }
  }

  private mapTrainPosition(position: {
    longitude: number;
    latitude: number;
    bearing: number;
  }): PublicTrainPosition {
    return {
      longitude: position.longitude,
      latitude: position.latitude,
      bearing: position.bearing,
    };
  }
}
