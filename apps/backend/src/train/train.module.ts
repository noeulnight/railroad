import { Module } from '@nestjs/common';
import { TrainEventsService } from './train-events.service';
import { TrainService } from './train.service';
import { TrainController } from './train.controller';
import { KorailModule } from 'src/korail/korail.module';
import { TrainIngestionService } from './train-ingestion.service';
import { TrainEventPersistenceService } from './ingestion/train-event-persistence.service';
import { TrainSnapshotPersistenceService } from './ingestion/train-snapshot-persistence.service';
import { TrainStationSyncService } from './ingestion/train-station-sync.service';
import { TrainStatsRollupService } from './ingestion/train-stats-rollup.service';
import { TrainPollingService } from './runtime/train-polling.service';
import { TrainStreamBroadcasterService } from './runtime/train-stream-broadcaster.service';

@Module({
  imports: [KorailModule],
  controllers: [TrainController],
  providers: [
    TrainService,
    TrainEventsService,
    TrainIngestionService,
    TrainPollingService,
    TrainStreamBroadcasterService,
    TrainStationSyncService,
    TrainSnapshotPersistenceService,
    TrainEventPersistenceService,
    TrainStatsRollupService,
  ],
})
export class TrainModule {}
