import { Controller, Get, Req, Sse } from '@nestjs/common';
import type { Request } from 'express';
import type { MessageEvent } from '@nestjs/common';
import type { Observable } from 'rxjs';
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

  @Sse('events')
  public trainEvents(@Req() request: Request): Observable<MessageEvent> {
    return this.trainEventsService.createEventsStream(request);
  }
}
