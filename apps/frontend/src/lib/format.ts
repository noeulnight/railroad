import { format } from "date-fns";
import type { Direction } from "../types/dashboard";

export function formatDateTime(value?: string) {
  if (!value) return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return format(date, "HH시 mm분");
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

export function getTrainColor(direction: Direction) {
  return direction === "UP" ? "#2563eb" : "#dc2626";
}

export function shouldShowStation(zoom: number, grade?: number) {
  if (grade === undefined) {
    return false;
  }

  if (zoom >= 12) {
    return true;
  }

  if (zoom >= 10) {
    return grade <= 3;
  }

  if (zoom >= 9) {
    return grade <= 2;
  }

  return grade <= 1;
}
