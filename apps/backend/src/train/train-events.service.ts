import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import { KorailService } from 'src/korail/korail.service';
import type { MessageEvent } from '@nestjs/common';
import type {
  Train,
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainSnapshotEventData,
  TrainUpdatedEventData,
} from './interface/train.interface';
import {
  buildTrainSnapshot,
  diffTrains,
  type TrainDelta,
} from './utils/diff-trains.util';
import { TrainIngestionService } from './train-ingestion.service';

const TRAIN_POLL_INTERVAL_MS = 10_000;
export const TRAIN_CREATED_EVENT = 'train.created';
export const TRAIN_UPDATED_EVENT = 'train.updated';
export const TRAIN_REMOVED_EVENT = 'train.removed';
const TRAIN_SNAPSHOT_EVENT = 'train.snapshot';

@Injectable()
export class TrainEventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrainEventsService.name);
  private subscriberCount = 0;
  private pollingSessionId = 0;
  private latestSnapshot = new Map<string, Train>();
  private lastPolledAt?: string;
  private warmupPromise?: Promise<void>;
  private pollingPromise?: Promise<void>;
  private pollingPromiseSessionId?: number;
  private pollingTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly korailService: KorailService,
    private readonly eventEmitter: EventEmitter2,
    private readonly trainIngestionService: TrainIngestionService,
  ) {}

  public onModuleInit() {
    this.startPolling();
  }

  public onModuleDestroy() {
    this.stopPolling();
  }

  public createEventsStream(
    request: Pick<Request, 'on' | 'off'>,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
      let isClosed = false;
      let isSnapshotSent = false;
      const bufferedEvents: MessageEvent[] = [];

      const emitEvent = (event: MessageEvent) => {
        if (isClosed) {
          return;
        }

        if (!isSnapshotSent) {
          bufferedEvents.push(event);
          return;
        }

        subscriber.next(event);
      };

      const eventHandlers = {
        created: (data: TrainCreatedEventData) => {
          emitEvent({
            type: 'created',
            data,
          });
        },
        updated: (data: TrainUpdatedEventData) => {
          emitEvent({
            type: 'updated',
            data,
          });
        },
        removed: (data: TrainRemovedEventData) => {
          emitEvent({
            type: 'removed',
            data,
          });
        },
      };

      const completeStream = () => {
        if (isClosed) {
          return;
        }

        isClosed = true;
        request.off('close', handleClose);
        this.eventEmitter.off(TRAIN_CREATED_EVENT, eventHandlers.created);
        this.eventEmitter.off(TRAIN_UPDATED_EVENT, eventHandlers.updated);
        this.eventEmitter.off(TRAIN_REMOVED_EVENT, eventHandlers.removed);
        this.onSubscriberDisconnected();
        subscriber.complete();
      };

      const handleClose = () => {
        completeStream();
      };

      request.on('close', handleClose);
      this.eventEmitter.on(TRAIN_CREATED_EVENT, eventHandlers.created);
      this.eventEmitter.on(TRAIN_UPDATED_EVENT, eventHandlers.updated);
      this.eventEmitter.on(TRAIN_REMOVED_EVENT, eventHandlers.removed);
      this.onSubscriberConnected();

      void this.initializeStream(request).then((snapshot) => {
        if (isClosed || !snapshot) {
          return;
        }

        subscriber.next({
          type: 'snapshot',
          data: snapshot,
        });
        isSnapshotSent = true;

        for (const event of bufferedEvents) {
          subscriber.next(event);
        }

        bufferedEvents.length = 0;
      });

      return () => {
        completeStream();
      };
    });
  }

  private onSubscriberConnected() {
    this.subscriberCount += 1;
  }

  private onSubscriberDisconnected() {
    if (this.subscriberCount === 0) {
      return;
    }

    this.subscriberCount -= 1;
  }

  private startPolling() {
    if (this.pollingTimer) {
      return;
    }

    this.pollingSessionId += 1;
    this.latestSnapshot = new Map();
    this.lastPolledAt = undefined;

    const sessionId = this.pollingSessionId;
    const warmupPromise = this.pollTrains(sessionId);
    this.warmupPromise = warmupPromise;

    void warmupPromise.finally(() => {
      if (this.warmupPromise === warmupPromise) {
        this.warmupPromise = undefined;
      }
    });

    this.pollingTimer = setInterval(() => {
      if (this.pollingPromise) {
        return;
      }

      void this.pollTrains(sessionId);
    }, TRAIN_POLL_INTERVAL_MS);
  }

  private stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    this.warmupPromise = undefined;
    this.latestSnapshot = new Map();
    this.lastPolledAt = undefined;
  }

  private async initializeStream(
    request: Pick<Request, 'on' | 'off'>,
  ): Promise<TrainSnapshotEventData | undefined> {
    if (!this.lastPolledAt) {
      await this.waitForSnapshot(request);
    }

    return this.getSnapshotEventData();
  }

  private waitForSnapshot(request: Pick<Request, 'on' | 'off'>): Promise<void> {
    if (this.lastPolledAt) {
      return Promise.resolve();
    }

    return new Promise<void>((resolve) => {
      const handleSnapshot = () => {
        cleanup();
        resolve();
      };
      const handleClose = () => {
        cleanup();
        resolve();
      };
      const cleanup = () => {
        request.off('close', handleClose);
        this.eventEmitter.off(TRAIN_SNAPSHOT_EVENT, handleSnapshot);
      };

      request.on('close', handleClose);
      this.eventEmitter.on(TRAIN_SNAPSHOT_EVENT, handleSnapshot);

      if (this.lastPolledAt) {
        cleanup();
        resolve();
      }
    });
  }

  private getSnapshotEventData(): TrainSnapshotEventData | undefined {
    if (!this.lastPolledAt) {
      return undefined;
    }

    const trains = Array.from(this.latestSnapshot.values());

    return {
      trains,
      total: trains.length,
      polledAt: this.lastPolledAt,
    };
  }

  private pollTrains(sessionId: number): Promise<void> {
    if (this.pollingPromise && this.pollingPromiseSessionId === sessionId) {
      return this.pollingPromise;
    }

    const pollingPromise = this.runPoll(sessionId)
      .catch((error: unknown) => {
        this.logger.error(
          'Failed to poll trains',
          error instanceof Error ? error.stack : String(error),
        );
      })
      .finally(() => {
        if (this.pollingPromise === pollingPromise) {
          this.pollingPromise = undefined;
          this.pollingPromiseSessionId = undefined;
        }
      });

    this.pollingPromise = pollingPromise;
    this.pollingPromiseSessionId = sessionId;

    return pollingPromise;
  }

  private async runPoll(sessionId: number): Promise<void> {
    const trains = await this.korailService.getTrains();

    if (sessionId !== this.pollingSessionId) {
      return;
    }

    const polledAt = new Date().toISOString();
    const previousSnapshot = this.latestSnapshot;
    const hasPreviousSnapshot = this.lastPolledAt !== undefined;
    const nextSnapshot = buildTrainSnapshot(trains);
    const deltas = hasPreviousSnapshot
      ? diffTrains(previousSnapshot, trains, polledAt)
      : [];

    this.latestSnapshot = nextSnapshot;
    this.lastPolledAt = polledAt;

    await this.trainIngestionService.recordSnapshot(trains, polledAt);

    for (const delta of deltas) {
      await this.trainIngestionService.recordDelta(delta);
    }

    await this.trainIngestionService.refreshHourlyRollup(trains, polledAt);

    const snapshotEvent = this.getSnapshotEventData();
    if (snapshotEvent) {
      this.eventEmitter.emit(TRAIN_SNAPSHOT_EVENT, snapshotEvent);
    }

    if (!hasPreviousSnapshot) {
      return;
    }
    for (const delta of deltas) {
      this.emitDelta(delta);
    }
  }

  private emitDelta(delta: TrainDelta) {
    switch (delta.type) {
      case 'created':
        this.eventEmitter.emit(TRAIN_CREATED_EVENT, delta.data);
        return;
      case 'updated':
        this.eventEmitter.emit(TRAIN_UPDATED_EVENT, delta.data);
        return;
      case 'removed':
        this.eventEmitter.emit(TRAIN_REMOVED_EVENT, delta.data);
        return;
    }
  }
}
