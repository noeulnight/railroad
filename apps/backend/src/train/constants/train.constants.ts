export const TRAIN_POLL_INTERVAL_MS = 5_000;
export const TRAIN_EARTH_RADIUS_KM = 6_371.0088;
export const TRAIN_FALLBACK_MAX_SPEED_KMH = 350;
export const TRAIN_MAX_SPEED_KMH_BY_TYPE: Readonly<Record<string, number>> = {
  KTX: 305,
  'KTX-산천': 305,
  'KTX-이음': 260,
  'KTX-청룡': 320,
  SRT: 300,
  'ITX-청춘': 180,
  'ITX-새마을': 150,
  'ITX-마음': 150,
  새마을: 150,
  새마을호: 150,
  무궁화: 150,
  무궁화호: 150,
  누리로: 150,
};
export const TRAIN_SPEED_ROUNDING_FACTOR = 10;
