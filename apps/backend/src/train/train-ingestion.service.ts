import { Injectable, Logger } from '@nestjs/common';
import type { Train } from './interface/train.interface';
import { TrainEventPersistenceService } from './ingestion/train-event-persistence.service';
import { TrainSnapshotPersistenceService } from './ingestion/train-snapshot-persistence.service';
import { TrainStationSyncService } from './ingestion/train-station-sync.service';
import { TrainStatsRollupService } from './ingestion/train-stats-rollup.service';
import type { TrainPollResult } from './runtime/train-runtime.types';
import type { TrainDelta } from './utils/diff-trains.util';

@Injectable()
export class TrainIngestionService {
  private readonly logger = new Logger(TrainIngestionService.name);

  constructor(
    private readonly stationSyncService: TrainStationSyncService,
    private readonly snapshotPersistenceService: TrainSnapshotPersistenceService,
    private readonly eventPersistenceService: TrainEventPersistenceService,
    private readonly statsRollupService: TrainStatsRollupService,
  ) {}

  public async ingestPollResult(result: TrainPollResult) {
    try {
      await this.stationSyncService.syncIfNeeded();
      await this.snapshotPersistenceService.recordSnapshot(
        result.batch.trains,
        result.batch.polledAt,
      );

      for (const delta of result.deltas) {
        await this.eventPersistenceService.recordDelta(delta);
      }

      await this.statsRollupService.refreshHourlyRollup(
        result.batch.trains,
        result.batch.polledAt,
      );
    } catch (error) {
      this.logger.error(
        'Failed to ingest poll result',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  public async recordSnapshot(trains: Train[], sampledAt: string) {
    await this.stationSyncService.syncIfNeeded();
    await this.snapshotPersistenceService.recordSnapshot(trains, sampledAt);
  }

  public async recordDelta(delta: TrainDelta) {
    await this.eventPersistenceService.recordDelta(delta);
  }

  public async refreshHourlyRollup(trains: Train[], sampledAt: string) {
    await this.statsRollupService.refreshHourlyRollup(trains, sampledAt);
  }
}
