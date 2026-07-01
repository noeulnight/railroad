import { queryOptions } from "@tanstack/react-query";
import { getStations } from "@/entities/station/api/stationApi";

export const stationQueries = {
  all: ["stations"] as const,
  list: () =>
    queryOptions({
      queryKey: stationQueries.all,
      queryFn: ({ signal }) => getStations(signal),
    }),
};
