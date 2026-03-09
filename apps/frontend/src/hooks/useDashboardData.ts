import { useEffect, useState } from "react";
import { getStations, getTrainEventsUrl } from "../lib/api";
import { shouldShowStation } from "../lib/format";
import type {
  DashboardData,
  Station,
  Train,
  TrainCreatedEventData,
  TrainRemovedEventData,
  TrainSnapshotEventData,
  TrainUpdatedEventData,
} from "../types/dashboard";

export function useDashboardData(): DashboardData {
  const [trains, setTrains] = useState<Record<string, Train>>({});
  const [stations, setStations] = useState<Station[]>([]);
  const [connectionState, setConnectionState] = useState<
    "connecting" | "live" | "reconnecting"
  >("connecting");
  const [lastPolledAt, setLastPolledAt] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [stationError, setStationError] = useState<string>();
  const [zoomLevel, setZoomLevel] = useState(8);

  useEffect(() => {
    let isDisposed = false;
    const controller = new AbortController();

    void getStations(controller.signal)
      .then((data) => {
        if (isDisposed) {
          return;
        }

        setStations(data.filter((station) => station.geometry));
        setStationError(undefined);
      })
      .catch((error: unknown) => {
        if (isDisposed || controller.signal.aborted) {
          return;
        }

        setStationError("역 정보를 불러오지 못했습니다.");
        console.error(error);
      });

    return () => {
      isDisposed = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    const eventSource = new EventSource(getTrainEventsUrl());

    const handleSnapshot = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainSnapshotEventData;
      const nextTrains = Object.fromEntries(
        data.trains.map((train) => [train.id, train]),
      );

      setTrains(nextTrains);
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
      setErrorMessage(undefined);
    };

    const handleCreated = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainCreatedEventData;

      setTrains((current) => ({
        ...current,
        [data.train.id]: data.train,
      }));
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
    };

    const handleUpdated = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainUpdatedEventData;

      setTrains((current) => ({
        ...current,
        [data.train.id]: data.train,
      }));
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
    };

    const handleRemoved = (event: MessageEvent<string>) => {
      const data = JSON.parse(event.data) as TrainRemovedEventData;

      setTrains((current) => {
        const next = { ...current };
        delete next[data.id];
        return next;
      });
      setLastPolledAt(data.polledAt);
      setConnectionState("live");
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

  const trainList = Object.values(trains);
  const visibleStations = stations.filter((station) =>
    shouldShowStation(zoomLevel, station.grade),
  );

  return {
    connectionState,
    errorMessage,
    lastPolledAt,
    stationError,
    stations,
    trains: trainList,
    visibleStations,
    zoomLevel,
    setZoomLevel,
  };
}
