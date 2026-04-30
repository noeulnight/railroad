import { Module } from '@nestjs/common';
import { TrainModule } from 'src/train/train.module';
import { StatsController } from './stats.controller';
import { StatsService } from './stats.service';

@Module({
  imports: [TrainModule],
  controllers: [StatsController],
  providers: [StatsService],
})
export class StatsModule {}
