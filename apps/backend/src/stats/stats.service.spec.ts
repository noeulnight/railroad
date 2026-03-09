import { NotFoundException } from '@nestjs/common';
import { TrainDirection } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { StatsService } from './stats.service';

describe('StatsService', () => {
  let prismaService: {
    trainSnapshotSample: { findFirst: jest.Mock; findMany: jest.Mock };
    trainStatsHourly: { findMany: jest.Mock };
    trainEvent: { findMany: jest.Mock };
    station: { findMany: jest.Mock };
    $queryRaw: jest.Mock;
  };
  let service: StatsService;

  beforeEach(() => {
    prismaService = {
      trainSnapshotSample: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
      },
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
    service = new StatsService(prismaService as unknown as PrismaService);
  });

  it('builds live stats from the most recent snapshot only', async () => {
    const sampledAt = new Date('2026-03-09T10:00:00.000Z');

    prismaService.trainSnapshotSample.findFirst.mockResolvedValue({
      sampledAt,
    });
    prismaService.trainSnapshotSample.findMany.mockResolvedValue([
      createSample({
        trainId: '1',
        type: 'KTX',
        direction: TrainDirection.UP,
        delayMinutes: 0,
        currentStationName: '서울',
      }),
      createSample({
        trainId: '2',
        type: 'KTX',
        direction: TrainDirection.DOWN,
        delayMinutes: 8,
        currentStationName: '대전',
        nextStationName: '동대구',
      }),
    ]);

    const result = await service.getLiveStats();

    expect(result).toMatchObject({
      sampledAt: sampledAt.toISOString(),
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
    const sampledAt = new Date('2026-03-09T10:00:00.000Z');

    prismaService.trainSnapshotSample.findFirst.mockResolvedValue({
      sampledAt,
    });
    prismaService.trainSnapshotSample.findMany.mockResolvedValue([
      createSample({
        currentStationName: '서울',
        delayMinutes: 3,
      }),
      createSample({
        trainId: '2',
        currentStationName: '서울',
        delayMinutes: 9,
      }),
      createSample({
        trainId: '3',
        currentStationName: '대전',
        delayMinutes: 0,
      }),
    ]);
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
    const sampledAt = new Date('2026-03-09T10:00:00.000Z');

    prismaService.trainSnapshotSample.findFirst.mockResolvedValue({
      sampledAt,
    });
    prismaService.trainSnapshotSample.findMany.mockResolvedValue([
      createSample({
        currentStationName: '서울',
        nextStationName: '대전',
        delayMinutes: 4,
      }),
      createSample({
        trainId: '2',
        currentStationName: '서울',
        nextStationName: '대전',
        delayMinutes: 10,
      }),
      createSample({
        trainId: '3',
        currentStationName: '대전',
        nextStationName: '동대구',
        delayMinutes: 0,
      }),
    ]);

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
    prismaService.trainSnapshotSample.findMany.mockResolvedValue([]);
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

function createSample(overrides: Record<string, unknown> = {}) {
  return {
    sampledAt: new Date('2026-03-09T10:00:00.000Z'),
    trainId: '1',
    type: 'KTX',
    direction: TrainDirection.UP,
    delayMinutes: 0,
    currentStationName: '서울',
    nextStationName: '대전',
    latitude: 37.55,
    longitude: 126.97,
    ...overrides,
  };
}
