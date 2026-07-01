import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, ArrowUp, X } from "lucide-react";
import { trainQueries } from "@/entities/train/model/trainQueries";
import {
  cn,
  formatDateTime,
  formatDelayedArrival,
  formatDelay,
  formatDirectionLabel,
  formatScheduleMeta,
  formatScheduleTime,
  formatTrainRoute,
  getEffectiveScheduleDelay,
  getScheduleDate,
  getTrainImageSrc,
} from "@/shared/lib/utils";
import type {
  DashboardData,
  TrainScheduleItem,
} from "@/entities/train/model/types";

export function TrainPopup(props: {
  train: DashboardData["trains"][number];
  onClose?: () => void;
}) {
  const { train, onClose } = props;
  const scheduleQuery = useQuery(
    trainQueries.schedule(train.id, getScheduleDate(train)),
  );

  return (
    <div className="relative flex h-full min-w-0 flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="flex min-h-0 flex-1 flex-col gap-2 px-3 py-3">
        <div className="flex items-start gap-2">
          <div className="flex min-w-0 flex-1 items-start gap-2 rounded-md bg-sidebar-accent p-2 text-sidebar-accent-foreground">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-tl-sm"
            >
              <img
                alt=""
                className="h-full w-full -scale-x-100 object-contain"
                src={getTrainImageSrc(train.type)}
              />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center justify-between gap-2">
                <div className="min-w-0 truncate text-base font-semibold">
                  {train.type}#{train.id}
                </div>
                <div
                  className={cn("shrink-0 text-xs font-semibold", {
                    "text-red-500": train.delay > 0,
                    "text-sidebar-foreground/60": train.delay <= 0,
                  })}
                >
                  {formatDelay(train.delay)}
                </div>
              </div>
              <div className="mt-0.5 flex min-w-0 items-center gap-1 text-xs text-sidebar-foreground/60">
                {train.direction === "UP" ? (
                  <ArrowUp className="size-3 shrink-0 text-blue-600" />
                ) : (
                  <ArrowDown className="size-3 shrink-0 text-red-600" />
                )}
                <span>{formatDirectionLabel(train.direction)}</span>
                <span>·</span>
                <span className="truncate">{formatTrainRoute(train)}</span>
              </div>
            </div>
          </div>
          {onClose ? (
            <button
              aria-label="열차 정보 닫기"
              className="mt-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-sidebar-foreground/65 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              onClick={onClose}
              type="button"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        <div className="grid w-full grid-cols-2 gap-1 text-sm">
          <InfoItem label="현재역" value={train.currentStation?.name ?? "-"} />
          <InfoItem label="다음역" value={train.nextStation?.name ?? "-"} />
          <InfoItem
            label="출발역"
            value={train.department.station?.name ?? "-"}
          />
          <InfoItem
            label="도착역"
            value={train.arrival.stations?.name ?? "-"}
          />
          <InfoItem
            label="예정 출발"
            value={formatDateTime(train.department.date)}
          />
          <InfoItem
            label="예정 도착"
            value={formatDelayedArrival(train.arrival.date, train.delay)}
            valueAccent={train.delay > 0 ? `+${train.delay}분` : undefined}
            subValue={
              train.delay > 0
                ? `(${formatDateTime(train.arrival.date)})`
                : undefined
            }
          />
        </div>

        <div className="min-h-0 flex-1">
          <ScheduleTab
            items={scheduleQuery.data ?? []}
            loading={scheduleQuery.isPending}
            errorMessage={
              scheduleQuery.isError
                ? "시간표를 불러오지 못했습니다."
                : undefined
            }
            currentStation={train.currentStation?.name}
            trainDelay={train.delay}
          />
        </div>
      </div>
    </div>
  );
}

function ScheduleTab(props: {
  items: TrainScheduleItem[];
  currentStation?: string;
  trainDelay: number;
  loading: boolean;
  errorMessage?: string;
}) {
  if (props.loading) {
    return (
      <div className="rounded-md bg-sidebar-accent px-3 py-6 text-center text-sm text-sidebar-foreground/65">
        시간표를 불러오는 중입니다.
      </div>
    );
  }

  if (props.errorMessage) {
    return (
      <div className="rounded-md bg-sidebar-accent px-3 py-6 text-center text-sm text-red-500">
        {props.errorMessage}
      </div>
    );
  }

  if (props.items.length === 0) {
    return (
      <div className="rounded-md bg-sidebar-accent px-3 py-6 text-center text-sm text-sidebar-foreground/65">
        시간표 데이터가 없습니다.
      </div>
    );
  }

  const currentStationIndex = props.currentStation
    ? props.items.findIndex(
      (item) => item.station.name === props.currentStation,
    )
    : -1;

  return (
    <div className="h-full space-y-1 overflow-y-auto pr-1 scrollbar-hide max-h-80 md:max-h-max">
      {props.items.map((item, index) =>
        (() => {
          const effectiveDelay = getEffectiveScheduleDelay(
            item,
            index,
            currentStationIndex,
            props.trainDelay,
          );
          const isDelayed = effectiveDelay > 0;

          return (
            <div
              key={`${item.id}-${item.arrivalTime}`}
              className={cn("rounded-md bg-sidebar-accent px-3 py-2", {
                "border border-sidebar-ring/35 bg-sidebar":
                  props.currentStation === item.station.name,
              })}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-semibold text-sidebar-foreground">
                  {item.station.name}
                </div>
                <div
                  className={cn("text-xs text-sidebar-foreground/60", {
                    "text-red-500": isDelayed,
                  })}
                >
                  {formatScheduleMeta(
                    index,
                    props.items.length,
                    effectiveDelay,
                  )}
                </div>
              </div>
              <div
                className={cn(
                  "mt-1 flex items-center justify-between text-sm text-sidebar-foreground/60",
                )}
              >
                <span>
                  {formatScheduleTime(item.arrivalTime, effectiveDelay)}
                </span>
                <ArrowRight className="size-3" />
                <span>
                  {formatScheduleTime(item.departureTime, effectiveDelay)}
                </span>
              </div>
            </div>
          );
        })(),
      )}
    </div>
  );
}

function InfoItem(props: {
  label: string;
  value: string;
  valueAccent?: string;
  subValue?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "w-full rounded-md bg-sidebar-accent p-2",
        props.className,
      )}
    >
      <div className="text-xs text-sidebar-foreground/60">{props.label}</div>
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-semibold text-sidebar-foreground">
          {props.value}
        </span>
        {props.valueAccent ? (
          <span className="text-xs font-semibold text-red-500">
            {props.valueAccent}
          </span>
        ) : null}
      </div>
      {props.subValue ? (
        <div className="text-[12px] text-sidebar-foreground/50">
          {props.subValue}
        </div>
      ) : null}
    </div>
  );
}
