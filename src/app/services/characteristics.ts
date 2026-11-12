import { Character } from '../model/character';
import { characteristicKeys } from '../model/character-effect';
import { activeCharacteristicModifiers, applyModifier } from './character-effects';

export function withCurrentCharacteristics(character: Character): Character {
  const skills = { ...character.skills };
  for (const key of characteristicKeys) {
    const current = character.currentValues?.[key];
    const value = current === '' || current == null ? NaN : Number(current);
    skills[key] = Number.isFinite(value) ? value : Number(skills[key]) || 0;
  }
  return { ...character, skills };
}

export function withEffectiveCharacteristics(character: Character): Character {
  const calculated = withCurrentCharacteristics(character);
  for (const key of characteristicKeys) {
    const modifiers = activeCharacteristicModifiers(character, key);
    if (modifiers.length === 1) calculated.skills[key] = applyModifier(calculated.skills[key], modifiers[0]);
  }
  return calculated;
}
