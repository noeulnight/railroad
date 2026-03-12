import { EventEmitter } from 'events';
import { Direction } from 'src/korail/interface/train.interface';
import type { Train } from '../interface/train.interface';
import { TrainStreamBroadcasterService } from './train-stream-broadcaster.service';

describe('TrainStreamBroadcasterService', () => {
  let service: TrainStreamBroadcasterService;

  beforeEach(() => {
    service = new TrainStreamBroadcasterService();
  });

  it('emits a snapshot first and then forwards buffered deltas', async () => {
    const events: Array<{ type?: string; data: unknown }> = [];
    const request = new EventEmitter();

    service.createEventsStream(request).subscribe((event) => {
      events.push({
        type: event.type,
        data: event.data,
      });
    });

    service.publishPollResult({
      batch: {
        trains: [createTrain()],
        polledAt: '2026-03-09T00:00:00.000Z',
      },
      snapshot: new Map([['1', createTrain()]]),
      deltas: [],
      hasPreviousSnapshot: false,
    });

    await flushPromises();

    expect(events[0]).toMatchObject({
      type: 'snapshot',
      data: {
        total: 1,
      },
    });

    service.publishPollResult({
      batch: {
        trains: [
          createTrain({
            geometry: {
              bearing: 45,
              longitude: 128,
              latitude: 36,
            },
          }),
        ],
        polledAt: '2026-03-09T00:00:10.000Z',
      },
      snapshot: new Map(),
      deltas: [
        {
          type: 'updated',
          data: {
            train: createTrain({
              geometry: {
                bearing: 45,
                longitude: 128,
                latitude: 36,
              },
            }),
            previousGeometry: createTrain().geometry,
            polledAt: '2026-03-09T00:00:10.000Z',
          },
        },
      ],
      hasPreviousSnapshot: true,
    });

    expect(events[1]).toMatchObject({
      type: 'updated',
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

async function flushPromises() {
  await Promise.resolve();
  await Promise.resolve();
}
