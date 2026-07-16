import { useMemo, useState, type PropsWithChildren } from "react";
import { TrainFilterContext } from "@/pages/live-map/model/trainFilterContext";
import {
  DEFAULT_TRAIN_FILTERS,
  type TrainFilters,
} from "@/pages/live-map/model/trainVisualization";

export function TrainFilterProvider(props: PropsWithChildren) {
  const [filters, setFilters] = useState<TrainFilters>(DEFAULT_TRAIN_FILTERS);
  const value = useMemo(() => ({ filters, setFilters }), [filters]);

  return (
    <TrainFilterContext.Provider value={value}>
      {props.children}
    </TrainFilterContext.Provider>
  );
}
