import { Module } from '@nestjs/common';
import { TrainEventsService } from './train-events.service';
import { TrainService } from './train.service';
import { TrainController } from './train.controller';
import { KorailModule } from 'src/korail/korail.module';

@Module({
  imports: [KorailModule],
  controllers: [TrainController],
  providers: [TrainService, TrainEventsService],
})
export class TrainModule {}
