import type { HttpService } from '@nestjs/axios';
import { of, throwError } from 'rxjs';
import { RailwayTileUnavailableException } from '../exceptions/railway-tile-unavailable.exception';
import { RailwayMapService } from '../railway-map.service';

describe('RailwayMapService', () => {
  const get = jest.fn();
  const service = new RailwayMapService({ get } as unknown as HttpService);
  const params = { z: 8, x: 218, y: 99 };

  beforeEach(() => {
    get.mockReset();
  });

  it('returns the upstream tile as a buffer', async () => {
    get.mockReturnValue(of({ data: new Uint8Array([137, 80, 78, 71]) }));

    await expect(service.getTile(params)).resolves.toEqual(
      Buffer.from([137, 80, 78, 71]),
    );
    expect(get).toHaveBeenCalledWith('/tiles/railway/8/218/99.png', {
      responseType: 'arraybuffer',
    });
  });

  it('maps upstream failures to a stable HTTP error', async () => {
    get.mockReturnValue(throwError(() => new Error('upstream failed')));

    await expect(service.getTile(params)).rejects.toBeInstanceOf(
      RailwayTileUnavailableException,
    );
  });
});
