import { parseKorailDateTime } from './parse-korail-date-time.util';

describe('parseKorailDateTime', () => {
  it('parses a compact Korail date time string as KST', () => {
    expect(parseKorailDateTime('20260308213800').toISOString()).toBe(
      '2026-03-08T12:38:00.000Z',
    );
  });

  it('throws when the format is invalid', () => {
    expect(() => parseKorailDateTime('2026-03-08 21:38:00')).toThrow(
      'Invalid Korail date time format: 2026-03-08 21:38:00',
    );
  });

  it('throws when the calendar date is invalid', () => {
    expect(() => parseKorailDateTime('20260230010101')).toThrow(
      'Invalid Korail date time value: 20260230010101',
    );
  });

  it('throws when the time is invalid', () => {
    expect(() => parseKorailDateTime('20260308246000')).toThrow(
      'Invalid Korail date time value: 20260308246000',
    );
  });
});
