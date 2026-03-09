import { Controller, Get, Param, Query, Req, Sse } from '@nestjs/common';
import type { Request } from 'express';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
import {
  TrainScheduleParamsDto,
  TrainScheduleQueryDto,
} from './dto/train-schedule.dto';
import { TrainEventsService } from './train-events.service';
import { TrainService } from './train.service';

@Controller('train')
export class TrainController {
  constructor(
    private readonly trainService: TrainService,
    private readonly trainEventsService: TrainEventsService,
  ) {}

  @Get()
  public async getTrains() {
    return this.trainService.getTrains();
  }

  @Get(':id/schedule')
  public async getSchedule(
    @Param() params: TrainScheduleParamsDto,
    @Query() query: TrainScheduleQueryDto,
  ) {
    return this.trainService.getSchedule(params.id, query.date);
  }

  @Sse('events')
  public trainEvents(@Req() request: Request): Observable<MessageEvent> {
    return this.trainEventsService.createEventsStream(request);
  }
}
