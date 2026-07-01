import { apiClient } from "@/shared/api/railroadApi";
import type { Station } from "@/entities/station/model/types";

export async function getStations(signal?: AbortSignal) {
  const response = await apiClient.get<Station[]>("/api/station", { signal });
  return response.data;
}
