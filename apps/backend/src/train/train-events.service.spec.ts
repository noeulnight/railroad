import { Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventEmitter } from 'events';
import { Direction } from 'src/korail/interface/train.interface';
import { KorailService } from 'src/korail/korail.service';
import type { Train } from './interface/train.interface';
import { TrainIngestionService } from './train-ingestion.service';
import {
  TRAIN_UPDATED_EVENT,
  TrainEventsService,
} from './train-events.service';

describe('TrainEventsService', () => {
  let korailService: jest.Mocked<Pick<KorailService, 'getTrains'>>;
  let trainIngestionService: jest.Mocked<
    Pick<
      TrainIngestionService,
      'recordSnapshot' | 'recordDelta' | 'refreshHourlyRollup'
    >
  >;
  let eventEmitter: EventEmitter2;
  let service: TrainEventsService;

  beforeEach(() => {
    korailService = {
      getTrains: jest.fn(),
    };
    trainIngestionService = {
      recordSnapshot: jest.fn().mockResolvedValue(undefined),
      recordDelta: jest.fn().mockResolvedValue(undefined),
      refreshHourlyRollup: jest.fn().mockResolvedValue(undefined),
    };
    eventEmitter = new EventEmitter2();
    service = new TrainEventsService(
      korailService as unknown as KorailService,
      eventEmitter,
      trainIngestionService as unknown as TrainIngestionService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('emits a snapshot first and then forwards live delta events', async () => {
    const baseTrain = createTrain();
    const movedTrain = createTrain({
      geometry: {
        bearing: 90,
        longitude: 128,
        latitude: 36,
      },
    });
    const events: Array<{ type?: string; data: unknown }> = [];

    korailService.getTrains.mockResolvedValue([baseTrain]);
    service.onModuleInit();

    const request = new MockRequest();
    const subscription = service
      .createEventsStream(request)
      .subscribe((event) => {
        events.push({
          type: event.type,
          data: event.data,
        });
      });

    await flushPromises();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('snapshot');
    expect(events[0].data).toMatchObject({
      trains: [baseTrain],
      total: 1,
    });

    eventEmitter.emit(TRAIN_UPDATED_EVENT, {
      train: {
        ...movedTrain,
        speedKph: 120,
      },
      previousGeometry: baseTrain.geometry,
      polledAt: '2026-03-09T00:00:10.000Z',
    });

    expect(events).toEqual([
      expect.objectContaining({
        type: 'snapshot',
      }),
      {
        type: 'updated',
        data: {
          train: {
            ...movedTrain,
            speedKph: 120,
          },
          previousGeometry: baseTrain.geometry,
          polledAt: '2026-03-09T00:00:10.000Z',
        },
      },
    ]);

    request.emit('close');
    subscription.unsubscribe();
    service.onModuleDestroy();
  });

  it('starts polling on module init, reuses a single timer, and keeps polling without subscribers', async () => {
    jest.useFakeTimers();

    const baseTrain = createTrain();
    let resolveFirstPoll!: (trains: Train[]) => void;

    korailService.getTrains
      .mockImplementationOnce(
        () =>
          new Promise<Train[]>((resolve) => {
            resolveFirstPoll = resolve;
          }),
      )
      .mockResolvedValue([baseTrain]);

    service.onModuleInit();

    expect(korailService.getTrains).toHaveBeenCalledTimes(1);

    const firstRequest = new MockRequest();
    const secondRequest = new MockRequest();

    const firstSubscription = service
      .createEventsStream(firstRequest)
      .subscribe();
    service.createEventsStream(secondRequest).subscribe();

    jest.advanceTimersByTime(10_000);

    expect(korailService.getTrains).toHaveBeenCalledTimes(1);

    resolveFirstPoll([baseTrain]);
    await flushPromises();

    jest.advanceTimersByTime(10_000);
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(2);

    firstRequest.emit('close');
    secondRequest.emit('close');
    await flushPromises();

    jest.advanceTimersByTime(10_000);
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(3);

    firstSubscription.unsubscribe();
    service.onModuleDestroy();
  });

  it('keeps the stream open when a polling cycle fails', async () => {
    jest.useFakeTimers();

    const baseTrain = createTrain();
    const movedTrain = createTrain({
      geometry: {
        bearing: 180,
        longitude: 128.5,
        latitude: 35.9,
      },
    });
    const events: Array<{ type?: string; data: unknown }> = [];
    const complete = jest.fn();

    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    korailService.getTrains
      .mockResolvedValueOnce([baseTrain])
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce([movedTrain]);

    service.onModuleInit();

    const request = new MockRequest();

    service.createEventsStream(request).subscribe({
      next: (event) => {
        events.push({
          type: event.type,
          data: event.data,
        });
      },
      complete,
    });

    await flushPromises();

    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('snapshot');

    jest.advanceTimersByTime(10_000);
    await flushPromises();

    expect(complete).not.toHaveBeenCalled();
    expect(events).toHaveLength(1);

    jest.advanceTimersByTime(10_000);
    await flushPromises();

    expect(complete).not.toHaveBeenCalled();
    expect(events[1]).toMatchObject({
      type: 'updated',
      data: {
        train: movedTrain,
        previousGeometry: baseTrain.geometry,
        polledAt: expect.any(String) as string,
      },
    });

    const updatedData = events[1]?.data as
      | {
          train: Train;
          previousGeometry: Train['geometry'];
          polledAt: string;
        }
      | undefined;
    expect(updatedData?.train.speedKph).toBeGreaterThan(0);

    request.emit('close');
    service.onModuleDestroy();
  });

  it('stops background polling on module destroy', async () => {
    jest.useFakeTimers();

    korailService.getTrains.mockResolvedValue([createTrain()]);

    service.onModuleInit();
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(1);

    service.onModuleDestroy();

    jest.advanceTimersByTime(10_000);
    await flushPromises();

    expect(korailService.getTrains).toHaveBeenCalledTimes(1);
  });
});

class MockRequest extends EventEmitter {}

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
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}
