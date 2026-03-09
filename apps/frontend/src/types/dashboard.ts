export type Direction = "UP" | "DOWN";

export type Train = {
  id: string;
  type: string;
  direction: Direction;
  geometry: {
    bearing: number;
    longitude: number;
    latitude: number;
  };
  department: {
    station?: {
      name?: string;
    };
    date: string;
  };
  arrival: {
    stations?: {
      name?: string;
    };
    date: string;
  };
  currentStation?: {
    name?: string;
  };
  nextStation?: {
    name?: string;
  };
  delay: number;
};

export type TrainScheduleItem = {
  id: string;
  date: string;
  delay: number;
  station: {
    name: string;
    grade?: number;
    geometry?: {
      longitude: number;
      latitude: number;
    };
  };
  arrivalTime: string;
  departureTime: string;
};

export type TrainSnapshotEventData = {
  trains: Train[];
  total: number;
  polledAt: string;
};

export type TrainCreatedEventData = {
  train: Train;
  polledAt: string;
};

export type TrainUpdatedEventData = {
  train: Train;
  polledAt: string;
};

export type TrainRemovedEventData = {
  id: string;
  polledAt: string;
};

export type Station = {
  name: string;
  grade?: number;
  geometry?: {
    longitude: number;
    latitude: number;
  };
};

export type DashboardData = {
  connectionState: "connecting" | "live" | "reconnecting";
  errorMessage?: string;
  lastPolledAt?: string;
  stationError?: string;
  stations: Station[];
  trains: Train[];
  visibleStations: Station[];
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
};

export type LiveStatsResponse = {
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
    direction: Direction;
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
};

export type TrendPoint = {
  bucketStart: string;
  activeTrainCount: number;
  delayedTrainCount: number;
  delayRate: number;
  avgDelay: number;
  maxDelay: number;
  createdCount: number;
  removedCount: number;
};

export type StationStatsResponseItem = {
  stationName: string;
  grade?: number;
  activeTrainCount: number;
  delayedTrainCount: number;
  avgDelay: number;
  maxDelay: number;
};

export type SegmentStatsResponseItem = {
  currentStationName: string;
  nextStationName: string;
  trainCount: number;
  delayedTrainCount: number;
  avgDelay: number;
  maxDelay: number;
};

export type StatsDashboardData = {
  isLoading: boolean;
  errorMessage?: string;
  liveStats?: LiveStatsResponse;
  stationStats: StationStatsResponseItem[];
  segmentStats: SegmentStatsResponseItem[];
  trendPoints: TrendPoint[];
};
