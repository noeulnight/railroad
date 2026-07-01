import { Module } from '@nestjs/common';
import { TrainModule } from './train/train.module';
import { StationModule } from './station/station.module';
import { KorailModule } from './korail/korail.module';
import { CacheModule } from '@nestjs/cache-manager';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { configurationValidationSchema } from './config/configuration.validation';
import { databaseConfig } from './config/configs/database.config';
import { serverConfig } from './config/configs/server.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, serverConfig],
      validationSchema: configurationValidationSchema,
    }),
    CacheModule.register({ isGlobal: true }),
    EventEmitterModule.forRoot({ global: true }),
    PrismaModule,
    TrainModule,
    StationModule,
    KorailModule,
  ],
})
export class AppModule {}
