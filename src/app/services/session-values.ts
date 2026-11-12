import type { Character } from '../model/character';
import { CharacterEffect, characteristicKeys } from '../model/character-effect';
import type { Skill } from '../model/skill';
import { activeCharacteristicModifiers, activeModifiers, applyAttributeEffect, applyModifier, currentFatigue, skillTarget } from './character-effects';
import { getDamageModifier, getSkillBase, getSkillTotal } from './character-service.service';
import { withCurrentCharacteristics, withEffectiveCharacteristics } from './characteristics';
import { armourPenalty } from './character-loadout';

export function storedSkillValue(character: Character, skill: Skill): number | string {
  const stored = withCurrentCharacteristics(character);
  return skill === character.skills.damage ? getDamageModifier(stored) : getSkillTotal(stored, skill);
}

export function resolveSessionSkill(character: Character, skill: Skill, calculated = withEffectiveCharacteristics(character)) {
  const stored = withCurrentCharacteristics(character);
  const original = getSkillTotal(stored, skill);
  const characteristicEffects = characteristicKeys.filter(key => skill.base.includes(key))
    .flatMap(key => {
      const entries = activeCharacteristicModifiers(character, key);
      return entries.map(effect => ({ effect, blocked: entries.length > 1 }));
    });
  const derived = getSkillTotal(calculated, skill);
  const direct = activeModifiers(character, skillTarget(skill));
  const directConflict = direct.length > 1 || (direct.length === 1 && characteristicEffects.length > 0);
  const effects: { effect: CharacterEffect; blocked: boolean }[] = [
    ...characteristicEffects, ...direct.map(effect => ({ effect, blocked: directConflict })),
  ];
  return {
    original, effects,
    base: getSkillBase(stored, skill),
    effectiveBase: getSkillBase(calculated, skill),
    inputs: skill.base.filter(Boolean).map(key => ({ key: key.toUpperCase(), value: calculated.skills[key as keyof typeof calculated.skills] })),
    effective: direct.length === 1 && !directConflict ? applyModifier(derived, direct[0]) : derived,
  };
}

export function initiativeWithArmour(character: Character): number | string {
  const value = sessionValue(character, character.skills.init);
  return typeof value === 'number' ? value - armourPenalty(character) : value;
}

export function magicPointMaximum(character: Character): number | '' {
  const known = [character.currentValues?.['pow'], character.skills.pow].some(value =>
    value != null && value !== '' && Number.isFinite(Number(value))) || activeCharacteristicModifiers(character, 'pow').length;
  return known ? withEffectiveCharacteristics(character).skills.pow : '';
}

export function sessionValue(character: Character, skill: Skill): number | string {
  const calculated = withEffectiveCharacteristics(character);
  if (skill === character.skills.damage) return getDamageModifier(calculated);
  if (skill === character.skills.ap || skill === character.skills.init) {
    const fatigue = currentFatigue(character);
    if (fatigue.unableToAct) return '—';
    const key = skill === character.skills.ap ? 'actionPoints' : 'initiative';
    return applyAttributeEffect(character, key, getSkillTotal(calculated, skill)) + (fatigue[key] ?? 0);
  }
  return resolveSessionSkill(character, skill, calculated).effective;
}
