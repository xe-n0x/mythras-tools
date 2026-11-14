import { Character } from '../model/character';
import { CharacteristicKey } from '../model/character-effect';
import { Skill } from '../model/skill';
import { activeCharacteristicModifiers, activeModifiers, attributeEffectConflict, currentFatigue, effectImpact } from './character-effects';
import { armourPenalty, wornArmourEnc } from './character-loadout';
import { withEffectiveCharacteristics } from './characteristics';
import { getCurrentHp, getLocationInjury, getMaximumHp } from './hit-points';
import { initiativeWithArmour, magicPointMaximum, sessionValue, storedSkillValue } from './session-values';

export interface CalculationDetails {
  title: string;
  rule: string;
  page?: string;
  result: number | string;
  lines: { label: string; value: number | string }[];
}

const attributeRules = {
  ap: ['Look up INT + DEX in the Action Points table.', 'Action Points, p. 8'],
  luck: ['Look up POW in the Luck Points table.', 'Luck Points, p. 10'],
  damage: ['Look up STR + SIZ in the Damage Modifier table.', 'Damage Modifier, p. 9'],
  init: ['Average DEX and INT. Tennla rounds down, then applies Fatigue and armour where applicable.', 'Initiative Bonus, p. 10 · Armour Penalty to Initiative, p. 58'],
  healing: ['Look up CON in the Healing Rate table.', 'Healing Rate, p. 9'],
  expMod: ['Look up CHA in the Experience Modifier table.', 'Experience Modifier, p. 9'],
} as const;
export type CalculatedAttribute = keyof typeof attributeRules | 'magicPoints';

function statLines(character: Character, keys: readonly string[]): CalculationDetails['lines'] {
  const effective = withEffectiveCharacteristics(character);
  return [...new Set(keys)].flatMap(key => {
    const value = effective.skills[key as CharacteristicKey];
    const effects = activeCharacteristicModifiers(character, key as CharacteristicKey);
    return [
      { label: key.toUpperCase(), value: typeof value === 'number' ? value : '—' },
      ...effects.map(effect => ({ label: effect.name, value: effectImpact(effect) + ' · ' + effect.source +
        (effects.length > 1 ? ' · paused by conflict' : '') })),
    ];
  });
}

export function characteristicDetails(character: Character, key: CharacteristicKey, skills: Skill[]): CalculationDetails {
  const dependencies = Object.keys(attributeRules).filter(name =>
    character.skills[name as keyof typeof attributeRules].base.includes(key))
    .map(name => character.skills[name as keyof typeof attributeRules].name);
  const usesHp = Object.entries(character.hp).some(([location, value]) =>
    (value as Skill)?.base?.includes(key) && getLocationInjury(character, location)?.maximumHp == null);
  if (usesHp) dependencies.push('Maximum HP by location');
  if (key === 'pow' && character.currentValues?.['magicPoints'] != null && character.currentValues['magicPoints'] !== '') dependencies.push('Maximum Magic Points');
  dependencies.push(...skills.filter(skill => skill.base.includes(key)).map(skill => skill.name));
  const effects = activeCharacteristicModifiers(character, key);
  const stored = character.currentValues?.[key];
  return {
    title: key.toUpperCase(), rule: 'The sheet applies the active modifier to the stored characteristic.',
    result: stored == null || stored === '' ? (effects.length ? withEffectiveCharacteristics(character).skills[key] : character.skills[key] ?? '—')
      : withEffectiveCharacteristics(character).skills[key],
    lines: [
      { label: 'Original', value: character.skills[key] ?? '—' },
      ...(stored == null || stored === '' ? [] : [{ label: 'Stored override · origin unavailable', value: stored }]),
      ...effects.map(effect => ({ label: effect.name, value: effectImpact(effect) + ' · ' + effect.source +
        (effects.length > 1 ? ' · paused by conflict' : '') })),
      { label: 'Direct dependants', value: [...new Set(dependencies)].join(', ') || '—' },
    ],
  };
}

export function attributeDetails(character: Character, key: CalculatedAttribute): CalculationDetails {
  if (key === 'magicPoints') return {
    title: 'Magic Points', rule: 'For characters who use Magic Points, the maximum equals POW.', page: 'Magic Points, p. 10',
    result: magicPointMaximum(character), lines: [...statLines(character, ['pow']),
      { label: 'Current', value: character.currentValues?.['magicPoints'] ?? '—' }],
  };
  const skill = character.skills[key];
  const [rule, page] = attributeRules[key];
  const lines = statLines(character, skill.base);
  lines.push({ label: 'Stored result before temporary effects', value: storedSkillValue(character, skill) });
  if (skill.extraBonus && key !== 'damage') lines.push({ label: 'Saved adjustment · origin unavailable', value: skill.extraBonus });
  if (key === 'damage' && character.damageModifierOverride) lines.push({ label: 'Saved override · origin unavailable', value: character.damageModifierOverride });
  if (key === 'ap' || key === 'luck') lines.push({ label: 'Current', value: character.currentValues?.[key] ?? '—' });
  if (key === 'init') {
    lines.push({ label: 'Worn armour ENC', value: wornArmourEnc(character) });
    lines.push({ label: character.equipment.armorPenalty == null ? 'Armour penalty · p. 58' : 'Saved armour penalty override', value: -armourPenalty(character) });
  }
  if (key === 'ap' || key === 'init') {
    const target = key === 'ap' ? 'actionPoints' : 'initiative';
    const fatigue = currentFatigue(character);
    if (fatigue[target] || fatigue.unableToAct) lines.push({ label: 'Fatigue · p. 79', value: fatigue.unableToAct ? 'No activities possible' : fatigue[target]! });
    const modifiers = activeModifiers(character, { kind: 'attribute', key: target });
    for (const effect of modifiers) lines.push({ label: effect.name, value: effectImpact(effect) + ' · ' + effect.source +
      (modifiers.length > 1 || attributeEffectConflict(character, target) ? ' · paused by conflict' : '') });
  }
  return { title: skill.name, rule, page, result: key === 'init' ? initiativeWithArmour(character) : sessionValue(character, skill), lines };
}

export function hpDetails(character: Character, location: string, label: string, humanoid: boolean): CalculationDetails {
  const definition = (character.hp as unknown as Record<string, Skill | number>)[location];
  const injury = getLocationInjury(character, location);
  const calculated = withEffectiveCharacteristics(character);
  const base = typeof definition === 'object' && Array.isArray(definition?.base) ? definition.base : [];
  const standardBase = humanoid && base.length === 2 && base.includes('con') && base.includes('siz');
  const lines = statLines(character, injury?.maximumHp == null ? base : []);
  lines.push({ label: 'Current HP', value: getCurrentHp(character, location) });
  if (injury?.maximumHp != null) lines.push({ label: 'Recorded maximum after lasting injury', value: injury.maximumHp });
  return {
    title: label + ' · maximum HP',
    rule: injury?.maximumHp != null ? 'The recorded injury maximum takes precedence.'
      : standardBase ? 'Look up CON + SIZ in the Hit Points Per Location table.'
      : 'Uses the saved location definition. The origin of a custom value may be unavailable.',
    page: injury?.maximumHp != null ? 'Permanent Injuries, p. 80' : standardBase ? 'Hit Points, p. 10' : undefined,
    result: getMaximumHp(calculated, location), lines,
  };
}
