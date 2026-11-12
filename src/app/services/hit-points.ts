import { Character, LocationInjury } from '../model/character';
import { Skill } from '../model/skill';
import { getSkillTotal } from './character-service.service';
import { withCurrentCharacteristics, withEffectiveCharacteristics } from './characteristics';

export const HIT_LOCATIONS = [
  {key:'head', label:'Head'}, {key:'chest', label:'Chest'}, {key:'abdoment', label:'Abdomen'},
  {key:'leftArm', label:'Left arm'}, {key:'rightArm', label:'Right arm'},
  {key:'leftLeg', label:'Left leg'}, {key:'rightLeg', label:'Right leg'},
] as const;
export type HitLocation = typeof HIT_LOCATIONS[number]['key'];

const standardKeys = new Set<string>(HIT_LOCATIONS.map(location => location.key));

function isSafeLocation(key: string): boolean {
  return !['__proto__', 'prototype', 'constructor'].includes(key);
}

function isLocationSkill(value: unknown): value is Skill {
  return typeof value === 'object' && value !== null && Array.isArray((value as Skill).base);
}

function fixedHp(value: unknown): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function hasCustomHitLocations(hp: object): boolean {
  return Object.entries(hp).some(([key, value]) =>
    isSafeLocation(key) && !standardKeys.has(key) && (isLocationSkill(value) || fixedHp(value) !== undefined)
  );
}

export function getHitLocations(character: Character): { key: string; label: string }[] {
  const locations = character.hp as unknown as Record<string, unknown>;
  if (usesHumanoidBodyMap(character)) return [...HIT_LOCATIONS];
  return Object.entries(locations)
    .filter(([key, value]) => isSafeLocation(key) && (isLocationSkill(value) || fixedHp(value) !== undefined))
    .map(([key, value]) => ({
      key,
      label: HIT_LOCATIONS.find(location => location.key === key)?.label ||
        (isLocationSkill(value) && typeof value.name === 'string' && value.name.trim()) ||
        key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/[_-]/g, ' ').replace(/^./, char => char.toUpperCase()),
    }));
}

export function usesHumanoidBodyMap(character: Character): boolean {
  return !hasNonHumanSpecies(character) && !hasCustomHitLocations(character.hp);
}

export function hasNonHumanSpecies(character: Character): boolean {
  const species = typeof character.species === 'string' ? character.species.trim().toLowerCase() : '';
  return !!species && species !== 'human';
}

export function getCurrentHp(character: Character, location: string): number | string {
  return Object.prototype.hasOwnProperty.call(character.currentHitPoints || {}, location)
    ? character.currentHitPoints?.[location] ?? '' : '';
}

export function setCurrentHp(character: Character, location: string, value: string | number | null | undefined): void {
  if (!isSafeLocation(location)) return;
  const parsed = value == null || value === '' ? '' : Number(value);
  (character.currentHitPoints ||= {})[location] = parsed === '' || Number.isFinite(parsed) ? parsed : '';
}

export function getMaximumHp(character: Character, location: string): number | '' {
  const adjusted = getLocationInjury(character, location)?.maximumHp;
  if (typeof adjusted === 'number' && Number.isSafeInteger(adjusted) && adjusted > 0) return adjusted;
  const definition = (character.hp as unknown as Record<string, unknown>)[location];
  if (!isLocationSkill(definition)) return fixedHp(definition) ?? '';
  // Earlier sheets stored manual current HP as extraBonus; it is not part of maximum HP.
  return getSkillTotal(character, {...definition, extraBonus:0} as Skill);
}

export function getLocationInjury(character: Character, location: string): LocationInjury | undefined {
  if (!Object.prototype.hasOwnProperty.call(character.locationInjuries || {}, location)) return undefined;
  const injury = character.locationInjuries?.[location];
  return injury && typeof injury === 'object' && !Array.isArray(injury) ? injury : undefined;
}

