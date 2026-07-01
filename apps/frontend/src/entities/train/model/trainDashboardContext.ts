import { createContext, useContext } from "react";
import type { DashboardData } from "@/entities/train/model/types";

export const TrainDashboardContext = createContext<DashboardData | undefined>(
  undefined,
);

export function useTrainDashboard() {
  return useContext(TrainDashboardContext) as DashboardData;
}
