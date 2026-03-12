import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { KorailService } from 'src/korail/korail.service';
import { PrismaService } from 'src/prisma/prisma.service';

const STATION_SYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TrainStationSyncService implements OnModuleInit {
  private readonly logger = new Logger(TrainStationSyncService.name);
  private lastStationSyncAt?: number;
  private syncPromise?: Promise<void>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly korailService: KorailService,
  ) {}

  public async onModuleInit() {
    await this.syncIfNeeded(true);
  }

  public async syncIfNeeded(force = false) {
    const now = Date.now();
    if (
      !force &&
      this.lastStationSyncAt &&
      now - this.lastStationSyncAt < STATION_SYNC_INTERVAL_MS
    ) {
      return;
    }

    if (this.syncPromise) {
      await this.syncPromise;
      return;
    }

    const syncPromise = this.runSync(now);
    this.syncPromise = syncPromise;

    try {
      await syncPromise;
    } catch (error) {
      this.logger.error(
        'Failed to sync stations',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      if (this.syncPromise === syncPromise) {
        this.syncPromise = undefined;
      }
    }
  }

  private async runSync(now: number) {
    const stations = await this.korailService.getStations();
    const sortedStations = [...stations].sort((left, right) =>
      left.name.localeCompare(right.name, 'ko'),
    );

    for (const station of sortedStations) {
      await this.prisma.station.upsert({
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
      });
    }

    this.lastStationSyncAt = now;
  }
}
