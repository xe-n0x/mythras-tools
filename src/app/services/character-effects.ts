import type { Character } from '../model/character';
import { CharacterEffect, characteristicKeys, CharacteristicKey, effectAttributes, EffectAttribute, EffectTarget, fatigueLevels, FatigueLevel } from '../model/character-effect';
import type { Skill } from '../model/skill';
import type { DifficultyGrade } from './skill-check';

type Modifier = Extract<CharacterEffect, {kind: 'modifier'}>;
type Fatigue = Extract<CharacterEffect, {kind: 'fatigue'}>;

interface FatigueRule {
  grade?: DifficultyGrade;
  movement?: number | 'half' | 'immobile';
  initiative?: number;
  actionPoints?: number;
  restricted?: string;
  unableToAct?: boolean;
  recovery?: string;
}

/** Core Rules, Fatigue Levels and Recovering from Fatigue, pp. 78–79. */
export const fatigueRules: Record<FatigueLevel, FatigueRule> = {
  Fresh: {},
  Winded: { grade: 'Hard', recovery: '15 minutes' },
  Tired: { grade: 'Hard', movement: -1, recovery: '3 hours' },
  Wearied: { grade: 'Formidable', movement: -2, initiative: -2, recovery: '6 hours' },
  Exhausted: { grade: 'Formidable', movement: 'half', initiative: -4, actionPoints: -1, recovery: '12 hours' },
  Debilitated: { grade: 'Herculean', movement: 'half', initiative: -6, actionPoints: -2, recovery: '18 hours' },
  Incapacitated: { grade: 'Herculean', movement: 'immobile', initiative: -8, actionPoints: -3, restricted: 'Only desperate activity. The GM determines what is possible.', recovery: '24 hours' },
  'Semi-Conscious': { grade: 'Hopeless', unableToAct: true, recovery: '36 hours' },
  Comatose: { grade: 'Hopeless', unableToAct: true, recovery: '48 hours' },
  Dead: { grade: 'Hopeless', unableToAct: true },
};

export function createFatigue(level: FatigueLevel, id: string, active = true): Fatigue {
  return {
    kind: 'fatigue', level, id, active, name: 'Fatigue', source: 'Core Rules, Fatigue, pp. 78–79',
    description: 'Current accumulated Fatigue level.', ends: 'Update when the GM confirms recovery or a change in level.',
  };
}

export function characterEffects(character: Character): CharacterEffect[] {
  const records = Array.isArray(character.activeEffects) ? character.activeEffects.filter(effect =>
    effect && typeof effect.id === 'string' && typeof effect.name === 'string' &&
    (effect.kind === 'note' || (effect.kind === 'modifier' && validTarget(effect.target) &&
      (effect.operation === 'add' || effect.operation === 'set') && Number.isSafeInteger(effect.value)) ||
      (effect.kind === 'fatigue' && fatigueLevels.includes(effect.level)) ||
      (effect.kind === 'stun' && !!effect.location && ['head', 'torso', 'other'].includes(effect.area) &&
        Number.isSafeInteger(effect.damage) && effect.damage > 0))) : [];
  const legacy = fatigueLevels.find(level => level === character.fatigueLevel);
  return legacy && !records.some(effect => effect.kind === 'fatigue')
    ? [...records, createFatigue(legacy, 'legacy-fatigue')] : records;
}

function validTarget(target: EffectTarget): boolean {
  return !!target && (target.kind === 'characteristic' ? characteristicKeys.includes(target.key)
    : target.kind === 'attribute' ? Object.prototype.hasOwnProperty.call(effectAttributes, target.key)
    : target.kind === 'skill' && typeof target.name === 'string' && typeof target.professional === 'boolean');
}

export function currentFatigue(character: Character): FatigueRule {
  const active = characterEffects(character).filter((effect): effect is Fatigue =>
    effect.kind === 'fatigue' && effect.active === true);
  return active.length === 1 ? fatigueRules[active[0].level] : {};
}

