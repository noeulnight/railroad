import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import type { RailwayTileParamsDto } from './dto/railway-tile-params.dto';
import { RailwayTileUnavailableException } from './exceptions/railway-tile-unavailable.exception';

@Injectable()
export class RailwayMapService {
  constructor(private readonly httpService: HttpService) {}

  async getTile(params: RailwayTileParamsDto): Promise<Buffer> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<ArrayBuffer>(
          `/tiles/railway/${params.z}/${params.x}/${params.y}.png`,
          { responseType: 'arraybuffer' },
        ),
      );

      return Buffer.from(response.data);
    } catch {
      throw new RailwayTileUnavailableException();
    }
  }
}
