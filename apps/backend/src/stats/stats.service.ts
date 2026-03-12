import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import type {
  LiveStatsResponse,
  SegmentStatsResponseItem,
  StationStatsResponseItem,
  TrainHistoryResponse,
  TrendPoint,
} from './interface/stats.interface';

type Bucket = '10m' | '1h' | '1d';

type TrendRow = {
  bucketStart: Date;
  activeTrainCount: number;
  delayedTrainCount: number;
  delayRate: number;
  avgDelay: number;
  maxDelay: number;
  createdCount: number;
  removedCount: number;
};

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  public async getLiveStats(): Promise<LiveStatsResponse> {
    const latestSampledAt = await this.getLatestSampledAt();

    if (!latestSampledAt) {
      return buildEmptyLiveStats();
    }

    const rows = await this.getSnapshotRows(latestSampledAt, {
      orderBy: [{ delayMinutes: 'desc' }, { trainId: 'asc' }],
    });

    return mapLiveStats(latestSampledAt, rows);
  }

  public async getTrendStats(
    from?: string,
    to?: string,
    bucket: Bucket = '1h',
  ): Promise<TrendPoint[]> {
    const end = to ? parseDateParam(to, 'to') : new Date();
    const start = from
      ? parseDateParam(from, 'from')
      : new Date(end.getTime() - 24 * 60 * 60 * 1000);

    if (bucket === '1h') {
      const rows = await this.prisma.trainStatsHourly.findMany({
        where: {
          bucketStart: {
            gte: start,
            lte: end,
          },
        },
        orderBy: { bucketStart: 'asc' },
      });

      return rows.map(mapHourlyTrendRow);
    }

    const rows = await this.prisma.$queryRaw<TrendRow[]>(
      buildTrendQuery(start, end, bucket),
    );

    return rows.map(mapRawTrendRow);
  }

  public async getStationStats(): Promise<StationStatsResponseItem[]> {
    const latestSampledAt = await this.getLatestSampledAt();

    if (!latestSampledAt) {
      return [];
    }

    const [samples, stations] = await Promise.all([
      this.getSnapshotRows(latestSampledAt),
      this.prisma.station.findMany(),
    ]);

    const stationsByName = new Map(
      stations.map((station) => [station.name, station]),
    );
    const stats = new Map<
      string,
      {
        stationName: string;
        activeTrainCount: number;
        delayedTrainCount: number;
        totalDelay: number;
        maxDelay: number;
      }
    >();

    for (const sample of samples) {
      if (!sample.currentStationName) {
        continue;
      }

      const entry = stats.get(sample.currentStationName) ?? {
        stationName: sample.currentStationName,
        activeTrainCount: 0,
        delayedTrainCount: 0,
        totalDelay: 0,
        maxDelay: 0,
      };

      entry.activeTrainCount += 1;
      if (sample.delayMinutes > 0) {
        entry.delayedTrainCount += 1;
      }
      entry.totalDelay += sample.delayMinutes;
      entry.maxDelay = Math.max(entry.maxDelay, sample.delayMinutes);
      stats.set(sample.currentStationName, entry);
    }

    return Array.from(stats.values())
      .map((entry) => ({
        stationName: entry.stationName,
        grade: stationsByName.get(entry.stationName)?.grade ?? undefined,
        activeTrainCount: entry.activeTrainCount,
        delayedTrainCount: entry.delayedTrainCount,
        avgDelay: round(entry.totalDelay / entry.activeTrainCount),
        maxDelay: entry.maxDelay,
      }))
      .sort((left, right) => right.activeTrainCount - left.activeTrainCount);
  }

  public async getSegmentStats(): Promise<SegmentStatsResponseItem[]> {
    const latestSampledAt = await this.getLatestSampledAt();

    if (!latestSampledAt) {
      return [];
    }

    const samples = await this.getSnapshotRows(latestSampledAt);

    const segments = new Map<
      string,
      SegmentStatsResponseItem & { totalDelay: number }
    >();

    for (const sample of samples) {
      if (!sample.currentStationName || !sample.nextStationName) {
        continue;
      }

      const key = `${sample.currentStationName}->${sample.nextStationName}`;
      const entry = segments.get(key) ?? {
        currentStationName: sample.currentStationName,
        nextStationName: sample.nextStationName,
        trainCount: 0,
        delayedTrainCount: 0,
        avgDelay: 0,
        maxDelay: 0,
        totalDelay: 0,
      };

      entry.trainCount += 1;
      if (sample.delayMinutes > 0) {
        entry.delayedTrainCount += 1;
      }
      entry.totalDelay += sample.delayMinutes;
      entry.maxDelay = Math.max(entry.maxDelay, sample.delayMinutes);
      segments.set(key, entry);
    }

    return Array.from(segments.values())
      .map(({ totalDelay, ...entry }) => ({
        ...entry,
        avgDelay:
          entry.trainCount === 0 ? 0 : round(totalDelay / entry.trainCount),
      }))
      .sort((left, right) => {
        if (right.trainCount !== left.trainCount) {
          return right.trainCount - left.trainCount;
        }

        return right.avgDelay - left.avgDelay;
      })
      .slice(0, 20);
  }

  public async getTrainHistory(trainId: string): Promise<TrainHistoryResponse> {
    const [samples, events] = await Promise.all([
      this.prisma.trainSnapshotSample.findMany({
        where: { trainId },
        orderBy: { sampledAt: 'desc' },
        take: 200,
      }),
      this.prisma.trainEvent.findMany({
        where: { trainId },
        orderBy: { occurredAt: 'desc' },
        take: 200,
      }),
    ]);

    if (samples.length === 0 && events.length === 0) {
      throw new NotFoundException(`No history found for train ${trainId}`);
    }

    return {
      trainId,
      samples: samples.map((sample) => ({
        sampledAt: sample.sampledAt.toISOString(),
        delayMinutes: sample.delayMinutes,
        latitude: sample.latitude,
        longitude: sample.longitude,
        currentStationName: sample.currentStationName ?? undefined,
        nextStationName: sample.nextStationName ?? undefined,
      })),
      events: events.map((event) => ({
        occurredAt: event.occurredAt.toISOString(),
        eventType: event.eventType,
        delayMinutes: event.delayMinutes ?? undefined,
        latitude: event.latitude ?? undefined,
        longitude: event.longitude ?? undefined,
        currentStationName: event.currentStationName ?? undefined,
        nextStationName: event.nextStationName ?? undefined,
      })),
    };
  }

  private async getLatestSampledAt(): Promise<Date | undefined> {
    const latestSample = await this.prisma.trainSnapshotSample.findFirst({
      orderBy: { sampledAt: 'desc' },
      select: { sampledAt: true },
    });

    return latestSample?.sampledAt;
  }

  private async getSnapshotRows(
    sampledAt: Date,
    options?: {
      orderBy?: Prisma.TrainSnapshotSampleOrderByWithRelationInput[];
    },
  ) {
    return this.prisma.trainSnapshotSample.findMany({
      where: { sampledAt },
      orderBy: options?.orderBy,
    });
  }
}

