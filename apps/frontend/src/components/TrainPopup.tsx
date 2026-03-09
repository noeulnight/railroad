import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { ArrowRight, Clock } from "lucide-react";
import { getTrainSchedule } from "../lib/api";
import { formatDateTime } from "../lib/format";
import type { DashboardData, TrainScheduleItem } from "../types/dashboard";
import { cn } from "@/lib/utils";

export function TrainPopup(props: {
  train: DashboardData["trains"][number];
  lastPolledAt?: string;
}) {
  const { train, lastPolledAt } = props;
  const primaryColor = getTrainPrimaryColor(train.type);
  const [schedule, setSchedule] = useState<TrainScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [scheduleError, setScheduleError] = useState<string>();

  useEffect(() => {
    const controller = new AbortController();
    const scheduleDate = getScheduleDate(train);

    void getTrainSchedule(train.id, scheduleDate, controller.signal)
      .then((nextSchedule) => {
        setSchedule(nextSchedule);
        setScheduleLoading(false);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }

        setSchedule([]);
        setScheduleError("시간표를 불러오지 못했습니다.");
        setScheduleLoading(false);
        console.error(error);
      });

    return () => {
      controller.abort();
    };
  }, [train]);

  return (
    <div className="relative min-w-72 space-y-4 p-4">
      <img
        alt={train.type}
        className="absolute right-0 top-0 w-24 rounded-sm object-top"
        src={getTrainImageSrc(train.type)}
      />

      <div className="h-18 flex flex-col justify-center">
        <div className="text-xl font-bold" style={{ color: primaryColor }}>
          {train.type}#{train.id}
        </div>
        <div className="text-sm text-slate-500">
          <span>{train.direction === "UP" ? "상행" : "하행"}</span> ·{" "}
          <span className={train.delay > 0 ? "text-red-500" : ""}>
            지연 {train.delay}분
          </span>
        </div>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">운행 정보</TabsTrigger>
          <TabsTrigger value="schedule">시간표</TabsTrigger>
        </TabsList>
        <TabsContent value="summary">
          <div className="grid w-full grid-cols-2 gap-1 text-sm">
            <InfoItem
              label="현재역"
              value={train.currentStation?.name ?? "-"}
            />
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
        </TabsContent>
        <TabsContent value="schedule">
          <ScheduleTab
            items={schedule}
            loading={scheduleLoading}
            errorMessage={scheduleError}
            currentStation={train.currentStation?.name}
          />
        </TabsContent>
      </Tabs>

      <div className="flex items-center gap-1 text-xs text-slate-500">
        <Clock className="size-3" /> 갱신: {formatDateTime(lastPolledAt)}
      </div>
    </div>
  );
}

function ScheduleTab(props: {
  items: TrainScheduleItem[];
  currentStation?: string;
  loading: boolean;
  errorMessage?: string;
}) {
  if (props.loading) {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
        시간표를 불러오는 중입니다.
      </div>
    );
  }

  if (props.errorMessage) {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-red-500">
        {props.errorMessage}
      </div>
    );
  }

  if (props.items.length === 0) {
    return (
      <div className="rounded-md bg-slate-50 px-3 py-6 text-center text-sm text-slate-500">
        시간표 데이터가 없습니다.
      </div>
    );
  }

  return (
    <div className="max-h-60 space-y-2 overflow-y-auto pr-1 scrollbar-hide">
      {props.items.map((item) => (
        <div
          key={`${item.id}-${item.arrivalTime}`}
          className={cn("rounded-md bg-slate-50 px-3 py-2", {
            "bg-green-200": props.currentStation === item.station.name,
          })}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="font-semibold text-slate-900">
              {item.station.name}
            </div>
            <div className="text-xs text-slate-500">
              {item.delay > 0 ? `지연 ${item.delay}분` : "정시"}
            </div>
          </div>
          <div className="mt-1 flex items-center justify-between  text-sm text-slate-600">
            <span>도착 {formatDateTime(item.arrivalTime)}</span>
            <ArrowRight className="size-3" />
            <span>출발 {formatDateTime(item.departureTime)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function InfoItem(props: {
  label: string;
  value: string;
  valueAccent?: string;
  subValue?: string;
}) {
  return (
    <div className="w-full rounded-md bg-slate-50 p-2">
      <div className="text-xs text-slate-500">{props.label}</div>
      <div className="flex items-center gap-1.5">
        <span className="text-md font-bold text-slate-900">{props.value}</span>
        {props.valueAccent ? (
          <span className="text-xs font-semibold text-red-500">
            {props.valueAccent}
          </span>
        ) : null}
      </div>
      {props.subValue ? (
        <div className="text-[12px] text-slate-400">{props.subValue}</div>
      ) : null}
    </div>
  );
}

function formatDelayedArrival(value: string, delayMinutes: number) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  if (delayMinutes <= 0) {
    return formatDateTime(value);
  }

  return formatDateTime(
    new Date(date.getTime() + delayMinutes * 60 * 1000).toISOString(),
  );
}

function getTrainImageSrc(type: string) {
  const normalized = type.toLowerCase().replaceAll(" ", "").replaceAll("-", "");

  switch (normalized) {
    case "srt":
      return "/srt.png";
    case "ktx산천":
    case "ktx":
      return "/ktx-sanchun.png";
    case "ktx이음":
    case "청룡":
      return "/ktx-chungryong.png";
    case "무궁화":
    case "누리로":
    case "새마을":
      return "/mugungwha.png";
    case "itx":
    case "itx새마을":
    case "itx마음":
    case "itx청춘":
      return "/itx.png";
    default:
      return "/mugungwha.png";
  }
}

function getTrainPrimaryColor(type: string) {
  const normalized = type.toLowerCase().replaceAll(" ", "").replaceAll("-", "");

  switch (normalized) {
    case "srt":
      return "#651C5C";
    case "ktx산천":
    case "ktx":
    case "ktx이음":
    case "청룡":
      return "#1B4298";
    case "무궁화":
    case "누리로":
    case "새마을":
      return "#54565A";
    case "itx":
    case "itx새마을":
    case "itx마음":
    case "itx청춘":
      return "#C10230";
    default:
      return "#54565A";
  }
}

function getScheduleDate(train: DashboardData["trains"][number]) {
  const referenceDate = train.department.date || train.arrival.date;

  if (!referenceDate) {
    return new Date().toISOString().slice(0, 10).replaceAll("-", "");
  }

  return referenceDate.slice(0, 10).replaceAll("-", "");
}
