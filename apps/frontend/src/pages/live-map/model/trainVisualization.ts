import type { Train } from "@/entities/train/model/types";
import { getTrainPrimaryColor } from "@/shared/lib/utils";

export type TrainVisualizationMode = "type" | "delay" | "speed";

export type TrainFilters = {
  types: string[];
  direction: "all" | Train["direction"];
  delayedOnly: boolean;
};

export const DEFAULT_TRAIN_FILTERS: TrainFilters = {
  types: [],
  direction: "all",
  delayedOnly: false,
};

export function matchesTrainFilters(train: Train, filters: TrainFilters) {
  return (
    (filters.types.length === 0 || filters.types.includes(train.type)) &&
    (filters.direction === "all" || train.direction === filters.direction) &&
    (!filters.delayedOnly || train.delay > 0)
  );
}

export function getTrainVisualizationColor(
  train: Train,
  mode: TrainVisualizationMode,
) {
  if (mode === "delay") {
    if (train.delay <= 0) return "#16a34a";
    if (train.delay < 5) return "#eab308";
    if (train.delay < 10) return "#f97316";
    return "#dc2626";
  }

  if (mode === "speed") {
    if (train.speedKmh === null) return "#64748b";
    if (train.speedKmh < 5) return "#64748b";
    if (train.speedKmh < 80) return "#0ea5e9";
    if (train.speedKmh < 180) return "#2563eb";
    return "#7c3aed";
  }

  return getTrainPrimaryColor(train.type);
}
