import { Injectable } from '@nestjs/common';
import { KorailService } from 'src/korail/korail.service';
import type { TrainListResponse } from './interface/train.interface';

@Injectable()
export class TrainService {
  constructor(private readonly korailService: KorailService) {}

  public async getTrains(): Promise<TrainListResponse> {
    const trains = await this.korailService.getTrains();

    return {
      trains,
      total: trains.length,
    };
  }
}