function buildEmptyLiveStats(): LiveStatsResponse {
  return {
    sampledAt: new Date(0).toISOString(),
    totals: {
      totalTrains: 0,
      delayedTrains: 0,
      delayRate: 0,
      avgDelay: 0,
      maxDelay: 0,
    },
    delayBuckets: {
      under5m: 0,
      under10m: 0,
      under20m: 0,
      over20m: 0,
    },
    byType: [],
    byDirection: [],
    byStation: [],
    topDelayed: [],
  };
}

function mapLiveStats(
  sampledAt: Date,
  rows: Array<{
    trainId: string;
    type: string;
    direction: 'UP' | 'DOWN';
    delayMinutes: number;
    currentStationName: string | null;
    nextStationName: string | null;
  }>,
): LiveStatsResponse {
  const delayedRows = rows.filter((row) => row.delayMinutes > 0);
  const totalDelay = rows.reduce((sum, row) => sum + row.delayMinutes, 0);
  const byTypeMap = new Map<
    string,
    {
      type: string;
      count: number;
      delayedCount: number;
      totalDelay: number;
    }
  >();
  const byDirectionMap = new Map<'UP' | 'DOWN', number>();
  const byStationMap = new Map<string, number>();

  for (const row of rows) {
    const typeEntry = byTypeMap.get(row.type) ?? {
      type: row.type,
      count: 0,
      delayedCount: 0,
      totalDelay: 0,
    };
    typeEntry.count += 1;
    typeEntry.totalDelay += row.delayMinutes;
    if (row.delayMinutes > 0) {
      typeEntry.delayedCount += 1;
    }
    byTypeMap.set(row.type, typeEntry);

    byDirectionMap.set(
      row.direction,
      (byDirectionMap.get(row.direction) ?? 0) + 1,
    );

    if (row.currentStationName) {
      byStationMap.set(
        row.currentStationName,
        (byStationMap.get(row.currentStationName) ?? 0) + 1,
      );
    }
  }

  return {
    sampledAt: sampledAt.toISOString(),
    totals: {
      totalTrains: rows.length,
      delayedTrains: delayedRows.length,
      delayRate:
        rows.length === 0 ? 0 : round((delayedRows.length / rows.length) * 100),
      avgDelay: rows.length === 0 ? 0 : round(totalDelay / rows.length),
      maxDelay: rows.reduce(
        (maxDelay, row) => Math.max(maxDelay, row.delayMinutes),
        0,
      ),
    },
    delayBuckets: {
      under5m: rows.filter(
        (row) => row.delayMinutes > 0 && row.delayMinutes < 5,
      ).length,
      under10m: rows.filter(
        (row) => row.delayMinutes >= 5 && row.delayMinutes < 10,
      ).length,
      under20m: rows.filter(
        (row) => row.delayMinutes >= 10 && row.delayMinutes < 20,
      ).length,
      over20m: rows.filter((row) => row.delayMinutes >= 20).length,
    },
    byType: Array.from(byTypeMap.values())
      .map((entry) => ({
        type: entry.type,
        count: entry.count,
        delayedCount: entry.delayedCount,
        delayRate: round((entry.delayedCount / entry.count) * 100),
        avgDelay: round(entry.totalDelay / entry.count),
      }))
      .sort((left, right) => right.count - left.count),
    byDirection: Array.from(byDirectionMap.entries()).map(
      ([direction, count]) => ({
        direction,
        count,
      }),
    ),
    byStation: Array.from(byStationMap.entries())
      .map(([stationName, count]) => ({
        stationName,
        count,
      }))
      .sort((left, right) => right.count - left.count)
      .slice(0, 10),
    topDelayed: delayedRows.slice(0, 10).map((row) => ({
      trainId: row.trainId,
      type: row.type,
      delay: row.delayMinutes,
      currentStationName: row.currentStationName ?? undefined,
      nextStationName: row.nextStationName ?? undefined,
    })),
  };
}

