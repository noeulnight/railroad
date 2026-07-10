import { Logger } from '@nestjs/common';
import { Direction } from 'src/korail/interfaces/train.interface';
import { KorailService } from 'src/korail/korail.service';
import type { Train } from '../interfaces/train.interface';
import { TrainStreamBroadcasterService } from '../runtime/train-stream-broadcaster.service';
import { TrainPollingService } from '../runtime/train-polling.service';

describe('TrainPollingService', () => {
  let korailService: jest.Mocked<Pick<KorailService, 'getTrains'>>;
  let broadcaster: jest.Mocked<
    Pick<TrainStreamBroadcasterService, 'publishPollResult' | 'getSnapshot'>
  >;
  let service: TrainPollingService;

  beforeEach(() => {
    korailService = {
      getTrains: jest.fn(),
    };
    broadcaster = {
      publishPollResult: jest.fn(),
      getSnapshot: jest.fn(),
    };
    service = new TrainPollingService(
      korailService as unknown as KorailService,
      broadcaster as unknown as TrainStreamBroadcasterService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('reuses a single in-flight poll and keeps polling on the interval', async () => {
    jest.useFakeTimers();
    let resolveFirstPoll!: (trains: Train[]) => void;

    korailService.getTrains
      .mockImplementationOnce(
        () =>
          new Promise<Train[]>((resolve) => {
            resolveFirstPoll = resolve;
          }),
      )
      .mockResolvedValue([createTrain()]);

    service.start();

    expect(korailService.getTrains).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(5_000);
    expect(korailService.getTrains).toHaveBeenCalledTimes(1);

    resolveFirstPoll([createTrain()]);
    await flushPromises();

    jest.advanceTimersByTime(5_000);
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(2);
    expect(broadcaster.publishPollResult).toHaveBeenCalledTimes(2);
  });

  it('logs polling failures and keeps the timer alive', async () => {
    jest.useFakeTimers();
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    korailService.getTrains
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([createTrain()]);

    service.start();
    await flushPromises();

    jest.advanceTimersByTime(5_000);
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(2);
    expect(broadcaster.publishPollResult).toHaveBeenCalledTimes(1);
  });

  it('uses time since the position actually changed across stale polls', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-09T00:00:00.000Z'));
    const unchangedTrain = createTrain();
    const movedTrain = createTrain({
      geometry: {
        ...unchangedTrain.geometry,
        latitude: unchangedTrain.geometry.latitude + 0.0089932,
      },
    });
    korailService.getTrains
      .mockResolvedValueOnce([unchangedTrain])
      .mockResolvedValueOnce([unchangedTrain])
      .mockResolvedValueOnce([unchangedTrain])
      .mockResolvedValueOnce([movedTrain]);

    service.start();
    await flushPromises();

    for (let poll = 0; poll < 3; poll += 1) {
      jest.advanceTimersByTime(5_000);
      await flushPromises();
    }

    const latestResult = broadcaster.publishPollResult.mock.calls.at(-1)?.[0];

    expect(latestResult?.batch.trains[0].speedKmh).toBeCloseTo(240, 0);
    expect(latestResult?.batch.polledAt).toBe('2026-03-09T00:00:15.000Z');
  });

  it('keeps an implausible jump unconfirmed until elapsed time is plausible', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-09T00:00:00.000Z'));
    const firstTrain = createTrain();
    const movedTrain = createTrain({
      geometry: {
        ...firstTrain.geometry,
        latitude: firstTrain.geometry.latitude + 0.0089932,
      },
    });
    korailService.getTrains
      .mockResolvedValueOnce([firstTrain])
      .mockResolvedValueOnce([movedTrain])
      .mockResolvedValueOnce([movedTrain])
      .mockResolvedValueOnce([movedTrain]);

    service.start();
    await flushPromises();

    jest.advanceTimersByTime(5_000);
    await flushPromises();
    expect(
      broadcaster.publishPollResult.mock.calls.at(-1)?.[0].batch.trains[0]
        .speedKmh,
    ).toBeNull();

    jest.advanceTimersByTime(5_000);
    await flushPromises();
    expect(
      broadcaster.publishPollResult.mock.calls.at(-1)?.[0].batch.trains[0]
        .speedKmh,
    ).toBeNull();

    jest.advanceTimersByTime(5_000);
    await flushPromises();
    const recoveredResult =
      broadcaster.publishPollResult.mock.calls.at(-1)?.[0];

    expect(recoveredResult?.batch.trains[0].speedKmh).toBeCloseTo(240, 0);
    expect(recoveredResult?.deltas).toHaveLength(1);
    expect(recoveredResult?.deltas[0]).toMatchObject({ type: 'updated' });
  });

  it('stops polling cleanly', async () => {
    jest.useFakeTimers();
    korailService.getTrains.mockResolvedValue([createTrain()]);

    service.start();
    await flushPromises();
    service.stop();

    jest.advanceTimersByTime(5_000);
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(1);
  });

  it('starts and stops polling with module lifecycle', async () => {
    jest.useFakeTimers();
    korailService.getTrains.mockResolvedValue([createTrain()]);

    service.onModuleInit();
    await flushPromises();
    service.onModuleDestroy();

    jest.advanceTimersByTime(5_000);
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(1);
  });
});

function createTrain(overrides: Partial<Train> = {}): Train {
  return {
    id: '1',
    type: 'ktx',
    direction: Direction.UP,
    geometry: {
      bearing: 0,
      longitude: 127,
      latitude: 37.5,
    },
    departure: {
      station: { name: '서울', grade: 1 },
      date: new Date('2026-03-09T00:00:00.000Z'),
    },
    arrival: {
      stations: { name: '부산', grade: 1 },
      date: new Date('2026-03-09T03:00:00.000Z'),
    },
    currentStation: { name: '대전', grade: 1 },
    nextStation: { name: '동대구', grade: 1 },
    delay: 0,
    speedKmh: null,
    ...overrides,
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
