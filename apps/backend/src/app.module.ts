import { Module } from '@nestjs/common';
import { TrainModule } from './train/train.module';
import { StationModule } from './station/station.module';
import { KorailModule } from './korail/korail.module';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    CacheModule.register({ isGlobal: true }),
    EventEmitterModule.forRoot({ global: true }),
    TrainModule,
    StationModule,
    KorailModule,
  ],
})
export class AppModule {}
