import { Injectable } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import type { TrainSnapshotEventData } from '../interfaces/train.interface';
import type {
  TrainPollResult,
  TrainStreamMessage,
} from '../types/train-runtime.type';

type TrainEventSubscriber = (event: TrainStreamMessage) => void;

@Injectable()
export class TrainStreamBroadcasterService {
  private readonly subscribers = new Set<TrainEventSubscriber>();
  private latestSnapshot?: TrainSnapshotEventData;
  private readonly snapshotWaiters = new Set<
    (snapshot: TrainSnapshotEventData | undefined) => void
  >();

  public createEventsStream(
    request: Pick<Request, 'on' | 'off'>,
  ): Observable<TrainStreamMessage> {
    return new Observable<TrainStreamMessage>((subscriber) => {
      let isClosed = false;
      let isSnapshotSent = false;
      const bufferedEvents: TrainStreamMessage[] = [];

      const emitEvent = (event: TrainStreamMessage) => {
        if (isClosed) {
          return;
        }

        if (!isSnapshotSent) {
          bufferedEvents.push(event);
          return;
        }

        subscriber.next(event);
      };

      const completeStream = () => {
        if (isClosed) {
          return;
        }

        isClosed = true;
        request.off('close', handleClose);
        this.unsubscribe(emitEvent);
        subscriber.complete();
      };

      const handleClose = () => {
        completeStream();
      };

      request.on('close', handleClose);
      this.subscribe(emitEvent);

      void this.waitForSnapshot(request).then((snapshot) => {
        if (isClosed || !snapshot) return;
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

  public publishPollResult(result: TrainPollResult) {
    const snapshot = {
      trains: result.batch.trains,
      total: result.batch.trains.length,
      polledAt: result.batch.polledAt,
    };

    this.latestSnapshot = snapshot;
    for (const waiter of this.snapshotWaiters) {
      waiter(snapshot);
    }
    this.snapshotWaiters.clear();

    if (!result.hasPreviousSnapshot) {
      return;
    }

    for (const delta of result.deltas) {
      const event: TrainStreamMessage = delta;

      for (const subscriber of this.subscribers) {
        subscriber(event);
      }
    }
  }

  public getSnapshot(): TrainSnapshotEventData | undefined {
    return this.latestSnapshot;
  }

  private subscribe(subscriber: TrainEventSubscriber) {
    this.subscribers.add(subscriber);
  }

  private unsubscribe(subscriber: TrainEventSubscriber) {
    this.subscribers.delete(subscriber);
  }

  private async waitForSnapshot(
    request: Pick<Request, 'on' | 'off'>,
  ): Promise<TrainSnapshotEventData | undefined> {
    const snapshot = this.latestSnapshot;

    if (snapshot) {
      return snapshot;
    }

    return new Promise<TrainSnapshotEventData | undefined>((resolve) => {
      const handleClose = () => {
        cleanup();
        resolve(undefined);
      };

      const cleanup = () => {
        this.snapshotWaiters.delete(handleSnapshot);
        request.off('close', handleClose);
      };

      const handleSnapshot = (snapshot: TrainSnapshotEventData | undefined) => {
        cleanup();
        resolve(snapshot);
      };

      this.snapshotWaiters.add(handleSnapshot);
      request.on('close', handleClose);
    });
  }
}
