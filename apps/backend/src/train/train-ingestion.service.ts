import { Injectable, Logger } from '@nestjs/common';
import type { Train } from './interface/train.interface';
import { TrainEventPersistenceService } from './ingestion/train-event-persistence.service';
import { TrainStationSyncService } from './ingestion/train-station-sync.service';
import { TrainStatsRollupService } from './ingestion/train-stats-rollup.service';
import type { TrainPollResult } from './runtime/train-runtime.types';
import type { TrainDelta } from './utils/diff-trains.util';

@Injectable()
export class TrainIngestionService {
  private readonly logger = new Logger(TrainIngestionService.name);

  constructor(
    private readonly stationSyncService: TrainStationSyncService,
    private readonly eventPersistenceService: TrainEventPersistenceService,
    private readonly statsRollupService: TrainStatsRollupService,
  ) {}

  public async ingestPollResult(result: TrainPollResult) {
    try {
      await this.stationSyncService.syncIfNeeded();

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

  public async recordDelta(delta: TrainDelta) {
    await this.eventPersistenceService.recordDelta(delta);
  }

  public async refreshHourlyRollup(trains: Train[], sampledAt: string) {
    await this.statsRollupService.refreshHourlyRollup(trains, sampledAt);
  }
}
