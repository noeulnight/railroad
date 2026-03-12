import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Train } from '../interface/train.interface';
import { mapSnapshotRows } from './train-persistence.utils';

@Injectable()
export class TrainSnapshotPersistenceService {
  private readonly logger = new Logger(TrainSnapshotPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async recordSnapshot(trains: Train[], sampledAt: string) {
    try {
      if (trains.length === 0) {
        return;
      }

      await this.prisma.trainSnapshotSample.createMany({
        data: mapSnapshotRows(trains, new Date(sampledAt)),
      });
    } catch (error) {
      this.logger.error(
        'Failed to persist train snapshot',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
