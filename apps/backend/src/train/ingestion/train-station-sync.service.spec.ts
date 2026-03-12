import { KorailService } from 'src/korail/korail.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { TrainStationSyncService } from './train-station-sync.service';

describe('TrainStationSyncService', () => {
  let prismaService: {
    station: { upsert: jest.Mock };
  };
  let korailService: jest.Mocked<Pick<KorailService, 'getStations'>>;
  let service: TrainStationSyncService;

  beforeEach(() => {
    prismaService = {
      station: {
        upsert: jest.fn().mockResolvedValue(undefined),
      },
    };
    korailService = {
      getStations: jest.fn().mockResolvedValue([
        {
          name: '부산',
          grade: 1,
          geometry: { latitude: 35.1151, longitude: 129.0414 },
        },
        {
          name: '서울',
          grade: 1,
          geometry: { latitude: 37.5547, longitude: 126.9706 },
        },
      ]),
    };
    service = new TrainStationSyncService(
      prismaService as unknown as PrismaService,
      korailService as unknown as KorailService,
    );
  });

  it('runs only one sync when called concurrently', async () => {
    let resolveUpsert!: () => void;
    prismaService.station.upsert.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          resolveUpsert = resolve;
        }),
    );

    const firstSync = service.syncIfNeeded(true);
    const secondSync = service.syncIfNeeded(true);
    await Promise.resolve();

    expect(korailService.getStations).toHaveBeenCalledTimes(1);
    expect(prismaService.station.upsert).toHaveBeenCalledTimes(1);

    resolveUpsert();
    await firstSync;
    await secondSync;

    expect(prismaService.station.upsert).toHaveBeenCalledTimes(2);
  });

  it('upserts stations in a stable sorted order', async () => {
    await service.syncIfNeeded(true);

    expect(prismaService.station.upsert).toHaveBeenNthCalledWith(1, {
      where: { name: '부산' },
      create: expect.any(Object) as Record<string, unknown>,
      update: expect.any(Object) as Record<string, unknown>,
    });
    expect(prismaService.station.upsert).toHaveBeenNthCalledWith(2, {
      where: { name: '서울' },
      create: expect.any(Object) as Record<string, unknown>,
      update: expect.any(Object) as Record<string, unknown>,
    });
  });
});
