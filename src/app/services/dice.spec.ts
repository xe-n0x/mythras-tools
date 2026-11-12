import { diceSides, formatPercentile, parseDiceExpression, randomDie, readDie, rollDice } from './dice';

describe('Dice engine', () => {
  for (const side of diceSides) {
    it('returns every supported face for d' + side, () => {
      const expression = parseDiceExpression('d' + side)!;
      const faces = Array.from({ length: side }, (_, word) => rollDice(expression, undefined, () => word)?.total);
      expect(faces).toEqual(Array.from({ length: side }, (_, word) => word + 1));
    });
  }

  it('rejects out-of-range words at the end of the range to avoid modulo bias', () => {
    const words = [0xffff_ffff, 5];
    expect(randomDie(6, () => words.shift()!)).toBe(6);
    expect(words).toEqual([]);
  });

  it('treats 00 as 100 only on percentile dice and uses a single uniform d100 result', () => {
    expect(readDie('00', 100)).toBe(100);
    expect(readDie('0', 100)).toBeUndefined();
    expect(readDie('00', 10)).toBeUndefined();
    expect(formatPercentile(100)).toBe('00');
    expect(formatPercentile(1)).toBe('01');
    expect(rollDice(parseDiceExpression('d%')!, '00')?.total).toBe(100);
    expect(rollDice(parseDiceExpression('2d10')!, '10,10')?.total).toBe(20);
  });

  it('evaluates signed groups and modifiers without using user text as code', () => {
    const parsed = parseDiceExpression('1d8 + d6 − d2 + 3')!;
    const result = rollDice(parsed, '8, 6, 2')!;
    expect(result.total).toBe(15);
    expect(result.dice.map(die => die.value)).toEqual([8, 6, 2]);
    expect(result.origin).toBe('manual');
    for (const bad of ['eval(1)', '2d6**2', 'd7', '0d20', '51d6', '50d6+d3', '2d6+10001', '2d6+6000-6000', '5', '2d6;alert(1)']) {
      expect(parseDiceExpression(bad)).withContext(bad).toBeUndefined();
    }
    expect(rollDice(parsed, '8,6')).toBeUndefined();
    expect(rollDice(parsed, '8,7,2')).toBeUndefined();
    expect(rollDice(parsed, '8,6,2,1')).toBeUndefined();
  });
});
