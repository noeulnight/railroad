import { Direction } from 'src/korail/interface/train.interface';
import type { Train } from '../interface/train.interface';
import { buildTrainSnapshot, diffTrains } from './diff-trains.util';

describe('diffTrains', () => {
  const previousPolledAt = '2026-03-08T23:00:00.000Z';
  const polledAt = '2026-03-09T00:00:00.000Z';

  it('returns no deltas when geometry is unchanged', () => {
    const previousSnapshot = buildTrainSnapshot([createTrain()]);
    const nextTrains = [createTrain()];

    expect(
      diffTrains(previousSnapshot, nextTrains, previousPolledAt, polledAt),
    ).toEqual([]);
  });

  it('returns an updated delta when geometry changes', () => {
    const previousSnapshot = buildTrainSnapshot([createTrain()]);
    const nextTrains = [
      createTrain({
        geometry: {
          bearing: 45,
          longitude: 127,
          latitude: 38.5,
        },
      }),
    ];

    const [delta] = diffTrains(
      previousSnapshot,
      nextTrains,
      previousPolledAt,
      polledAt,
    );

    expect(delta).toMatchObject({
      type: 'updated',
      data: {
        train: expect.objectContaining({
          ...nextTrains[0],
          speedKph: expect.any(Number),
        }),
        previousGeometry: {
          bearing: 0,
          longitude: 127,
          latitude: 37.5,
        },
        polledAt,
      },
    });

    if (!delta || delta.type !== 'updated') {
      throw new Error('Expected an updated delta');
    }

    expect(delta.data.train.speedKph).toBeGreaterThan(110);
    expect(delta.data.train.speedKph).toBeLessThan(112);
  });

  it('keeps speed empty when timestamps are not increasing', () => {
    const previousSnapshot = buildTrainSnapshot([createTrain()]);
    const nextTrains = [
      createTrain({
        geometry: {
          bearing: 45,
          longitude: 127,
          latitude: 38.5,
        },
      }),
    ];

    const [delta] = diffTrains(
      previousSnapshot,
      nextTrains,
      polledAt,
      polledAt,
    );

    if (!delta || delta.type !== 'updated') {
      throw new Error('Expected an updated delta');
    }

    expect(delta.data.train.speedKph).toBeUndefined();
  });

  it('returns a created delta for a new train id', () => {
    const previousSnapshot = buildTrainSnapshot([createTrain()]);
    const nextTrains = [createTrain(), createTrain({ id: '2' })];

    expect(
      diffTrains(previousSnapshot, nextTrains, previousPolledAt, polledAt),
    ).toEqual([
      expect.objectContaining({
        type: 'created',
        data: expect.objectContaining({
          train: expect.objectContaining({
            id: '2',
            speedKph: undefined,
          }),
          polledAt,
        }),
      }),
    ]);
  });

  it('returns a removed delta for a missing train id', () => {
    const previousSnapshot = buildTrainSnapshot([createTrain()]);

    expect(
      diffTrains(previousSnapshot, [], previousPolledAt, polledAt),
    ).toEqual([
      {
        type: 'removed',
        data: {
          id: '1',
          polledAt,
        },
      },
    ]);
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
    speedKph: undefined,
    ...overrides,
  };
}
