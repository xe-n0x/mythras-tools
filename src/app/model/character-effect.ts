export const characteristicKeys = ['str', 'con', 'siz', 'dex', 'int', 'pow', 'cha'] as const;
export type CharacteristicKey = typeof characteristicKeys[number];

export const fatigueLevels = [
  'Fresh', 'Winded', 'Tired', 'Wearied', 'Exhausted', 'Debilitated',
  'Incapacitated', 'Semi-Conscious', 'Comatose', 'Dead',
] as const;
export type FatigueLevel = typeof fatigueLevels[number];
export const effectAttributes = { initiative: 'Initiative before armour', actionPoints: 'Maximum Action Points', movement: 'Movement Rate' } as const;
export type EffectAttribute = keyof typeof effectAttributes;
export type StunArea = 'head' | 'torso' | 'other';

export type EffectTarget =
  | { kind: 'characteristic'; key: CharacteristicKey }
  | { kind: 'attribute'; key: EffectAttribute }
  | { kind: 'skill'; name: string; professional: boolean };

interface EffectRecord {
  id: string;
  name: string;
  description: string;
  source: string;
  ends: string;
  active: boolean;
  location?: string;
  consequences?: string;
}

export type CharacterEffect = EffectRecord & (
  | { kind: 'note' }
  | { kind: 'modifier'; target: EffectTarget; operation: 'add' | 'set'; value: number }
  | { kind: 'stun'; location: string; area: StunArea; damage: number }
  | { kind: 'fatigue'; level: FatigueLevel }
);
