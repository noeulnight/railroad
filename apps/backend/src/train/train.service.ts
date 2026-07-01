import { Injectable } from '@nestjs/common';
import type { Schedule } from 'src/korail/interfaces/schedule.interface';
import { KorailService } from 'src/korail/korail.service';
import type { TrainListResponse } from './interfaces/train.interface';

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

  public async getSchedule(id: string, date: string): Promise<Schedule[]> {
    return this.korailService.getSchedule(id, date);
  }
}