function mapHourlyTrendRow(row: {
  bucketStart: Date;
  activeTrainCount: number;
  delayedTrainCount: number;
  avgDelay: number;
  maxDelay: number;
  createdCount: number;
  removedCount: number;
}): TrendPoint {
  return {
    bucketStart: row.bucketStart.toISOString(),
    activeTrainCount: row.activeTrainCount,
    delayedTrainCount: row.delayedTrainCount,
    delayRate:
      row.activeTrainCount === 0
        ? 0
        : round((row.delayedTrainCount / row.activeTrainCount) * 100),
    avgDelay: row.avgDelay,
    maxDelay: row.maxDelay,
    createdCount: row.createdCount,
    removedCount: row.removedCount,
  };
}

function mapRawTrendRow(row: TrendRow): TrendPoint {
  return {
    bucketStart: row.bucketStart.toISOString(),
    activeTrainCount: Number(row.activeTrainCount),
    delayedTrainCount: Number(row.delayedTrainCount),
    delayRate: Number(row.delayRate),
    avgDelay: Number(row.avgDelay),
    maxDelay: Number(row.maxDelay),
    createdCount: Number(row.createdCount),
    removedCount: Number(row.removedCount),
  };
}

function parseDateParam(value: string, label: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label} date: ${value}`);
  }

  return parsed;
}

function round(value: number) {
  return Math.round(value * 100) / 100;
}

function buildTrendQuery(start: Date, end: Date, bucket: Bucket) {
  const bucketStart =
    bucket === '10m'
      ? Prisma.sql`date_trunc('hour', "sampled_at") + floor(date_part('minute', "sampled_at") / 10) * interval '10 minutes'`
      : Prisma.sql`date_trunc('day', "sampled_at")`;

  const bucketEvent =
    bucket === '10m'
      ? Prisma.sql`date_trunc('hour', "occurred_at") + floor(date_part('minute', "occurred_at") / 10) * interval '10 minutes'`
      : Prisma.sql`date_trunc('day', "occurred_at")`;

  return Prisma.sql`
    WITH snapshot_rollup AS (
      SELECT
        ${bucketStart} AS "bucketStart",
        MAX(sample_counts.active_train_count) AS "activeTrainCount",
        MAX(sample_counts.delayed_train_count) AS "delayedTrainCount",
        MAX(
          CASE
            WHEN sample_counts.active_train_count = 0 THEN 0
            ELSE (sample_counts.delayed_train_count::float / sample_counts.active_train_count::float) * 100
          END
        )::float AS "delayRate",
        MAX(sample_counts.avg_delay) AS "avgDelay",
        MAX(sample_counts.max_delay) AS "maxDelay"
      FROM (
        SELECT
          "sampled_at",
          COUNT(*)::int AS active_train_count,
          COUNT(*) FILTER (WHERE "delay_minutes" > 0)::int AS delayed_train_count,
          AVG("delay_minutes")::float AS avg_delay,
          MAX("delay_minutes")::int AS max_delay
        FROM "train_snapshot_samples"
        WHERE "sampled_at" >= ${start} AND "sampled_at" <= ${end}
        GROUP BY "sampled_at"
      ) AS sample_counts
      GROUP BY "bucketStart"
    ),
    event_rollup AS (
      SELECT
        ${bucketEvent} AS "bucketStart",
        COUNT(*) FILTER (WHERE "event_type" = 'CREATED')::int AS "createdCount",
        COUNT(*) FILTER (WHERE "event_type" = 'REMOVED')::int AS "removedCount"
      FROM "train_events"
      WHERE "occurred_at" >= ${start} AND "occurred_at" <= ${end}
      GROUP BY "bucketStart"
    )
    SELECT
      COALESCE(snapshot_rollup."bucketStart", event_rollup."bucketStart") AS "bucketStart",
      COALESCE(snapshot_rollup."activeTrainCount", 0) AS "activeTrainCount",
      COALESCE(snapshot_rollup."delayedTrainCount", 0) AS "delayedTrainCount",
      COALESCE(snapshot_rollup."delayRate", 0)::float AS "delayRate",
      COALESCE(snapshot_rollup."avgDelay", 0)::float AS "avgDelay",
      COALESCE(snapshot_rollup."maxDelay", 0) AS "maxDelay",
      COALESCE(event_rollup."createdCount", 0) AS "createdCount",
      COALESCE(event_rollup."removedCount", 0) AS "removedCount"
    FROM snapshot_rollup
    FULL OUTER JOIN event_rollup
      ON snapshot_rollup."bucketStart" = event_rollup."bucketStart"
    ORDER BY "bucketStart" ASC
  `;
}
