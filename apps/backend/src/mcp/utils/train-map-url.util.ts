import type { PublicTrain } from 'src/public-api/interfaces/public-api.interface';
import { TRAIN_MAP_URL } from '../constants/mcp.constants';

export function getTrainMapUrl(
  train: Pick<PublicTrain, 'trainNo' | 'type'>,
): string {
  const params = new URLSearchParams({
    type: train.type.trim().toLowerCase().replaceAll(/\s|-/g, ''),
    id: train.trainNo,
  });

  return `${TRAIN_MAP_URL}?${params}`;
}
