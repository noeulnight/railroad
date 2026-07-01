import { apiClient, buildExternalUrl } from "@/shared/api/railroadApi";
import type { TrainScheduleItem } from "@/entities/train/model/types";

export function getTrainEventsUrl() {
  return buildExternalUrl("/api/train/events");
}

export async function getTrainSchedule(
  trainId: string,
  date: string,
  signal?: AbortSignal,
) {
  const response = await apiClient.get<TrainScheduleItem[]>(
    `/api/train/${encodeURIComponent(trainId)}/schedule`,
    {
      signal,
      params: { date },
    },
  );
  return response.data;
}
