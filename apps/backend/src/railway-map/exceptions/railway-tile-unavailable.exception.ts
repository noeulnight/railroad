import { HttpException, HttpStatus } from '@nestjs/common';

export class RailwayTileUnavailableException extends HttpException {
  constructor() {
    super(
      {
        code: 'RAILWAY_TILE_UNAVAILABLE',
        message: 'Railway map tile is temporarily unavailable.',
      },
      HttpStatus.BAD_GATEWAY,
    );
  }
}
