import { NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Direction } from 'src/korail/interface/train.interface';
import type { Train } from 'src/train/interface/train.interface';
import { TrainStreamBroadcasterService } from 'src/train/runtime/train-stream-broadcaster.service';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let prismaService: {
    trainStatsHourly: { findMany: jest.Mock };
    trainEvent: { findMany: jest.Mock };
    station: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let broadcaster: jest.Mocked<Pick<TrainStreamBroadcasterService, 'getSnapshot'>>;
  let service: StatsService;

  beforeEach(() => {
    prismaService = {
      trainStatsHourly: {
        findMany: jest.fn(),
      },
      trainEvent: {
        findMany: jest.fn(),
      },
      station: {
        findMany: jest.fn(),
      },
      $queryRaw: jest.fn(),
    };
    broadcaster = {
      getSnapshot: jest.fn(),
    };
    service = new StatsService(
      prismaService as unknown as PrismaService,
      broadcaster as unknown as TrainStreamBroadcasterService,
    );
  });

  it('builds live stats from the most recent snapshot only', async () => {
    broadcaster.getSnapshot.mockReturnValue({
      polledAt: '2026-03-09T10:00:00.000Z',
      total: 2,
      trains: [
        createTrain({
          id: '1',
          delay: 0,
          currentStation: { name: '서울', grade: 1 },
          nextStation: undefined,
          direction: Direction.UP,
        }),
        createTrain({
          id: '2',
          delay: 8,
          currentStation: { name: '대전', grade: 1 },
          nextStation: { name: '동대구', grade: 1 },
          direction: Direction.DOWN,
        }),
      ],
    });

    const result = await service.getLiveStats();

    expect(result).toMatchObject({
      sampledAt: '2026-03-09T10:00:00.000Z',
      totals: {
        totalTrains: 2,
        delayedTrains: 1,
        delayRate: 50,
        avgDelay: 4,
        maxDelay: 8,
      },
      delayBuckets: {
        under5m: 0,
        under10m: 1,
        under20m: 0,
        over20m: 0,
      },
      byType: [
        {
          type: 'KTX',
          count: 2,
          delayedCount: 1,
          delayRate: 50,
          avgDelay: 4,
        },
      ],
      topDelayed: [
        {
          trainId: '2',
          delay: 8,
          nextStationName: '동대구',
        },
      ],
    });
  });

  it('returns station stats ordered by active train count', async () => {
    broadcaster.getSnapshot.mockReturnValue({
      polledAt: '2026-03-09T10:00:00.000Z',
      total: 3,
      trains: [
        createTrain({
          currentStation: { name: '서울', grade: 1 },
          nextStation: { name: '대전', grade: 1 },
          delayMinutes: 3,
        }),
        createTrain({
          id: '2',
          currentStation: { name: '서울', grade: 1 },
          nextStation: { name: '대전', grade: 1 },
          delay: 9,
        }),
        createTrain({
          id: '3',
          currentStation: { name: '대전', grade: 2 },
          nextStation: { name: '동대구', grade: 1 },
          delay: 0,
        }),
      ],
    });
    prismaService.station.findMany.mockResolvedValue([
      { name: '서울', grade: 1 },
      { name: '대전', grade: 2 },
    ]);

    const result = await service.getStationStats();

    expect(result[0]).toEqual({
      stationName: '서울',
      grade: 1,
      activeTrainCount: 2,
      delayedTrainCount: 2,
      avgDelay: 6,
      maxDelay: 9,
    });
  });

  it('returns active segment stats from the latest snapshot', async () => {
    broadcaster.getSnapshot.mockReturnValue({
      polledAt: '2026-03-09T10:00:00.000Z',
      total: 3,
      trains: [
        createTrain({
          currentStation: { name: '서울', grade: 1 },
          nextStation: { name: '대전', grade: 1 },
          delay: 4,
        }),
        createTrain({
          id: '2',
          currentStation: { name: '서울', grade: 1 },
          nextStation: { name: '대전', grade: 1 },
          delay: 10,
        }),
        createTrain({
          id: '3',
          currentStation: { name: '대전', grade: 1 },
          nextStation: { name: '동대구', grade: 1 },
          delay: 0,
        }),
      ],
    });

    const result = await service.getSegmentStats();

    expect(result[0]).toEqual({
      currentStationName: '서울',
      nextStationName: '대전',
      trainCount: 2,
      delayedTrainCount: 2,
      avgDelay: 7,
      maxDelay: 10,
    });
  });

  it('throws when no train history exists', async () => {
    prismaService.trainEvent.findMany.mockResolvedValue([]);

    await expect(service.getTrainHistory('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('returns hourly rollups for the 1h bucket', async () => {
    prismaService.trainStatsHourly.findMany.mockResolvedValue([
      {
        bucketStart: new Date('2026-03-09T10:00:00.000Z'),
        activeTrainCount: 12,
        delayedTrainCount: 2,
        avgDelay: 3.5,
        maxDelay: 10,
        createdCount: 1,
        removedCount: 0,
      },
    ]);

    const result = await service.getTrendStats(
      '2026-03-09T09:00:00.000Z',
      '2026-03-09T12:00:00.000Z',
      '1h',
    );

    expect(result).toEqual([
      {
        bucketStart: '2026-03-09T10:00:00.000Z',
        activeTrainCount: 12,
        delayedTrainCount: 2,
        delayRate: 16.67,
        avgDelay: 3.5,
        maxDelay: 10,
        createdCount: 1,
        removedCount: 0,
      },
    ]);
  });
});

function createTrain(
  overrides: Partial<Train> & { delayMinutes?: number } = {},
): Train {
  const delay =
    overrides.delayMinutes ??
    overrides.delay ??
    0;

  return {
    id: '1',
    type: 'KTX',
    direction: Direction.UP,
    geometry: {
      bearing: 0,
      latitude: 37.55,
      longitude: 126.97,
    },
    department: {
      station: { name: '서울', grade: 1 },
      date: new Date('2026-03-09T07:00:00.000Z'),
    },
    arrival: {
      stations: { name: '부산', grade: 1 },
      date: new Date('2026-03-09T10:00:00.000Z'),
    },
    currentStation: { name: '서울', grade: 1 },
    nextStation: { name: '대전', grade: 1 },
    delay,
    ...overrides,
  };
}
