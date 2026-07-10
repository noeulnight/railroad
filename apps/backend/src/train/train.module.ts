import { Module } from '@nestjs/common';
import { TrainService } from './train.service';
import { TrainController } from './train.controller';
import { KorailModule } from 'src/korail/korail.module';
import { TrainPollingService } from './runtime/train-polling.service';
import { TrainStreamBroadcasterService } from './runtime/train-stream-broadcaster.service';

@Module({
  imports: [KorailModule],
  controllers: [TrainController],
  providers: [TrainService, TrainPollingService, TrainStreamBroadcasterService],
  exports: [TrainPollingService, TrainStreamBroadcasterService],
})
export class TrainModule {}
