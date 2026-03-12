import { TrainEventType, TrainDirection } from '@prisma/client';
import { Direction } from 'src/korail/interface/train.interface';
import type { Train } from '../interface/train.interface';
import {
  calculateDelayMetrics,
  mapCreatedEventRow,
  mapRemovedEventRow,
  mapSnapshotRows,
  mapUpdatedEventRow,
} from './train-persistence.utils';

describe('train-persistence utils', () => {
  it('maps snapshot rows with normalized train fields', () => {
    const rows = mapSnapshotRows(
      [createTrain()],
      new Date('2026-03-09T10:00:00.000Z'),
    );

    expect(rows).toEqual([
      expect.objectContaining({
        trainId: '1',
        type: 'ktx',
        direction: TrainDirection.UP,
        currentStationName: '대전',
        nextStationName: '동대구',
      }),
    ]);
  });

  it('maps delta event rows including previous geometry', () => {
    expect(
      mapUpdatedEventRow({
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
      }),
    ).toMatchObject({
      eventType: TrainEventType.UPDATED,
      previousLatitude: 36.0,
      previousLongitude: 128.0,
    });

    expect(
      mapCreatedEventRow({
        train: createTrain(),
        polledAt: '2026-03-09T10:00:00.000Z',
      }),
    ).toMatchObject({
      eventType: TrainEventType.CREATED,
      direction: TrainDirection.UP,
    });

    expect(
      mapRemovedEventRow({
        id: '1',
        polledAt: '2026-03-09T10:00:20.000Z',
      }),
    ).toMatchObject({
      eventType: TrainEventType.REMOVED,
      trainId: '1',
    });
  });

  it('calculates delay metrics for rollups', () => {
    expect(
      calculateDelayMetrics([
        createTrain(),
        createTrain({ id: '2', delay: 12 }),
      ]),
    ).toEqual({
      activeTrainCount: 2,
      delayedTrainCount: 1,
      avgDelay: 6,
      maxDelay: 12,
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
