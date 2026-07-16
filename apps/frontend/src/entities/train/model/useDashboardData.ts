import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { stationQueries } from "@/entities/station/model/stationQueries";
import { getTrainEventsUrl } from "@/entities/train/api/trainApi";
import { shouldShowStation } from "@/shared/lib/utils";
import type {
  DashboardData,
  Train,
  TrainPositionSample,
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainSnapshotEventData,
  TrainUpdatedEventData,
} from "./types";

export function useDashboardData(): DashboardData {
  const [trains, setTrains] = useState<Record<string, Train>>({});
  const [trainPositionHistory, setTrainPositionHistory] = useState<
    Record<string, TrainPositionSample[]>
  >({});
  const [connectionState, setConnectionState] = useState<
    "connecting" | "live" | "reconnecting"
  >("connecting");
  const [lastPolledAt, setLastPolledAt] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [zoomLevel, setZoomLevel] = useState(8);
  const stationsQuery = useQuery(stationQueries.list());

  useEffect(() => {
    const eventSource = new EventSource(getTrainEventsUrl());
    const pendingDeltas: Array<
      | { train: Train; polledAt: string }
      | { id: string; polledAt: string }
    > = [];
    let flushTimer: ReturnType<typeof setTimeout> | undefined;
    const recordPositions = (nextTrains: Train[], observedAt: string) => {
      const observedAtMs = Date.parse(observedAt);
      const cutoff = observedAtMs - 10 * 60 * 1_000;

      setTrainPositionHistory((current) => {
        const next = { ...current };

        for (const train of nextTrains) {
          const history = (current[train.id] ?? []).filter(
            (sample) => sample.observedAt >= cutoff,
          );
          const previous = history.at(-1);

          if (
            !previous ||
            previous.longitude !== train.geometry.longitude ||
            previous.latitude !== train.geometry.latitude
          ) {
            history.push({
              longitude: train.geometry.longitude,
              latitude: train.geometry.latitude,
              observedAt: observedAtMs,
            });
          }

          next[train.id] = history;
        }

        return next;
      });
    };
    const flushDeltas = () => {
      flushTimer = undefined;
      const deltas = pendingDeltas.splice(0);
      const upsertedTrains = deltas.flatMap((delta) =>
        "train" in delta ? [delta.train] : [],
      );
      const removedIds = deltas.flatMap((delta) =>
        "id" in delta ? [delta.id] : [],
      );
      const polledAt = deltas.at(-1)?.polledAt;

      setTrains((current) => {
        const next = { ...current };

        for (const delta of deltas) {
          if ("train" in delta) next[delta.train.id] = delta.train;
          else delete next[delta.id];
        }

        return next;
      });

      if (polledAt && upsertedTrains.length > 0) {
        recordPositions(upsertedTrains, polledAt);
      }
      if (removedIds.length > 0) {
        setTrainPositionHistory((current) => {
          const next = { ...current };
          for (const id of removedIds) delete next[id];
          return next;
        });
      }

      setLastPolledAt(polledAt);
      setConnectionState("live");
    };
    const enqueueDelta = (delta: (typeof pendingDeltas)[number]) => {
      pendingDeltas.push(delta);
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      flushTimer = setTimeout(flushDeltas, 16);
    };

    const handleSnapshot = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainSnapshotEventData;
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      flushTimer = undefined;
      pendingDeltas.length = 0;
      const nextTrains = Object.fromEntries(
        data.trains.map((train) => [train.id, train]),
      );

      recordPositions(data.trains, data.polledAt);
      setTrains(nextTrains);
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
      setErrorMessage(undefined);
    };

    const handleCreated = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainCreatedEventData;
      enqueueDelta(data);
    };

    const handleUpdated = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainUpdatedEventData;
      enqueueDelta(data);
    };

    const handleRemoved = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainRemovedEventData;
      enqueueDelta(data);
    };

    const handleOpen = () => {
      setConnectionState("live");
      setErrorMessage(undefined);
    };

    const handleError = () => {
      setConnectionState("reconnecting");
      setErrorMessage("SSE 연결이 끊어져 재연결을 시도 중입니다.");
    };

    eventSource.addEventListener("snapshot", handleSnapshot as EventListener);
    eventSource.addEventListener("created", handleCreated as EventListener);
    eventSource.addEventListener("updated", handleUpdated as EventListener);
    eventSource.addEventListener("removed", handleRemoved as EventListener);
    eventSource.onopen = handleOpen;
    eventSource.onerror = handleError;

    return () => {
      if (flushTimer !== undefined) clearTimeout(flushTimer);
      eventSource.removeEventListener(
        "snapshot",
        handleSnapshot as EventListener,
      );
      eventSource.removeEventListener(
        "created",
        handleCreated as EventListener,
      );
      eventSource.removeEventListener(
        "updated",
        handleUpdated as EventListener,
      );
      eventSource.removeEventListener(
        "removed",
        handleRemoved as EventListener,
      );
      eventSource.close();
    };
  }, []);

  const trainList = useMemo(() => Object.values(trains), [trains]);
  const stations = useMemo(
    () => (stationsQuery.data ?? []).filter((station) => station.geometry),
    [stationsQuery.data],
  );
  const visibleStations = useMemo(
    () =>
      stations.filter((station) => shouldShowStation(zoomLevel, station.grade)),
    [stations, zoomLevel],
  );

  return {
    connectionState,
    errorMessage,
    lastPolledAt,
    stationError: stationsQuery.isError
      ? "역 정보를 불러오지 못했습니다."
      : undefined,
    stations,
    trains: trainList,
    trainPositionHistory,
    visibleStations,
    zoomLevel,
    setZoomLevel,
  };
}
