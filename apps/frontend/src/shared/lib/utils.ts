import { clsx, type ClassValue } from "clsx";
import { format } from "date-fns";
import { twMerge } from "tailwind-merge";
import type {
  Direction,
  Train,
  TrainScheduleItem,
} from "@/entities/train/model/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateTime(value?: string) {
  if (!value) return "-";

  return format(new Date(value), "HH시 mm분");
}

export function formatDelayedArrival(value: string, delayMinutes: number) {
  if (!value) {
    return "-";
  }

  if (delayMinutes <= 0) {
    return formatDateTime(value);
  }

  const date = new Date(value);

  return formatDateTime(
    new Date(date.getTime() + delayMinutes * 60 * 1000).toISOString(),
  );
}

export function formatScheduleTime(value: string, delayMinutes: number) {
  return formatDelayedArrival(value, delayMinutes);
}

export function formatScheduleMeta(
  index: number,
  total: number,
  delayMinutes: number,
) {
  const stationRole =
    index === 0 ? "시발역" : index === total - 1 ? "종착역" : undefined;
  const delayStatus = delayMinutes > 0 ? `지연 ${delayMinutes}분` : "정시";

  return stationRole ? `${stationRole} · ${delayStatus}` : delayStatus;
}

export function getEffectiveScheduleDelay(
  item: TrainScheduleItem,
  index: number,
  currentStationIndex: number,
  trainDelay: number,
) {
  if (item.delay > 0) {
    return item.delay;
  }

  if (trainDelay <= 0 || currentStationIndex === -1) {
    return 0;
  }

  return index >= currentStationIndex ? trainDelay : 0;
}

export function formatDirectionLabel(direction: Direction) {
  return direction === "UP" ? "상행" : "하행";
}

export function getTrainRouteStations(train: Train) {
  const current = train.currentStation?.name ?? train.departure.station?.name;
  const next = train.nextStation?.name ?? train.arrival.stations?.name;

  return { current, next };
}

export function formatTrainRoute(train: Train) {
  const { current, next } = getTrainRouteStations(train);

  if (current && next) {
    return `${current} → ${next}`;
  }

  return current ?? next ?? "위치 확인 중";
}

export function formatDelay(delay: number) {
  return delay > 0 ? `+${delay}분` : "정시";
}

export function formatTrainSpeed(speedKmh: number | null) {
  return speedKmh === null ? "속도 계산 중" : `${Math.round(speedKmh)} km/h`;
}

export function getScheduleDate(train: Train) {
  const referenceDate = train.departure.date || train.arrival.date;

  if (!referenceDate) {
    return new Date().toISOString().slice(0, 10).replaceAll("-", "");
  }

  return referenceDate.slice(0, 10).replaceAll("-", "");
}

export function formatChartLabel(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function getThemeColor(name: string, fallback: string) {
  const value = getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();

  return value || fallback;
}

export function getTrainColor(direction: Direction) {
  return direction === "UP" ? "#2563eb" : "#dc2626";
}

export function normalizeTrainType(value?: string | null) {
  return value?.trim().toLowerCase().replaceAll(/\s+/g, "").replaceAll("-", "");
}

export function getTrainPrimaryColor(type: string) {
  const normalized = normalizeTrainType(type);

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

export function getTrainImageSrc(type: string) {
  const normalized = normalizeTrainType(type);

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

export function shouldShowStation(zoom: number, grade?: number) {
  if (grade === undefined) return false;
  if (zoom >= 12) return true;
  if (zoom >= 10) return grade <= 3;
  if (zoom >= 9) return grade <= 2;
  return grade <= 1;
}

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function easeOutCubic(progress: number) {
  return 1 - (1 - progress) ** 3;
}
