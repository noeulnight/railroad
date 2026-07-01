import type { PropsWithChildren } from "react";
import { useDashboardData } from "@/entities/train/model/useDashboardData";
import { TrainDashboardContext } from "@/entities/train/model/trainDashboardContext";

export function TrainDashboardProvider(props: PropsWithChildren) {
  const data = useDashboardData();

  return (
    <TrainDashboardContext.Provider value={data}>
      {props.children}
    </TrainDashboardContext.Provider>
  );
}
