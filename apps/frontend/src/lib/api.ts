import axios from "axios";
import type {
  LiveStatsResponse,
  SegmentStatsResponseItem,
  Station,
  StationStatsResponseItem,
  TrainScheduleItem,
  TrendPoint,
} from "../types/dashboard";

export function getApiUrl(path: string) {
  const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();

  if (configuredBaseUrl) {
    return new URL(path, configuredBaseUrl).toString();
  }

  return path;
}

export function getTrainEventsUrl() {
  return getApiUrl("/api/train/events");
}

export function getStationsUrl() {
  return getApiUrl("/api/station");
}

export function getStatsLiveUrl() {
  return getApiUrl("/api/stats/live");
}

export function getStatsStationsUrl() {
  return getApiUrl("/api/stats/stations");
}

export function getStatsSegmentsUrl() {
  return getApiUrl("/api/stats/segments");
}

export function getStatsTrendsUrl() {
  const url = new URL(getApiUrl("/api/stats/trends"), window.location.origin);
  const now = new Date();
  const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  url.searchParams.set("bucket", "1h");
  url.searchParams.set("from", from.toISOString());
  url.searchParams.set("to", now.toISOString());

  return import.meta.env.VITE_API_BASE_URL?.trim()
    ? url.toString()
    : `${url.pathname}${url.search}`;
}

export function getTrainScheduleUrl(trainId: string, date: string) {
  const url = new URL(
    getApiUrl(`/api/train/${encodeURIComponent(trainId)}/schedule`),
    window.location.origin,
  );

  url.searchParams.set("date", date);

  return import.meta.env.VITE_API_BASE_URL?.trim()
    ? url.toString()
    : `${url.pathname}${url.search}`;
}

export const apiClient = axios.create();

export async function getStations(signal?: AbortSignal) {
  const response = await apiClient.get<Station[]>(getStationsUrl(), { signal });
  return response.data;
}

export async function getStatsLive(signal?: AbortSignal) {
  const response = await apiClient.get<LiveStatsResponse>(getStatsLiveUrl(), {
    signal,
  });
  return response.data;
}

export async function getStatsStations(signal?: AbortSignal) {
  const response = await apiClient.get<StationStatsResponseItem[]>(
    getStatsStationsUrl(),
    { signal },
  );
  return response.data;
}

export async function getStatsSegments(signal?: AbortSignal) {
  const response = await apiClient.get<SegmentStatsResponseItem[]>(
    getStatsSegmentsUrl(),
    { signal },
  );
  return response.data;
}

export async function getStatsTrends(signal?: AbortSignal) {
  const response = await apiClient.get<TrendPoint[]>(getStatsTrendsUrl(), {
    signal,
  });
  return response.data;
}

export async function getTrainSchedule(
  trainId: string,
  date: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<TrainScheduleItem[]>(
    getTrainScheduleUrl(trainId, date),
    { signal },
  );
  return response.data;
}
