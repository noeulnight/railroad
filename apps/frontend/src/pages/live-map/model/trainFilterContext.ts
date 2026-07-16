import { createContext, useContext } from "react";
import type { TrainFilters } from "@/pages/live-map/model/trainVisualization";
import { DEFAULT_TRAIN_FILTERS } from "@/pages/live-map/model/trainVisualization";

export type TrainFilterContextValue = {
  filters: TrainFilters;
  setFilters: (filters: TrainFilters) => void;
};

export const TrainFilterContext = createContext<TrainFilterContextValue>({
  filters: DEFAULT_TRAIN_FILTERS,
  setFilters: () => {},
});

export function useTrainFilter() {
  return useContext(TrainFilterContext);
}
