import { Controller, Get } from '@nestjs/common';
import { StationService } from './station.service';

@Controller('station')
export class StationController {
  constructor(private readonly stationService: StationService) {}

  @Get()
  public async getStations() {
    return this.stationService.getStations();
  }
}