export function setLocationInjury(character: Character, location: string, injury: LocationInjury): void {
  if (!isSafeLocation(location)) return;
  if (!character.locationInjuries || typeof character.locationInjuries !== 'object' || Array.isArray(character.locationInjuries)) {
    character.locationInjuries = {};
  }
  const injuries = character.locationInjuries;
  if (!injury.note && injury.maximumHp === undefined) delete injuries[location];
  else injuries[location] = injury;
}

export function editCurrentHp(character: Character, location: string, value: number | string | null): void {
  const input = typeof value === 'string' ? value.trim() : value;
  if (input === '' || input == null) {
    setCurrentHp(character, location, '');
    return;
  }
  if (typeof input === 'string' && !/^[+-]?\d+$/.test(input)) return;
  const current = Number(input);
  if (!Number.isSafeInteger(current)) return;
  const maximum = getMaximumHp(withEffectiveCharacteristics(character), location);
  setCurrentHp(character, location, maximum === '' ? current : Math.min(current, maximum));
}

/** Record completed recovery. Core Rules, Healing from Injury and Permanent Injuries, p. 80. */
export function restoreLocationHp(character: Character, location: string, confirmed: boolean): boolean {
  if (!getHitLocations(character).some(entry => entry.key === location)) return false;
  const maximum = getMaximumHp(withEffectiveCharacteristics(character), location);
  if (maximum === '' || maximum <= 0) return false;
  if (!confirmed && (getLocationInjury(character, location) ||
    getWoundSeverity(getCurrentHp(character, location), maximum) === 'major')) return false;
  setCurrentHp(character, location, maximum);
  return true;
}

export function initializeCurrentHp(character: Character): void {
  const calculation = withCurrentCharacteristics(character);
  for (const { key } of getHitLocations(character)) {
    if (Object.prototype.hasOwnProperty.call(character.currentHitPoints || {}, key)) continue;
    if (getLocationInjury(character, key)) continue;
    const definition = (character.hp as unknown as Record<string, unknown>)[key];
    if (isLocationSkill(definition) && definition.base.some(stat => {
      const value = character.currentValues?.[stat];
      const base = character.skills[stat as keyof typeof character.skills];
      const effective = value === '' || value == null ? base : value;
      return (typeof effective !== 'number' && typeof effective !== 'string') || !String(effective).trim() || !Number.isFinite(Number(effective));
    })) continue;
    const maximum = getMaximumHp(calculation, key);
    if (maximum !== '' && maximum > 0) setCurrentHp(character, key, maximum);
  }
}

export type WoundSeverity = 'unknown' | 'healthy' | 'minor' | 'serious' | 'major';

/** Core Rules, Minor/Serious/Major Wound, p. 110. */
export function getWoundSeverity(current: number | string, maximum: number | ''): WoundSeverity {
  if (current === '' || (typeof current === 'string' && !current.trim()) || maximum === '' || maximum <= 0) return 'unknown';
  const remaining = Number(current);
  if (!Number.isFinite(remaining)) return 'unknown';
  if (remaining <= -maximum) return 'major';
  if (remaining <= 0) return 'serious';
  if (remaining < maximum) return 'minor';
  return 'healthy';
}

export function restoreLegacyCurrentHp(character: Character): void {
  const currentStats = (character as any).currentValues || {};
  const calculation = {...character, skills:{...character.skills}} as Character;
  for (const stat of ['con','siz'] as const) {
    const value = currentStats[stat];
    if (value !== '' && value != null && Number.isFinite(Number(value))) calculation.skills[stat] = Number(value);
  }
  for (const {key} of getHitLocations(character)) {
    if (Object.prototype.hasOwnProperty.call(character.currentHitPoints || {}, key)) continue;
    const definition = (character.hp as unknown as Record<string, unknown>)[key];
    if (!isLocationSkill(definition)) continue;
    const oldValue: unknown = definition.extraBonus;
    // Reading/calculating HP never wrote this field; its presence records an old manual edit.
    if (oldValue != null && oldValue !== '' && Number.isFinite(Number(oldValue))) {
      setCurrentHp(character, key, getSkillTotal(calculation, definition));
    }
  }
}
