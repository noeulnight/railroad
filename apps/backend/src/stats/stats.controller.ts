import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { StatsService } from './stats.service';

@Controller('stats')
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('live')
  public async getLiveStats() {
    return this.statsService.getLiveStats();
  }

  @Get('trends')
  public async getTrendStats(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('bucket') bucket?: '10m' | '1h' | '1d',
  ) {
    if (bucket && !['10m', '1h', '1d'].includes(bucket)) {
      throw new BadRequestException(`Unsupported bucket: ${bucket}`);
    }

    try {
      return await this.statsService.getTrendStats(from, to, bucket);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid trend query',
      );
    }
  }

  @Get('stations')
  public async getStationStats() {
    return this.statsService.getStationStats();
  }

  @Get('segments')
  public async getSegmentStats() {
    return this.statsService.getSegmentStats();
  }

  @Get('trains/:trainId/history')
  public async getTrainHistory(@Param('trainId') trainId: string) {
    return this.statsService.getTrainHistory(trainId);
  }
}
