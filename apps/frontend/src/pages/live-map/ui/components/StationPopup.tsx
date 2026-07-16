import { useMemo, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, MapPin, X } from "lucide-react";
import type { Station } from "@/entities/station/model/types";
import { trainQueries } from "@/entities/train/model/trainQueries";
import type { Train } from "@/entities/train/model/types";
import {
  cn,
  formatDateTime,
  formatDelay,
  formatTrainRoute,
  getScheduleDate,
  getTrainImageSrc,
} from "@/shared/lib/utils";

export function StationPopup(props: {
  station: Station;
  trains: Train[];
  onClose: () => void;
  onTrainSelect: (train: Train) => void;
}) {
  const [mode, setMode] = useState<"arrival" | "departure">("arrival");
  const stationTrains = useMemo(
    () =>
      props.trains.filter(
        (train) =>
          train.nextStation?.name === props.station.name ||
          train.currentStation?.name === props.station.name,
      ),
    [props.station.name, props.trains],
  );
  const scheduleQueries = useQueries({
    queries: stationTrains.map((train) =>
      trainQueries.schedule(train.id, getScheduleDate(train)),
    ),
  });
  const services = stationTrains
    .map((train, index) => {
      const schedule = scheduleQueries[index]?.data?.find(
        (item) => item.station.name === props.station.name,
      );
      const delay = schedule?.delay || train.delay;
      const addDelay = (scheduledAt?: string) =>
        scheduledAt
          ? new Date(
              Date.parse(scheduledAt) + Math.max(delay, 0) * 60_000,
            ).toISOString()
          : undefined;

      return {
        train,
        delay,
        arrivalAt: addDelay(schedule?.arrivalTime ?? schedule?.date),
        departureAt: addDelay(schedule?.departureTime ?? schedule?.date),
        loading: scheduleQueries[index]?.isPending ?? false,
      };
    });
  const arrivals = services
    .filter(({ train }) => train.nextStation?.name === props.station.name)
    .map((service) => ({ ...service, expectedAt: service.arrivalAt }))
    .sort(
      (a, b) =>
        Date.parse(a.expectedAt ?? "9999-12-31") -
        Date.parse(b.expectedAt ?? "9999-12-31"),
    );
  const departures = services
    .filter(({ train }) => train.currentStation?.name === props.station.name)
    .map((service) => ({ ...service, expectedAt: service.departureAt }))
    .sort(
      (a, b) =>
        Date.parse(a.expectedAt ?? "9999-12-31") -
        Date.parse(b.expectedAt ?? "9999-12-31"),
    );
  const displayedServices = mode === "arrival" ? arrivals : departures;
  const trainTypes = [
    ...new Set(displayedServices.map(({ train }) => train.type)),
  ];

  return (
    <div className="flex h-full min-w-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="flex items-start gap-2 px-3 pt-3">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-md bg-sidebar-accent p-2">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-blue-600 text-white">
            <MapPin className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate text-base font-semibold">
              {props.station.name}역
            </div>
            <div className="mt-0.5 text-xs text-sidebar-foreground/60">
              도착 {arrivals.length}대 · 출발 {departures.length}대
            </div>
          </div>
        </div>
        <button
          type="button"
          aria-label="역 정보 닫기"
          className="mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
          onClick={props.onClose}
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 pt-3 pb-3">
        <div className="grid grid-cols-2 rounded-md bg-sidebar-accent p-1">
          <button
            type="button"
            aria-pressed={mode === "arrival"}
            className={cn(
              "cursor-pointer rounded px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/60",
              mode === "arrival" &&
                "bg-sidebar text-sidebar-foreground shadow-sm",
            )}
            onClick={() => setMode("arrival")}
          >
            도착 예정 {arrivals.length}
          </button>
          <button
            type="button"
            aria-pressed={mode === "departure"}
            className={cn(
              "cursor-pointer rounded px-2 py-1.5 text-xs font-semibold text-sidebar-foreground/60",
              mode === "departure" &&
                "bg-sidebar text-sidebar-foreground shadow-sm",
            )}
            onClick={() => setMode("departure")}
          >
            출발 열차 {departures.length}
          </button>
        </div>

        {trainTypes.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {trainTypes.map((type) => (
              <span
                key={type}
                className="rounded-full bg-sidebar-accent px-2 py-1 text-[10px] font-semibold text-sidebar-foreground/70"
              >
                {type}
              </span>
            ))}
          </div>
        ) : null}

        <div className="text-xs font-semibold text-sidebar-foreground/60">
          {mode === "arrival" ? "도착 예정" : "출발 예정 및 최근 출발"}
        </div>
        <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1 scrollbar-hide">
          {displayedServices.length === 0 ? (
            <div className="rounded-md bg-sidebar-accent px-3 py-8 text-center text-sm text-sidebar-foreground/65">
              {mode === "arrival"
                ? "현재 접근 중인 열차가 없습니다."
                : "현재 출발 열차가 없습니다."}
            </div>
          ) : (
            displayedServices.map(
              ({ train, delay, expectedAt, loading }) => (
                <button
                  key={train.id}
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-2 rounded-md bg-sidebar-accent px-2.5 py-2 text-left hover:bg-sidebar-accent/70"
                  onClick={() => props.onTrainSelect(train)}
                >
                  <img
                    alt=""
                    className="size-8 shrink-0 -scale-x-100 object-contain"
                    src={getTrainImageSrc(train.type)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      {train.direction === "UP" ? (
                        <ArrowUp className="size-3 text-blue-600" />
                      ) : (
                        <ArrowDown className="size-3 text-red-600" />
                      )}
                      <span className="truncate">
                        {train.type}#{train.id}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-[10px] text-sidebar-foreground/55">
                      {formatTrainRoute(train)}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-semibold">
                      {loading ? "확인 중" : formatDateTime(expectedAt)}
                    </span>
                    <span
                      className={cn(
                        "block text-[10px] text-sidebar-foreground/55",
                        delay > 0 && "font-semibold text-red-500",
                      )}
                    >
                      {formatDelay(delay)}
                    </span>
                  </span>
                </button>
              ),
            )
          )}
        </div>
      </div>
    </div>
  );
}
