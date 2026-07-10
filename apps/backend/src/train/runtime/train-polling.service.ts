import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { KorailService } from 'src/korail/korail.service';
import type { Train } from '../interfaces/train.interface';
import {
  buildTrainSnapshot,
  diffTrains,
  type TrainDelta,
} from '../utils/diff-trains.util';
import {
  calculateTrainSpeedKmh,
  hasSameTrainPosition,
} from '../utils/calculate-train-speed.util';
import { TrainStreamBroadcasterService } from './train-stream-broadcaster.service';
import type {
  TrainPollResult,
  TrainPositionSample,
} from '../types/train-runtime.type';
import { TRAIN_POLL_INTERVAL_MS } from '../constants/train.constants';

@Injectable()
export class TrainPollingService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TrainPollingService.name);
  private pollingSessionId = 0;
  private latestSnapshot = new Map<string, Train>();
  private lastPolledAt?: string;
  private pollingPromise?: Promise<void>;
  private pollingPromiseSessionId?: number;
  private pollingTimer?: ReturnType<typeof setInterval>;
  private positionSamples = new Map<string, TrainPositionSample>();

  constructor(
    private readonly korailService: KorailService,
    private readonly broadcaster: TrainStreamBroadcasterService,
  ) {}

  public onModuleInit() {
    this.start();
  }

  public onModuleDestroy() {
    this.stop();
  }

  public start() {
    if (this.pollingTimer) {
      return;
    }

    this.pollingSessionId += 1;
    this.latestSnapshot = new Map();
    this.lastPolledAt = undefined;
    this.positionSamples = new Map();

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
    this.positionSamples = new Map();
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

    this.broadcaster.publishPollResult(result);
  }

  private buildPollResult(trains: Train[]): TrainPollResult {
    const polledAt = new Date().toISOString();
    const trainsWithSpeed = this.attachEstimatedSpeeds(
      trains,
      Date.parse(polledAt),
    );
    const hasPreviousSnapshot = this.lastPolledAt !== undefined;
    const previousSnapshot = this.latestSnapshot;
    const snapshot = buildTrainSnapshot(trainsWithSpeed);
    const deltas: TrainDelta[] = hasPreviousSnapshot
      ? diffTrains(previousSnapshot, trainsWithSpeed, polledAt)
      : [];

    return {
      batch: {
        trains: trainsWithSpeed,
        polledAt,
      },
      snapshot,
      deltas,
      hasPreviousSnapshot,
    };
  }

  private attachEstimatedSpeeds(trains: Train[], observedAt: number): Train[] {
    const activeTrainIds = new Set(trains.map((train) => train.id));
    const trainsWithSpeed = trains.map((train) =>
      this.attachEstimatedSpeed(train, observedAt),
    );

    for (const trainId of this.positionSamples.keys()) {
      if (!activeTrainIds.has(trainId)) {
        this.positionSamples.delete(trainId);
      }
    }

    return trainsWithSpeed;
  }

  private attachEstimatedSpeed(train: Train, observedAt: number): Train {
    const previousSample = this.positionSamples.get(train.id);

    if (!previousSample) {
      this.positionSamples.set(train.id, {
        geometry: { ...train.geometry },
        observedAt,
        speedKmh: null,
      });

      return { ...train, speedKmh: null };
    }

    if (hasSameTrainPosition(previousSample.geometry, train.geometry)) {
      return { ...train, speedKmh: previousSample.speedKmh };
    }

    const speedKmh = calculateTrainSpeedKmh(
      previousSample.geometry,
      train.geometry,
      observedAt - previousSample.observedAt,
    );

    if (speedKmh === null) {
      return { ...train, speedKmh: null };
    }

    this.positionSamples.set(train.id, {
      geometry: { ...train.geometry },
      observedAt,
      speedKmh,
    });

    return { ...train, speedKmh };
  }
}
