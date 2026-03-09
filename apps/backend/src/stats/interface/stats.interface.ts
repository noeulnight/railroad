export interface LiveStatsResponse {
  sampledAt: string;
  totals: {
    totalTrains: number;
    delayedTrains: number;
    delayRate: number;
    avgDelay: number;
    maxDelay: number;
  };
  delayBuckets: {
    under5m: number;
    under10m: number;
    under20m: number;
    over20m: number;
  };
  byType: Array<{
    type: string;
    count: number;
    delayedCount: number;
    delayRate: number;
    avgDelay: number;
  }>;
  byDirection: Array<{
    direction: 'UP' | 'DOWN';
    count: number;
  }>;
  byStation: Array<{
    stationName: string;
    count: number;
  }>;
  topDelayed: Array<{
    trainId: string;
    type: string;
    delay: number;
    currentStationName?: string;
    nextStationName?: string;
  }>;
}

export interface TrendPoint {
  bucketStart: string;
  activeTrainCount: number;
  delayedTrainCount: number;
  delayRate: number;
  avgDelay: number;
  maxDelay: number;
  createdCount: number;
  removedCount: number;
}

export interface StationStatsResponseItem {
  stationName: string;
  grade?: number;
  activeTrainCount: number;
  delayedTrainCount: number;
  avgDelay: number;
  maxDelay: number;
}

export interface SegmentStatsResponseItem {
  currentStationName: string;
  nextStationName: string;
  trainCount: number;
  delayedTrainCount: number;
  avgDelay: number;
  maxDelay: number;
}

export interface TrainHistoryResponse {
  trainId: string;
  samples: Array<{
    sampledAt: string;
    delayMinutes: number;
    latitude: number;
    longitude: number;
    currentStationName?: string;
    nextStationName?: string;
  }>;
  events: Array<{
    occurredAt: string;
    eventType: 'CREATED' | 'UPDATED' | 'REMOVED';
    delayMinutes?: number;
    latitude?: number;
    longitude?: number;
    currentStationName?: string;
    nextStationName?: string;
  }>;
}
