import { Module } from '@nestjs/common';
import { KorailModule } from 'src/korail/korail.module';
import { TrainModule } from 'src/train/train.module';
import { PublicApiService } from './public-api.service';
import { PublicStationController } from './public-station.controller';
import { PublicTrainController } from './public-train.controller';

@Module({
  imports: [KorailModule, TrainModule],
  controllers: [PublicTrainController, PublicStationController],
  providers: [PublicApiService],
  exports: [PublicApiService],
})
export class PublicApiModule {}
