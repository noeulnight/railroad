import { getTrainMapUrl } from '../utils/train-map-url.util';

describe('getTrainMapUrl', () => {
  it('creates a selectable map link', () => {
    expect(getTrainMapUrl({ type: 'ITX-마음', trainNo: '1020' })).toBe(
      'https://train.lth.so/map?type=itx%EB%A7%88%EC%9D%8C&id=1020',
    );
  });
});
