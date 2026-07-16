import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { RailwayMapController } from './railway-map.controller';
import { RailwayMapService } from './railway-map.service';

@Module({
  imports: [
    HttpModule.register({
      baseURL: 'https://osm.lth.so',
      timeout: 10_000,
    }),
  ],
  controllers: [RailwayMapController],
  providers: [RailwayMapService],
})
export class RailwayMapModule {}
