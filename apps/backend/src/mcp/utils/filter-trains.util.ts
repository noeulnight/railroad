import type { Direction } from 'src/korail/interfaces/train.interface';
import type { PublicTrain } from 'src/public-api/interfaces/public-api.interface';

export interface TrainFilters {
  trainNo?: string;
  type?: string;
  direction?: Direction;
  station?: string;
  delayedOnly?: boolean;
}

export function filterTrains(
  trains: PublicTrain[],
  filters: TrainFilters,
): PublicTrain[] {
  const includes = (value: string | undefined, query: string) =>
    value?.toLocaleLowerCase().includes(query.toLocaleLowerCase()) ?? false;

  return trains.filter(
    (train) =>
      (!filters.trainNo || includes(train.trainNo, filters.trainNo)) &&
      (!filters.type || includes(train.type, filters.type)) &&
      (!filters.direction || train.direction === filters.direction) &&
      (!filters.station ||
        [
          train.departure.station?.name,
          train.arrival.station?.name,
          train.currentStation?.name,
          train.nextStation?.name,
        ].some((name) => includes(name, filters.station!))) &&
      (!filters.delayedOnly || train.delayMinutes > 0),
  );
}
