import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainUpdatedEventData,
} from '../interface/train.interface';
import type { TrainDelta } from '../utils/diff-trains.util';
import {
  mapCreatedEventRow,
  mapRemovedEventRow,
  mapUpdatedEventRow,
} from './train-persistence.utils';

@Injectable()
export class TrainEventPersistenceService {
  private readonly logger = new Logger(TrainEventPersistenceService.name);

  constructor(private readonly prisma: PrismaService) {}

  public async recordDelta(delta: TrainDelta) {
    try {
      switch (delta.type) {
        case 'created':
          await this.recordCreatedEvent(delta.data);
          return;
        case 'updated':
          await this.recordUpdatedEvent(delta.data);
          return;
        case 'removed':
          await this.recordRemovedEvent(delta.data);
          return;
      }
    } catch (error) {
      this.logger.error(
        `Failed to persist ${delta.type} train event`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  private async recordCreatedEvent(data: TrainCreatedEventData) {
    await this.prisma.trainEvent.create({
      data: mapCreatedEventRow(data),
    });
  }

  private async recordUpdatedEvent(data: TrainUpdatedEventData) {
    await this.prisma.trainEvent.create({
      data: mapUpdatedEventRow(data),
    });
  }

  private async recordRemovedEvent(data: TrainRemovedEventData) {
    await this.prisma.trainEvent.create({
      data: mapRemovedEventRow(data),
    });
  }
}
