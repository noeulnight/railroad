import { Controller, Get, Param, Res, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { RailwayTileParamsDto } from './dto/railway-tile-params.dto';
import { RailwayMapService } from './railway-map.service';

@Controller('map/railway')
export class RailwayMapController {
  constructor(private readonly railwayMapService: RailwayMapService) {}

  @Get(':z/:x/:y.png')
  async getTile(
    @Param() params: RailwayTileParamsDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const tile = await this.railwayMapService.getTile(params);

    response.setHeader('Content-Type', 'image/png');
    response.setHeader('Cache-Control', 'public, max-age=300');

    return new StreamableFile(tile);
  }
}
