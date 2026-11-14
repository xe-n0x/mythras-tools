import { shapingLimit } from './sorcery';

describe('Sorcery Shaping, Core Rules pp. 161–162', () => {
  it('rounds the tenth down (Tennla) and handles exact multiples', () => {
    expect([0, 10, 11, 47, 50, 101].map(shapingLimit)).toEqual([0, 1, 1, 4, 5, 10]);
  });
});
