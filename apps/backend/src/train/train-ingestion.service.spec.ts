import { Direction } from 'src/korail/interface/train.interface';
import type { Train } from './interface/train.interface';
import { TrainEventPersistenceService } from './ingestion/train-event-persistence.service';
import { TrainStationSyncService } from './ingestion/train-station-sync.service';
import { TrainStatsRollupService } from './ingestion/train-stats-rollup.service';
import { TrainIngestionService } from './train-ingestion.service';
import type { TrainDelta } from './utils/diff-trains.util';

describe('TrainIngestionService', () => {
  let stationSyncService: jest.Mocked<
    Pick<TrainStationSyncService, 'syncIfNeeded'>
  >;
  let eventPersistenceService: jest.Mocked<
    Pick<TrainEventPersistenceService, 'recordDelta'>
  >;
  let statsRollupService: jest.Mocked<
    Pick<TrainStatsRollupService, 'refreshHourlyRollup'>
  >;
  let service: TrainIngestionService;

  beforeEach(() => {
    stationSyncService = {
      syncIfNeeded: jest.fn().mockResolvedValue(undefined),
    };
    eventPersistenceService = {
      recordDelta: jest.fn().mockResolvedValue(undefined),
    };
    statsRollupService = {
      refreshHourlyRollup: jest.fn().mockResolvedValue(undefined),
    };
    service = new TrainIngestionService(
      stationSyncService as unknown as TrainStationSyncService,
      eventPersistenceService as unknown as TrainEventPersistenceService,
      statsRollupService as unknown as TrainStatsRollupService,
    );
  });

  it('ingests a poll result in the expected order', async () => {
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

    await service.ingestPollResult({
      batch: {
        trains: [createTrain()],
        polledAt: '2026-03-09T10:00:10.000Z',
      },
      snapshot: new Map([['1', createTrain()]]),
      deltas: [delta],
      hasPreviousSnapshot: true,
    });

    expect(
      stationSyncService.syncIfNeeded.mock.invocationCallOrder[0],
    ).toBeLessThan(
      eventPersistenceService.recordDelta.mock.invocationCallOrder[0],
    );
    expect(eventPersistenceService.recordDelta).toHaveBeenCalledWith(delta);
    expect(statsRollupService.refreshHourlyRollup).toHaveBeenCalledWith(
      [createTrain()],
      '2026-03-09T10:00:10.000Z',
    );
  });

  it('keeps helper methods delegating to the split services', async () => {
    await service.recordDelta({
      type: 'removed',
      data: {
        id: '1',
        polledAt: '2026-03-09T10:01:00.000Z',
      },
    });
    await service.refreshHourlyRollup(
      [createTrain({ id: '2', delay: 12 })],
      '2026-03-09T10:15:00.000Z',
    );

    expect(eventPersistenceService.recordDelta).toHaveBeenCalled();
    expect(statsRollupService.refreshHourlyRollup).toHaveBeenCalled();
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
