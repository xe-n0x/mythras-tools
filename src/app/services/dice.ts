export const diceSides = [2, 3, 4, 6, 8, 10, 12, 20, 100] as const;
type DieSides = typeof diceSides[number];
export type RollOrigin = 'virtual' | 'manual';
export type RandomWord = () => number;

export interface DiceGroup { count: number; sides: DieSides; sign: 1 | -1; }
export interface DiceExpression { text: string; groups: DiceGroup[]; modifier: number; }
export interface DieResult { sides: DieSides; value: number; sign: 1 | -1; }
export interface DiceResult { expression: string; dice: DieResult[]; modifier: number; total: number; origin: RollOrigin; }

const wordRange = 0x1_0000_0000;
const webCryptoWord: RandomWord = () => globalThis.crypto.getRandomValues(new Uint32Array(1))[0];

/** Rejection sampling removes the modulo bias when a die size does not divide 2^32. */
export function randomDie(sides: number, nextWord: RandomWord = webCryptoWord): number {
  if (!Number.isInteger(sides) || sides < 1 || sides > wordRange) throw new RangeError('Invalid die size.');
  const limit = wordRange - (wordRange % sides);
  let word: number;
  do {
    word = nextWord();
    if (!Number.isInteger(word) || word < 0 || word >= wordRange) throw new RangeError('Invalid random word.');
  } while (word >= limit);
  return word % sides + 1;
}

/** Core Rules p. 5 describes XdY, d% and additive modifiers. Bounds are UI limits. */
export function parseDiceExpression(input: string): DiceExpression | undefined {
  if (input.length > 128) return undefined;
  const text = input.trim().toLowerCase().replace(/−/g, '-').replace(/\s*([+-])\s*/g, '$1').replace(/d%/g, 'd100');
  if (!/^[+-]?(?:\d*d\d+|\d+)(?:[+-](?:\d*d\d+|\d+))*$/.test(text)) return undefined;
  const terms = text.match(/[+-]?[^+-]+/g) ?? [];
  if (terms.length > 24) return undefined;
  const groups: DiceGroup[] = [];
  let count = 0;
  let modifier = 0;
  let magnitude = 0;
  for (const term of terms) {
    const sign = term.startsWith('-') ? -1 : 1;
    const parts = term.replace(/^[+-]/, '').split('d');
    if (parts.length === 1) {
      const value = Number(parts[0]);
      magnitude += value;
      if (magnitude > 10_000) return undefined;
      modifier += sign * value;
      continue;
    }
    const amount = Number(parts[0] || 1);
    const sides = Number(parts[1]) as DieSides;
    count += amount;
    if (!diceSides.includes(sides) || amount < 1 || count > 50) return undefined;
    groups.push({ count: amount, sides, sign });
  }
  return groups.length ? { text, groups, modifier } : undefined;
}

export function readDie(text: string, sides: number): number | undefined {
  if (!/^\d{1,3}$/.test(text)) return undefined;
  if (sides === 100 && text === '00') return 100;
  const value = Number(text);
  return value >= 1 && value <= sides ? value : undefined;
}

export function formatPercentile(value: number): string {
  return value === 100 ? '00' : String(value).padStart(2, '0');
}

export function rollDice(expression: DiceExpression, manual?: string, nextWord?: RandomWord): DiceResult | undefined {
  if (manual !== undefined && manual.length > 256) return undefined;
  const tokens = manual === undefined ? undefined : manual.trim().split(/(?:\s*,\s*|\s+)/);
  const dice: DieResult[] = [];
  for (const group of expression.groups) {
    for (let i = 0; i < group.count; i++) {
      const value = tokens ? readDie(tokens[dice.length] ?? '', group.sides) : randomDie(group.sides, nextWord);
      if (value === undefined) return undefined;
      dice.push({ sides: group.sides, sign: group.sign, value });
    }
  }
  if (tokens && tokens.length !== dice.length) return undefined;
  return {
    expression: expression.text, dice, modifier: expression.modifier,
    total: dice.reduce((total, die) => total + die.sign * die.value, expression.modifier),
    origin: tokens ? 'manual' : 'virtual',
  };
}
