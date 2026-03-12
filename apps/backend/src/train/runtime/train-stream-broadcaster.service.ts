import { Injectable } from '@nestjs/common';
import type { MessageEvent } from '@nestjs/common';
import type { Request } from 'express';
import { Observable } from 'rxjs';
import type {
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainSnapshotEventData,
  TrainUpdatedEventData,
} from '../interface/train.interface';
import type {
  TrainPollResult,
  TrainStreamMessage,
} from './train-runtime.types';

type EventHandlers = {
  created: (data: TrainCreatedEventData) => void;
  updated: (data: TrainUpdatedEventData) => void;
  removed: (data: TrainRemovedEventData) => void;
};

@Injectable()
export class TrainStreamBroadcasterService {
  private readonly createdSubscribers = new Set<
    (data: TrainCreatedEventData) => void
  >();
  private readonly updatedSubscribers = new Set<
    (data: TrainUpdatedEventData) => void
  >();
  private readonly removedSubscribers = new Set<
    (data: TrainRemovedEventData) => void
  >();
  private latestSnapshot?: TrainSnapshotEventData;
  private readonly snapshotWaiters = new Set<
    (snapshot: TrainSnapshotEventData | undefined) => void
  >();

  public createEventsStream(
    request: Pick<Request, 'on' | 'off'>,
  ): Observable<MessageEvent> {
    return new Observable<MessageEvent>((subscriber) => {
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

      const eventHandlers: EventHandlers = {
        created: (data) => {
          emitEvent({
            type: 'created',
            data,
          });
        },
        updated: (data) => {
          emitEvent({
            type: 'updated',
            data,
          });
        },
        removed: (data) => {
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
        this.unsubscribe(eventHandlers);
        subscriber.complete();
      };

      const handleClose = () => {
        completeStream();
      };

      request.on('close', handleClose);
      this.subscribe(eventHandlers);

      void this.waitForSnapshot(request).then((snapshot) => {
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
      switch (delta.type) {
        case 'created':
          for (const subscriber of this.createdSubscribers) {
            subscriber(delta.data);
          }
          break;
        case 'updated':
          for (const subscriber of this.updatedSubscribers) {
            subscriber(delta.data);
          }
          break;
        case 'removed':
          for (const subscriber of this.removedSubscribers) {
            subscriber(delta.data);
          }
          break;
      }
    }
  }

  public getSnapshot(): TrainSnapshotEventData | undefined {
    return this.latestSnapshot;
  }

  private subscribe(eventHandlers: EventHandlers) {
    this.createdSubscribers.add(eventHandlers.created);
    this.updatedSubscribers.add(eventHandlers.updated);
    this.removedSubscribers.add(eventHandlers.removed);
  }

  private unsubscribe(eventHandlers: EventHandlers) {
    this.createdSubscribers.delete(eventHandlers.created);
    this.updatedSubscribers.delete(eventHandlers.updated);
    this.removedSubscribers.delete(eventHandlers.removed);
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
