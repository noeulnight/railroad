import { Injectable, Logger } from '@nestjs/common';
import { TrainEventPersistenceService } from './ingestion/train-event-persistence.service';
import { TrainStationSyncService } from './ingestion/train-station-sync.service';
import type { TrainPollResult } from './types/train-runtime.type';
import type { TrainDelta } from './utils/diff-trains.util';

@Injectable()
export class TrainIngestionService {
  private readonly logger = new Logger(TrainIngestionService.name);

  constructor(
    private readonly stationSyncService: TrainStationSyncService,
    private readonly eventPersistenceService: TrainEventPersistenceService,
  ) {}

  public async ingestPollResult(result: TrainPollResult) {
    try {
      await this.stationSyncService.syncIfNeeded();

      for (const delta of result.deltas) {
        await this.eventPersistenceService.recordDelta(delta);
      }
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
}
