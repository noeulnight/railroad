import { Module } from '@nestjs/common';
import { StationService } from './station.service';
import { StationController } from './station.controller';
import { KorailModule } from 'src/korail/korail.module';

@Module({
  imports: [KorailModule],
  controllers: [StationController],
  providers: [StationService],
})
export class StationModule {}
