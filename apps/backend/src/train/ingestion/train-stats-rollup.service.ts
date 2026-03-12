import { Injectable, Logger } from '@nestjs/common';
import { TrainEventType } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type { Train } from '../interface/train.interface';
import { calculateDelayMetrics } from './train-persistence.utils';

@Injectable()
export class TrainStatsRollupService {
  private readonly logger = new Logger(TrainStatsRollupService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async refreshHourlyRollup(trains: Train[], sampledAt: string) {
    try {
      const sampledAtDate = new Date(sampledAt);
      const bucketStart = new Date(sampledAtDate);
      bucketStart.setMinutes(0, 0, 0);
      const bucketEnd = new Date(bucketStart);
      bucketEnd.setHours(bucketEnd.getHours() + 1);

      const [createdCount, removedCount] = await Promise.all([
        this.prisma.trainEvent.count({
          where: {
            eventType: TrainEventType.CREATED,
            occurredAt: {
              gte: bucketStart,
              lt: bucketEnd,
            },
          },
        }),
        this.prisma.trainEvent.count({
          where: {
            eventType: TrainEventType.REMOVED,
            occurredAt: {
              gte: bucketStart,
              lt: bucketEnd,
            },
          },
        }),
      ]);

      const metrics = calculateDelayMetrics(trains);

      await this.prisma.trainStatsHourly.upsert({
        where: {
          bucketStart,
        },
        create: {
          bucketStart,
          ...metrics,
          createdCount,
          removedCount,
        },
        update: {
          ...metrics,
          createdCount,
          removedCount,
        },
      });
    } catch (error) {
      this.logger.error(
        'Failed to refresh hourly train rollup',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
