import { Injectable, Logger } from '@nestjs/common';
import { KorailService } from 'src/korail/korail.service';
import type { Train } from '../interface/train.interface';
import { TrainIngestionService } from '../train-ingestion.service';
import {
  buildTrainSnapshot,
  diffTrains,
  type TrainDelta,
} from '../utils/diff-trains.util';
import { TrainStreamBroadcasterService } from './train-stream-broadcaster.service';
import type { TrainPollResult } from './train-runtime.types';

const TRAIN_POLL_INTERVAL_MS = 5_000;

@Injectable()
export class TrainPollingService {
  private readonly logger = new Logger(TrainPollingService.name);
  private pollingSessionId = 0;
  private latestSnapshot = new Map<string, Train>();
  private lastPolledAt?: string;
  private pollingPromise?: Promise<void>;
  private pollingPromiseSessionId?: number;
  private pollingTimer?: ReturnType<typeof setInterval>;

  constructor(
    private readonly korailService: KorailService,
    private readonly trainIngestionService: TrainIngestionService,
    private readonly broadcaster: TrainStreamBroadcasterService,
  ) {}

  public start() {
    if (this.pollingTimer) {
      return;
    }

    this.pollingSessionId += 1;
    this.latestSnapshot = new Map();
    this.lastPolledAt = undefined;

    const sessionId = this.pollingSessionId;
    void this.poll(sessionId);

    this.pollingTimer = setInterval(() => {
      if (this.pollingPromise) {
        return;
      }

      void this.poll(sessionId);
    }, TRAIN_POLL_INTERVAL_MS);
  }

  public stop() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = undefined;
    }

    this.latestSnapshot = new Map();
    this.lastPolledAt = undefined;
    this.pollingPromise = undefined;
    this.pollingPromiseSessionId = undefined;
  }

  public getSnapshot() {
    return this.broadcaster.getSnapshot();
  }

  private poll(sessionId: number): Promise<void> {
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

    const result = this.buildPollResult(trains);
    this.latestSnapshot = result.snapshot;
    this.lastPolledAt = result.batch.polledAt;

    await this.trainIngestionService.ingestPollResult(result);
    this.broadcaster.publishPollResult(result);
  }

  private buildPollResult(trains: Train[]): TrainPollResult {
    const polledAt = new Date().toISOString();
    const hasPreviousSnapshot = this.lastPolledAt !== undefined;
    const previousSnapshot = this.latestSnapshot;
    const snapshot = buildTrainSnapshot(trains);
    const deltas: TrainDelta[] = hasPreviousSnapshot
      ? diffTrains(previousSnapshot, trains, polledAt)
      : [];

    return {
      batch: {
        trains,
        polledAt,
      },
      snapshot,
      deltas,
      hasPreviousSnapshot,
    };
  }
}
