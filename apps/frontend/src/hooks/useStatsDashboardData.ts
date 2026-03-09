import { useEffect, useState } from "react";
import {
  getStatsLive,
  getStatsSegments,
  getStatsStations,
  getStatsTrends,
} from "../lib/api";
import type {
  LiveStatsResponse,
  SegmentStatsResponseItem,
  StationStatsResponseItem,
  StatsDashboardData,
  TrendPoint,
} from "../types/dashboard";

export function useStatsDashboardData(lastPolledAt?: string): StatsDashboardData {
  const [liveStats, setLiveStats] = useState<LiveStatsResponse>();
  const [stationStats, setStationStats] = useState<StationStatsResponseItem[]>([]);
  const [segmentStats, setSegmentStats] = useState<SegmentStatsResponseItem[]>([]);
  const [trendPoints, setTrendPoints] = useState<TrendPoint[]>([]);
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isDisposed = false;
    const controller = new AbortController();

    void Promise.all([
      getStatsLive(controller.signal),
      getStatsStations(controller.signal),
      getStatsSegments(controller.signal),
      getStatsTrends(controller.signal),
    ])
      .then(
        ([nextLiveStats, nextStationStats, nextSegmentStats, nextTrendPoints]) => {
        if (isDisposed) {
          return;
        }

        setLiveStats(nextLiveStats);
        setStationStats(nextStationStats);
        setSegmentStats(nextSegmentStats);
        setTrendPoints(nextTrendPoints);
        setErrorMessage(undefined);
        setIsLoading(false);
        },
      )
      .catch((error: unknown) => {
        if (isDisposed || controller.signal.aborted) {
          return;
        }

        setErrorMessage("통계 데이터를 불러오지 못했습니다.");
        setIsLoading(false);
        console.error(error);
      });

    return () => {
      isDisposed = true;
      controller.abort();
    };
  }, [lastPolledAt]);

  return {
    isLoading,
    errorMessage,
    liveStats,
    stationStats,
    segmentStats,
    trendPoints,
  };
}
