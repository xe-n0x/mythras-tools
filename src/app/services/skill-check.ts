export const difficultyGrades = [
  'Automatic', 'Very Easy', 'Easy', 'Standard', 'Hard', 'Formidable', 'Herculean', 'Hopeless',
] as const;

export type DifficultyGrade = typeof difficultyGrades[number];
export type DifficultySystem = 'standard' | 'simplified';

const grades = {
  'Very Easy': { multiplier: 2, points: 40 },
  Easy: { multiplier: 1.5, points: 20 },
  Standard: { multiplier: 1, points: 0 },
  Hard: { multiplier: 2 / 3, points: -20 },
  Formidable: { multiplier: 0.5, points: -40 },
  Herculean: { multiplier: 0.1, points: -80 },
};

/** Modifying Skills, Core Rules p. 38. A penalty already in effect sets a minimum difficulty. */
export function hardestGrade(chosen: DifficultyGrade, penalties: readonly DifficultyGrade[]): DifficultyGrade {
  return difficultyGrades[Math.max(...[chosen, ...penalties].map(grade => difficultyGrades.indexOf(grade)))];
}

export function skillCheckTarget(score: number, grade: DifficultyGrade, system: DifficultySystem): number | null {
  if (grade === 'Automatic' || grade === 'Hopeless') return null;
  const rule = grades[grade];
  if (system === 'simplified') return Math.floor(score + rule.points);
  return Math.floor(grade === 'Hard' ? score * 2 / 3 : score * rule.multiplier);
}
/** Tennla rounds the modified Critical Range down (Core Rules p. 37 rounds up). */
export function criticalRange(target: number): number {
  return Math.max(0, Math.floor(target / 10));
}

import type { CheckOutcome, RollCheckContext, RollRecord } from '../model/roll-record';
import { parseDiceExpression, RandomWord, rollDice } from './dice';


/** Simple skill checks, Core Rules pp. 37–38. Opposed checks have separate rules on p. 51. */
export function resolveCheckRoll(check: RollCheckContext, roll: number): CheckOutcome | undefined {
  const target = check.target;
  if (target === null || !Number.isFinite(target) || !Number.isInteger(roll) || roll < 1 || roll > 100) return undefined;
  if (roll === 100) return { degree: 'Fumble', explanation: '00 is always a fumble.' };
  if (roll === 99) {
    const over100 = target > 100;
    if ([check.original, check.effective].some(value => (value > 100) !== over100)) {
      return { degree: 'GM ruling required', explanation: '99 fails. Core Rules do not specify which skill value governs fumbles when modifiers cross 100%.' };
    }
    if (!over100) return { degree: 'Fumble', explanation: '99 fumbles at 100% skill or below.' };
  }
  if (roll >= 96) return { degree: 'Failure', explanation: '96–99 cannot succeed.' };
  const critical = criticalRange(target);
  if (roll <= critical) return { degree: 'Critical Success', explanation: 'Within one tenth of the modified target, rounded down (Tennla).' };
  if (roll <= 5) return { degree: 'Success', explanation: '01–05 always succeed on a rolled check.' };
  return roll <= target
    ? { degree: 'Success', explanation: 'Roll is at or below the target.' }
    : { degree: 'Failure', explanation: 'Roll exceeds the target.' };
}

const percentileExpression = parseDiceExpression('d100')!;

export function rollSkillCheck(check: RollCheckContext, manual?: string, nextWord?: RandomWord): RollRecord | undefined {
  if (check.target === null || !Number.isFinite(check.target)) return undefined;
  const dice = rollDice(percentileExpression, manual, nextWord);
  if (!dice) return undefined;
  const outcome = resolveCheckRoll(check, dice.total);
  return outcome ? { dice, outcome, check: { ...check, modifiers: check.modifiers.map(modifier => ({ ...modifier })) } } : undefined;
}
