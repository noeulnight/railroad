import { Module } from '@nestjs/common';
import { TrainModule } from './train/train.module';
import { StationModule } from './station/station.module';
import { KorailModule } from './korail/korail.module';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { configurationValidationSchema } from './config/configuration.validation';
import { serverConfig } from './config/configs/server.config';
import { PublicApiModule } from './public-api/public-api.module';
import { RailwayMapModule } from './railway-map/railway-map.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [serverConfig],
      validationSchema: configurationValidationSchema,
    }),
    CacheModule.register({ isGlobal: true }),
    TrainModule,
    StationModule,
    KorailModule,
    PublicApiModule,
    RailwayMapModule,
  ],
})
export class AppModule {}
