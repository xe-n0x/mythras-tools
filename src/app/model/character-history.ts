export type HistoryField = 'name' | 'currentValues' | 'currentHitPoints' | 'locationInjuries' | 'skills' |
  'damageModifierOverride' | 'activeEffects' | 'fatigueLevel' | 'equipment' | 'devotionPool' | 'devotionPoolCurrent';

export interface CharacterChange {
  path: (string | number)[];
  before?: unknown;
  after?: unknown;
}

export interface CharacterHistoryEvent {
  id: string;
  time: string;
  type: string;
  target: string;
  before?: unknown;
  after?: unknown;
  source?: string;
  description?: string;
  undone?: boolean;
  roll?: RollRecord;
  changes: CharacterChange[];
}
import type { RollRecord } from './roll-record';

