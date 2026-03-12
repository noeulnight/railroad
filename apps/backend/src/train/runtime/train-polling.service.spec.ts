import { Logger } from '@nestjs/common';
import { Direction } from 'src/korail/interface/train.interface';
import { KorailService } from 'src/korail/korail.service';
import type { Train } from '../interface/train.interface';
import { TrainIngestionService } from '../train-ingestion.service';
import { TrainStreamBroadcasterService } from './train-stream-broadcaster.service';
import { TrainPollingService } from './train-polling.service';

describe('TrainPollingService', () => {
  let korailService: jest.Mocked<Pick<KorailService, 'getTrains'>>;
  let ingestionService: jest.Mocked<
    Pick<TrainIngestionService, 'ingestPollResult'>
  >;
  let broadcaster: jest.Mocked<
    Pick<TrainStreamBroadcasterService, 'publishPollResult' | 'getSnapshot'>
  >;
  let service: TrainPollingService;

  beforeEach(() => {
    korailService = {
      getTrains: jest.fn(),
    };
    ingestionService = {
      ingestPollResult: jest.fn().mockResolvedValue(undefined),
    };
    broadcaster = {
      publishPollResult: jest.fn(),
      getSnapshot: jest.fn(),
    };
    service = new TrainPollingService(
      korailService as unknown as KorailService,
      ingestionService as unknown as TrainIngestionService,
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
    expect(ingestionService.ingestPollResult).toHaveBeenCalledTimes(2);
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
    department: {
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
    ...overrides,
  };
}

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
