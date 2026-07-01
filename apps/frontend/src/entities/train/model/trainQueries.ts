import { queryOptions } from "@tanstack/react-query";
import { getTrainSchedule } from "@/entities/train/api/trainApi";

export const trainQueries = {
  all: ["trains"] as const,
  schedule: (trainId: string, date: string) =>
    queryOptions({
      queryKey: [...trainQueries.all, "schedule", trainId, date] as const,
      queryFn: ({ signal }) => getTrainSchedule(trainId, date, signal),
    }),
};
