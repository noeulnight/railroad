import { createContext, useContext } from "react";
import type { Train } from "@/entities/train/model/types";

export type TrainSelectionContextValue = {
  selectedTrainId?: string;
  isFollowingTrain: boolean;
  selectTrain: (train: Pick<Train, "id" | "type">, follow?: boolean) => void;
  clearSelectedTrain: () => void;
};

export const TrainSelectionContext = createContext<TrainSelectionContextValue>({
  isFollowingTrain: false,
  selectTrain: () => {},
  clearSelectedTrain: () => {},
});

export function useTrainSelection() {
  return useContext(TrainSelectionContext);
}
