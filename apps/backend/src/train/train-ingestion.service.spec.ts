import { TrainEventType } from '@prisma/client';
import { Direction } from 'src/korail/interface/train.interface';
import { KorailService } from 'src/korail/korail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Train } from './interface/train.interface';
import { TrainIngestionService } from './train-ingestion.service';
import type { TrainDelta } from './utils/diff-trains.util';

describe('TrainIngestionService', () => {
  let prismaService: {
    trainSnapshotSample: { createMany: jest.Mock };
    trainEvent: { create: jest.Mock; count: jest.Mock };
    trainStatsHourly: { upsert: jest.Mock };
    station: { upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let korailService: jest.Mocked<Pick<KorailService, 'getStations'>>;
  let service: TrainIngestionService;

  beforeEach(() => {
    prismaService = {
      trainSnapshotSample: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      trainEvent: {
        create: jest.fn().mockResolvedValue(undefined),
        count: jest.fn().mockResolvedValue(0),
      },
      trainStatsHourly: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      station: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
      $transaction: jest
        .fn()
        .mockImplementation(async (operations: unknown[]) => {
          await Promise.all(operations);
        }),
    };
    korailService = {
      getStations: jest.fn().mockResolvedValue([
        {
          name: '서울',
          grade: 1,
          geometry: { latitude: 37.55, longitude: 126.97 },
        },
      ]),
    };
    service = new TrainIngestionService(
      prismaService as unknown as PrismaService,
      korailService as unknown as KorailService,
    );
  });

  it('persists snapshot rows with normalized train fields', async () => {
    await service.recordSnapshot([createTrain()], '2026-03-09T10:00:00.000Z');

    expect(prismaService.trainSnapshotSample.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          trainId: '1',
          type: 'ktx',
          direction: 'UP',
          currentStationName: '대전',
          nextStationName: '동대구',
        }),
      ],
    });
  });

  it('persists updated delta rows including previous geometry', async () => {
    const delta: TrainDelta = {
      type: 'updated',
      data: {
        train: createTrain({
          geometry: {
            bearing: 120,
            latitude: 36.1,
            longitude: 128.4,
          },
        }),
        previousGeometry: {
          bearing: 90,
          latitude: 36.0,
          longitude: 128.0,
        },
        polledAt: '2026-03-09T10:00:10.000Z',
      },
    };

    await service.recordDelta(delta);

    expect(prismaService.trainEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        eventType: TrainEventType.UPDATED,
        trainId: '1',
        previousLatitude: 36.0,
        previousLongitude: 128.0,
      }) as Record<string, unknown>,
    });
  });

  it('upserts hourly rollups from the latest snapshot and event counts', async () => {
    prismaService.trainEvent.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(1);

    await service.refreshHourlyRollup(
      [createTrain(), createTrain({ id: '2', delay: 12 })],
      '2026-03-09T10:15:00.000Z',
    );

    expect(prismaService.trainStatsHourly.upsert).toHaveBeenCalledWith({
      where: {
        bucketStart: new Date('2026-03-09T10:00:00.000Z'),
      },
      create: expect.objectContaining({
        activeTrainCount: 2,
        delayedTrainCount: 1,
        avgDelay: 6,
        maxDelay: 12,
        createdCount: 3,
        removedCount: 1,
      }) as Record<string, unknown>,
      update: expect.objectContaining({
        activeTrainCount: 2,
      }) as Record<string, unknown>,
    });
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
