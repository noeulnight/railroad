import { createContext, useContext } from "react";
import type { Train } from "@/entities/train/model/types";

export type TrainSelectionContextValue = {
  selectedTrainId?: string;
  selectedStationName?: string;
  isFollowingTrain: boolean;
  selectTrain: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
  selectStation: (stationName: string) => void;
  clearSelectedTrain: () => void;
  clearSelectedStation: () => void;
};

export const TrainSelectionContext = createContext<TrainSelectionContextValue>({
  isFollowingTrain: false,
  selectTrain: () => {},
  selectStation: () => {},
  clearSelectedTrain: () => {},
  clearSelectedStation: () => {},
});

export function useTrainSelection() {
  return useContext(TrainSelectionContext);
}
