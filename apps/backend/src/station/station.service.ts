import { Injectable } from '@nestjs/common';
import { KorailService } from 'src/korail/korail.service';

@Injectable()
export class StationService {
  constructor(private readonly korailService: KorailService) {}

  public async getStations() {
    return this.korailService.getStations();
  }
}
