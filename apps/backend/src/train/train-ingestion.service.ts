import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { TrainDirection, TrainEventType } from '@prisma/client';
import { KorailService } from 'src/korail/korail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  Train,
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainUpdatedEventData,
} from './interface/train.interface';
import type { TrainDelta } from './utils/diff-trains.util';

const STATION_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TrainIngestionService implements OnModuleInit {
  private readonly logger = new Logger(TrainIngestionService.name);
  private lastStationSyncAt?: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly korailService: KorailService,
  ) {}

  public async onModuleInit() {
    await this.syncStationsIfNeeded(true);
  }

  public async recordSnapshot(trains: Train[], sampledAt: string) {
    try {
      await this.syncStationsIfNeeded();

      const sampledAtDate = new Date(sampledAt);
      if (trains.length > 0) {
        await this.prisma.trainSnapshotSample.createMany({
          data: trains.map((train) => ({
            sampledAt: sampledAtDate,
            trainId: train.id,
            type: train.type,
            direction: mapDirection(train.direction),
            delayMinutes: train.delay,
            currentStationName: train.currentStation?.name,
            nextStationName: train.nextStation?.name,
            departureStationName: train.department.station?.name,
            arrivalStationName: train.arrival.stations?.name,
            latitude: train.geometry.latitude,
            longitude: train.geometry.longitude,
          })),
        });
      }
    } catch (error) {
      this.logger.error(
        'Failed to persist train snapshot',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  public async recordDelta(delta: TrainDelta) {
    try {
      switch (delta.type) {
        case 'created':
          await this.recordCreatedEvent(delta.data);
          return;
        case 'updated':
          await this.recordUpdatedEvent(delta.data);
          return;
        case 'removed':
          await this.recordRemovedEvent(delta.data);
          return;
      }
    } catch (error) {
      this.logger.error(
        `Failed to persist ${delta.type} train event`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  public async refreshHourlyRollup(trains: Train[], sampledAt: string) {
    try {
      const sampledAtDate = new Date(sampledAt);
      const bucketStart = new Date(sampledAtDate);
      bucketStart.setMinutes(0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(bucketEnd.getHours() + 1);

      const [createdCount, removedCount] = await Promise.all([
        this.prisma.trainEvent.count({
          where: {
            eventType: TrainEventType.CREATED,
            occurredAt: {
              gte: bucketStart,
              lt: bucketEnd,
            },
          },
        }),
        this.prisma.trainEvent.count({
          where: {
            eventType: TrainEventType.REMOVED,
            occurredAt: {
              gte: bucketStart,
              lt: bucketEnd,
            },
          },
        }),
      ]);

      const totalDelay = trains.reduce((sum, train) => sum + train.delay, 0);

      await this.prisma.trainStatsHourly.upsert({
        where: {
          bucketStart,
        },
        create: {
          bucketStart,
          activeTrainCount: trains.length,
          delayedTrainCount: trains.filter((train) => train.delay > 0).length,
          avgDelay: trains.length === 0 ? 0 : round(totalDelay / trains.length),
          maxDelay: trains.reduce(
            (maxDelay, train) => Math.max(maxDelay, train.delay),
            0,
          ),
          createdCount,
          removedCount,
        },
        update: {
          activeTrainCount: trains.length,
          delayedTrainCount: trains.filter((train) => train.delay > 0).length,
          avgDelay: trains.length === 0 ? 0 : round(totalDelay / trains.length),
          maxDelay: trains.reduce(
            (maxDelay, train) => Math.max(maxDelay, train.delay),
            0,
          ),
          createdCount,
          removedCount,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to refresh hourly train rollup',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async syncStationsIfNeeded(force = false) {
    const now = Date.now();
    if (
      !force &&
      this.lastStationSyncAt &&
      now - this.lastStationSyncAt < STATION_SYNC_INTERVAL_MS
    ) {
      return;
    }

    const stations = await this.korailService.getStations();
    await this.prisma.$transaction(
      stations.map((station) =>
        this.prisma.station.upsert({
          where: { name: station.name },
          create: {
            name: station.name,
            grade: station.grade,
            latitude: station.geometry?.latitude,
            longitude: station.geometry?.longitude,
          },
          update: {
            grade: station.grade,
            latitude: station.geometry?.latitude,
            longitude: station.geometry?.longitude,
          },
        }),
      ),
    );

    this.lastStationSyncAt = now;
  }

  private async recordCreatedEvent(data: TrainCreatedEventData) {
    await this.prisma.trainEvent.create({
      data: {
        occurredAt: new Date(data.polledAt),
        eventType: TrainEventType.CREATED,
        trainId: data.train.id,
        type: data.train.type,
        direction: mapDirection(data.train.direction),
        delayMinutes: data.train.delay,
        latitude: data.train.geometry.latitude,
        longitude: data.train.geometry.longitude,
        currentStationName: data.train.currentStation?.name,
        nextStationName: data.train.nextStation?.name,
      },
    });
  }

  private async recordUpdatedEvent(data: TrainUpdatedEventData) {
    await this.prisma.trainEvent.create({
      data: {
        occurredAt: new Date(data.polledAt),
        eventType: TrainEventType.UPDATED,
        trainId: data.train.id,
        type: data.train.type,
        direction: mapDirection(data.train.direction),
        delayMinutes: data.train.delay,
        previousLatitude: data.previousGeometry.latitude,
        previousLongitude: data.previousGeometry.longitude,
        latitude: data.train.geometry.latitude,
        longitude: data.train.geometry.longitude,
        currentStationName: data.train.currentStation?.name,
        nextStationName: data.train.nextStation?.name,
      },
    });
  }

  private async recordRemovedEvent(data: TrainRemovedEventData) {
    await this.prisma.trainEvent.create({
      data: {
        occurredAt: new Date(data.polledAt),
        eventType: TrainEventType.REMOVED,
        trainId: data.id,
      },
    });
  }
}

function mapDirection(direction: 'UP' | 'DOWN'): TrainDirection {
  return direction === 'UP' ? TrainDirection.UP : TrainDirection.DOWN;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}
