export interface KorailBaseInterface<T> {
  type: string;
  features: T[];
  totalFeatures: number;
  numberMatched: number;
  numberReturned: number;
  timeStamp: string;
}
