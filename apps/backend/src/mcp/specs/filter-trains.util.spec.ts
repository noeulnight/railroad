import { Direction } from 'src/korail/interfaces/train.interface';
import { filterTrains } from '../utils/filter-trains.util';

const trains = [
  {
    trainNo: '001',
    type: 'KTX',
    direction: Direction.DOWN,
    position: { longitude: 127, latitude: 37, bearing: 180 },
    departure: { station: { name: '서울' }, scheduledAt: '' },
    arrival: { station: { name: '부산' }, scheduledAt: '' },
    currentStation: { name: '대전' },
    delayMinutes: 3,
    speedKmh: 250,
  },
];

describe('filterTrains', () => {
  it('filters trains by combined criteria', () => {
    expect(
      filterTrains(trains, { type: 'ktx', station: '대전', delayedOnly: true }),
    ).toHaveLength(1);
    expect(filterTrains(trains, { station: '광주' })).toHaveLength(0);
  });
});
