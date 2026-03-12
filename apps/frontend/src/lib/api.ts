import axios from "axios";
import type {
  LiveStatsResponse,
  SegmentStatsResponseItem,
  Station,
  StationStatsResponseItem,
  TrainScheduleItem,
  TrendPoint,
} from "../types/dashboard";

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim() || undefined;

function buildExternalUrl(path: string) {
  if (!configuredBaseUrl) {
    return path;
  }

  return new URL(path, configuredBaseUrl).toString();
}

export function getTrainEventsUrl() {
  return buildExternalUrl("/api/train/events");
}

export const apiClient = axios.create({
  baseURL: configuredBaseUrl,
});

export async function getStations(signal?: AbortSignal) {
  const response = await apiClient.get<Station[]>("/api/station", { signal });
  return response.data;
}

export async function getStatsLive(signal?: AbortSignal) {
  const response = await apiClient.get<LiveStatsResponse>("/api/stats/live", {
    signal,
  });
  return response.data;
}

export async function getStatsStations(signal?: AbortSignal) {
  const response = await apiClient.get<StationStatsResponseItem[]>(
    "/api/stats/stations",
    { signal },
  );
  return response.data;
}

export async function getStatsSegments(signal?: AbortSignal) {
  const response = await apiClient.get<SegmentStatsResponseItem[]>(
    "/api/stats/segments",
    { signal },
  );
  return response.data;
}

export async function getStatsTrends(signal?: AbortSignal) {
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const response = await apiClient.get<TrendPoint[]>("/api/stats/trends", {
    signal,
    params: {
      bucket: "1h",
      from: from.toISOString(),
      to: now.toISOString(),
    },
  });
  return response.data;
}

export async function getTrainSchedule(
  trainId: string,
  date: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<TrainScheduleItem[]>(
    `/api/train/${encodeURIComponent(trainId)}/schedule`,
    {
      signal,
      params: { date },
    },
  );
  return response.data;
}
