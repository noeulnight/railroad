import type { TrainGeometry } from '../interfaces/train.interface';
import {
  calculateTrainSpeedKmh,
  hasSameTrainPosition,
} from '../utils/calculate-train-speed.util';

describe('calculateTrainSpeedKmh', () => {
  const previous: TrainGeometry = {
    longitude: 127,
    latitude: 37.5,
    bearing: 0,
  };

  it('calculates distance over the full elapsed observation time', () => {
    const current = {
      ...previous,
      latitude: previous.latitude + 0.0089932,
    };

    expect(calculateTrainSpeedKmh(previous, current, 15_000)).toBeCloseTo(
      240,
      0,
    );
  });

  it('rejects physically implausible position jumps', () => {
    const current = {
      ...previous,
      latitude: previous.latitude + 0.0089932,
    };

    expect(calculateTrainSpeedKmh(previous, current, 5_000)).toBeNull();
  });

  it('uses the train-specific maximum speed when provided', () => {
    const current = {
      ...previous,
      latitude: previous.latitude + 0.0089932,
    };

    expect(calculateTrainSpeedKmh(previous, current, 10_000, 300)).toBeNull();
  });

  it('rejects samples without positive elapsed time', () => {
    expect(calculateTrainSpeedKmh(previous, previous, 0)).toBeNull();
  });

  it('compares coordinates without treating bearing changes as movement', () => {
    expect(hasSameTrainPosition(previous, { ...previous, bearing: 180 })).toBe(
      true,
    );
  });
});
