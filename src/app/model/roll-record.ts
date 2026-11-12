import type { DiceResult } from '../services/dice';
import type { DifficultyGrade, DifficultySystem } from '../services/skill-check';

export interface RollCheckContext {
  skill: string;
  original: number;
  effective: number;
  selectedGrade: DifficultyGrade;
  grade: DifficultyGrade;
  system: DifficultySystem;
  target: number | null;
  modifiers: { name: string; source: string; impact: string }[];
}

export type CheckDegree = 'Critical Success' | 'Success' | 'Failure' | 'Fumble' | 'GM ruling required';

export interface CheckOutcome {
  degree: CheckDegree;
  explanation: string;
}

export interface RollRecord {
  dice: DiceResult;
  check?: RollCheckContext;
  outcome?: CheckOutcome;
}
