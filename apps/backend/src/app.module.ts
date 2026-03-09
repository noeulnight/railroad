import { Module } from '@nestjs/common';
import { TrainModule } from './train/train.module';
import { StationModule } from './station/station.module';
import { KorailModule } from './korail/korail.module';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { StatsModule } from './stats/stats.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true }),
    EventEmitterModule.forRoot({ global: true }),
    PrismaModule,
    TrainModule,
    StationModule,
    KorailModule,
    StatsModule,
  ],
})
export class AppModule {}
