import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import type { MessageEvent } from '@nestjs/common';
import { TrainPollingService } from './runtime/train-polling.service';
import { TrainStreamBroadcasterService } from './runtime/train-stream-broadcaster.service';

@Injectable()
export class TrainEventsService implements OnModuleInit, OnModuleDestroy {
  constructor(
    private readonly pollingService: TrainPollingService,
    private readonly broadcaster: TrainStreamBroadcasterService,
  ) {}

  public onModuleInit() {
    this.pollingService.start();
  }

  public onModuleDestroy() {
    this.pollingService.stop();
  }

  public createEventsStream(
    request: Pick<Request, 'on' | 'off'>,
  ): Observable<MessageEvent> {
    return this.broadcaster.createEventsStream(request);
  }
}
