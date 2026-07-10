import type { Cache } from 'cache-manager';
import { firstValueFrom, of } from 'rxjs';
import type { KorailService } from 'src/korail/korail.service';
import { Direction } from 'src/korail/interfaces/train.interface';
import type { Train } from 'src/train/interfaces/train.interface';
import type { TrainPollingService } from 'src/train/runtime/train-polling.service';
import type { TrainStreamBroadcasterService } from 'src/train/runtime/train-stream-broadcaster.service';
import { PUBLIC_API_SCHEDULE_CACHE_TTL_MS } from '../constants/public-api.constants';
import type { PublicTrainSchedule } from '../interfaces/public-api.interface';
import { PublicApiService } from '../public-api.service';

describe('PublicApiService', () => {
  let cacheManager: jest.Mocked<Pick<Cache, 'get' | 'set'>>;
  let korailService: jest.Mocked<
    Pick<KorailService, 'getSchedule' | 'getStations' | 'getTrains'>
  >;
  let trainPollingService: jest.Mocked<
    Pick<TrainPollingService, 'getSnapshot'>
  >;
  let trainStreamBroadcaster: jest.Mocked<
    Pick<TrainStreamBroadcasterService, 'createEventsStream'>
  >;
  let service: PublicApiService;

  const train: Train = {
    id: '001',
    type: 'KTX',
    direction: Direction.DOWN,
    geometry: {
      longitude: 126.9707,
      latitude: 37.5547,
      bearing: 145,
    },
    departure: {
      station: {
        name: '서울',
        grade: 1,
        geometry: { longitude: 126.9707, latitude: 37.5547 },
      },
      date: new Date('2026-07-10T00:00:00.000Z'),
    },
    arrival: {
      stations: { name: '부산', grade: 1 },
      date: new Date('2026-07-10T02:30:00.000Z'),
    },
    currentStation: { name: '대전' },
    nextStation: { name: '동대구' },
    delay: 3,
    speedKmh: 248.6,
  };

  beforeEach(() => {
    cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
    };
    korailService = {
      getSchedule: jest.fn(),
      getStations: jest.fn(),
      getTrains: jest.fn(),
    };
    trainPollingService = {
      getSnapshot: jest.fn(),
    };
    trainStreamBroadcaster = {
      createEventsStream: jest.fn(),
    };
    service = new PublicApiService(
      korailService as unknown as KorailService,
      trainPollingService as unknown as TrainPollingService,
      trainStreamBroadcaster as unknown as TrainStreamBroadcasterService,
      cacheManager as unknown as Cache,
    );
  });

  it('maps the polling snapshot to the stable public train contract', async () => {
    trainPollingService.getSnapshot.mockReturnValue({
      trains: [train],
      total: 1,
      polledAt: '2026-07-10T00:00:05.000Z',
    });

    await expect(service.getTrains()).resolves.toEqual({
      trains: [
        {
          trainNo: '001',
          type: 'KTX',
          direction: Direction.DOWN,
          position: {
            longitude: 126.9707,
            latitude: 37.5547,
            bearing: 145,
          },
          departure: {
            station: {
              name: '서울',
              grade: 1,
              position: { longitude: 126.9707, latitude: 37.5547 },
            },
            scheduledAt: '2026-07-10T00:00:00.000Z',
          },
          arrival: {
            station: { name: '부산', grade: 1 },
            scheduledAt: '2026-07-10T02:30:00.000Z',
          },
          currentStation: { name: '대전' },
          nextStation: { name: '동대구' },
          delayMinutes: 3,
          speedKmh: 248.6,
        },
      ],
      total: 1,
      polledAt: '2026-07-10T00:00:05.000Z',
    });
    expect(korailService.getTrains).not.toHaveBeenCalled();
  });

  it('falls back to a direct provider read before the first polling snapshot', async () => {
    trainPollingService.getSnapshot.mockReturnValue(undefined);
    korailService.getTrains.mockResolvedValue([train]);

    const result = await service.getTrains();

    expect(result.trains).toHaveLength(1);
    expect(result.polledAt).toEqual(expect.any(String));
    expect(korailService.getTrains).toHaveBeenCalledTimes(1);
  });

  it('normalizes and caches schedule requests by service date and train number', async () => {
    cacheManager.get.mockResolvedValue(undefined);
    korailService.getSchedule.mockResolvedValue([
      {
        id: '0001',
        date: new Date('2026-07-10T00:00:00.000Z'),
        delay: 2,
        station: { name: '서울', grade: 1 },
        departureTime: new Date('2026-07-10T00:00:00.000Z'),
      },
    ]);

    const result = await service.getSchedule('001', '2026-07-10');

    expect(korailService.getSchedule).toHaveBeenCalledWith('001', '20260710');
    expect(result).toEqual({
      trainNo: '001',
      serviceDate: '2026-07-10',
      stops: [
        {
          stationCode: '0001',
          station: { name: '서울', grade: 1 },
          departureAt: '2026-07-10T00:00:00.000Z',
          delayMinutes: 2,
        },
      ],
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'public-api:schedule:2026-07-10:001',
      result,
      PUBLIC_API_SCHEDULE_CACHE_TTL_MS,
    );
  });

  it('returns a cached schedule without calling the provider', async () => {
    const cached: PublicTrainSchedule = {
      trainNo: '001',
      serviceDate: '2026-07-10',
      stops: [],
    };
    cacheManager.get.mockResolvedValue(cached);

    await expect(service.getSchedule('001', '2026-07-10')).resolves.toBe(
      cached,
    );
    expect(korailService.getSchedule).not.toHaveBeenCalled();
  });

  it('maps internal SSE updates without leaking internal field names', async () => {
    trainStreamBroadcaster.createEventsStream.mockReturnValue(
      of({
        type: 'updated',
        data: {
          train,
          previousGeometry: {
            longitude: 126.9,
            latitude: 37.5,
            bearing: 140,
          },
          polledAt: '2026-07-10T00:00:05.000Z',
        },
      }),
    );

    const event = await firstValueFrom(
      service.createTrainEventsStream({
        on: jest.fn(),
        off: jest.fn(),
      }),
    );

    expect(event).toMatchObject({
      type: 'updated',
      data: {
        train: {
          trainNo: '001',
          departure: { station: { name: '서울' } },
          arrival: { station: { name: '부산' } },
        },
        previousPosition: {
          longitude: 126.9,
          latitude: 37.5,
          bearing: 140,
        },
      },
    });
  });
});