export function sameTarget(a: EffectTarget, b: EffectTarget): boolean {
  if (a.kind === 'characteristic' && b.kind === 'characteristic') return a.key === b.key;
  if (a.kind === 'attribute' && b.kind === 'attribute') return a.key === b.key;
  return a.kind === 'skill' && b.kind === 'skill' && a.name === b.name && a.professional === b.professional;
}

export function skillTarget(skill: Skill): EffectTarget {
  return { kind: 'skill', name: skill.name, professional: !!skill.professional };
}

export function activeModifiers(character: Character, target: EffectTarget): Modifier[] {
  return characterEffects(character).filter((effect): effect is Modifier =>
    effect.kind === 'modifier' && effect.active === true && sameTarget(effect.target, target));
}

export function activeCharacteristicModifiers(character: Character, key: CharacteristicKey): Modifier[] {
  return activeModifiers(character, { kind: 'characteristic', key });
}

export function applyModifier(value: number, modifier: Modifier): number {
  return modifier.operation === 'set' ? modifier.value : Math.floor(value + modifier.value);
}

export function effectiveMovement(base: number, fatigue: FatigueRule): number {
  if (fatigue.unableToAct || fatigue.movement === 'immobile') return 0;
  if (fatigue.movement === 'half') return Math.floor(base / 2);
  return fatigue.movement === undefined ? Math.max(0, base) : Math.max(0, Math.floor(base + fatigue.movement));
}

export function fatigueAffectsAttribute(fatigue: FatigueRule, key: EffectAttribute): boolean {
  return !!(fatigue.unableToAct || fatigue[key] !== undefined);
}

export function attributeEffectConflict(character: Character, key: EffectAttribute): boolean {
  const skill = key === 'actionPoints' ? character.skills.ap : key === 'initiative' ? character.skills.init : undefined;
  return fatigueAffectsAttribute(currentFatigue(character), key) ||
    characteristicKeys.some(stat => skill?.base.includes(stat) && activeCharacteristicModifiers(character, stat).length > 0);
}

export function applyAttributeEffect(character: Character, key: EffectAttribute, value: number): number {
  const modifiers = activeModifiers(character, { kind: 'attribute', key });
  return modifiers.length === 1 && !attributeEffectConflict(character, key)
    ? applyModifier(value, modifiers[0]) : value;
}

export function effectImpact(effect: CharacterEffect): string {
  if (effect.kind === 'note') return 'Tracked for GM adjudication';
  // Core Rules, Stun Location, p. 99. The GM confirms the opposed test and the anatomy.
  if (effect.kind === 'stun') {
    const restriction = effect.area === 'head' ? 'Insensible' : effect.area === 'torso' ? 'Can only defend' : 'Location incapacitated';
    return restriction + ' · ' + effect.damage + (effect.damage === 1 ? ' turn' : ' turns');
  }
  if (effect.kind === 'modifier') {
    const target = effect.target.kind === 'characteristic' ? effect.target.key.toUpperCase()
      : effect.target.kind === 'attribute' ? effectAttributes[effect.target.key] : effect.target.name;
    const change = effect.operation === 'set' ? '= ' + effect.value : (effect.value > 0 ? '+' : '') + effect.value;
    return target + ' ' + change + (effect.target.kind === 'skill' ? ' percentage points' : '');
  }
  const rule = fatigueRules[effect.level];
  if (rule.unableToAct) return 'No activities possible';
  return [
    rule.grade && 'Checks: ' + rule.grade,
    rule.movement === 'half' ? 'Movement halved' : rule.movement === 'immobile' ? 'Immobile'
      : rule.movement && 'Movement ' + rule.movement + ' m',
    rule.initiative && 'Initiative ' + rule.initiative,
    rule.actionPoints && 'Action Points ' + rule.actionPoints,
    rule.restricted,
  ].filter(Boolean).join(' · ') || 'No penalties';
}
