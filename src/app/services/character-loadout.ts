import { Character } from '../model/character';
import { CharacterEquipment, SpareArmour } from '../model/character-equipment';
import { CharacterWeapon, WeaponGrip } from '../model/character-weapon';
import { Equipment } from '../model/equipment';
import { getTotalFromItems } from './character-service.service';
import { getHitLocations } from './hit-points';
import WeaponCategories from '../jsons/weapon-categories.json';

const equipmentFields = new Set([
  'weapons', 'items', 'spareArmour', 'equipmentEnc', 'armourEnc', 'totalEnc', 'armorPenalty', 'equipmentAndArmor',
]);

export function getArmourAt(equipment: CharacterEquipment, location: string): Equipment | undefined {
  return !equipmentFields.has(location) && Object.prototype.hasOwnProperty.call(equipment, location)
    ? (equipment as unknown as Record<string, Equipment>)[location] : undefined;
}

export function hasArmour(piece: Equipment | undefined): piece is Equipment {
  return !!piece && !!(piece.name || piece.type || piece.construction || Number(piece.ap) || Number(piece.enc));
}

export function armourLabel(piece: Equipment): string {
  return piece.name || [piece.material, piece.type || piece.construction].filter(Boolean).join(' ') || 'Custom armour';
}

export function spareArmour(equipment: CharacterEquipment): SpareArmour[] {
  return Array.isArray(equipment.spareArmour) ? equipment.spareArmour : [];
}

export function changeArmour(character: Character, location: string, selection: number | null): boolean {
  if (!canStoreArmourAt(character, location)) return false;
  const equipment = character.equipment;
  const carried = spareArmour(equipment);
  const chosen = selection === null ? undefined : carried[selection];
  if (selection !== null && (chosen?.location !== location || !hasArmour(chosen.piece))) return false;
  const worn = getArmourAt(equipment, location);
  if (selection === null && !hasArmour(worn)) return false;
  const next = carried.filter((_, index) => index !== selection);
  if (hasArmour(worn)) next.push({ location, piece: worn });
  equipment.spareArmour = next;
  (equipment as unknown as Record<string, Equipment>)[location] = chosen?.piece ?? new Equipment();
  return true;
}

function canStoreArmourAt(character: Character, location: string): boolean {
  return !equipmentFields.has(location) && getHitLocations(character).some(entry => entry.key === location);
}

export function addSpareArmour(character: Character, location: string, piece: Equipment): boolean {
  if (!canStoreArmourAt(character, location) || !hasArmour(piece)) return false;
  character.equipment.spareArmour = [...spareArmour(character.equipment), { location, piece: { ...piece } }];
  return true;
}

/** Armour Penalty to Initiative, Core Rules p. 58. Use full worn ENC. */
export function wornArmourEnc(character: Character): number {
  return character.equipment.armourEnc == null
    ? getTotalFromItems(character, 'enc', false, true) : Number(character.equipment.armourEnc);
}

export function armourPenalty(character: Character): number {
  return character.equipment.armorPenalty == null
    ? Math.ceil(wornArmourEnc(character) / 5) : Number(character.equipment.armorPenalty);
}

const grips: readonly WeaponGrip[] = ['main', 'off', 'both'];
const singleHand: readonly WeaponGrip[] = ['main', 'off'];
const sizes = ['small', 'medium', 'large', 'huge', 'enormous'];
const shieldNames = new Set(WeaponCategories.Shield);
const oneHandedNames = new Set(WeaponCategories['1h weapon']);
const twoHandedNames = new Set(WeaponCategories['2h weapon']);

function isShield(weapon: CharacterWeapon): boolean {
  return !!weapon.shield || shieldNames.has(weapon.name);
}

export function weaponGrips(weapon: CharacterWeapon): readonly WeaponGrip[] {
  if (weapon.unarmed && !weapon.oneHanded && !weapon.twoHanded && !weapon.shield && !weapon.ranged) return [];
  if (isShield(weapon)) return singleHand;
  const hasModes = !!(weapon.oneHanded || weapon.twoHanded);
  const one = hasModes ? !!weapon.oneHanded : oneHandedNames.has(weapon.name);
  const two = hasModes ? !!weapon.twoHanded : twoHandedNames.has(weapon.name);
  if (one && !two) return singleHand;
  if (two && !one) return ['both'];
  return grips;
}

function sizeRank(weapon: CharacterWeapon): number {
  const size = typeof weapon.size === 'string' ? weapon.size.trim().toLowerCase() : '';
  return sizes.findIndex(category => category === size || category[0] === size);
}

/** Weapon Choices, Core Rules p. 88. Shields are outside the offensive pair rule. */
export function changeWeaponGrip(weapons: CharacterWeapon[], weapon: CharacterWeapon, grip: WeaponGrip | null): string {
  if (!weapons.includes(weapon)) return 'Choose a weapon from your equipment.';
  if (grip && !weaponGrips(weapon).includes(grip)) return 'This grip is unavailable for the weapon.';
  if (grip && grip !== 'both' && weapons.some(item => item !== weapon && item?.equipped && !item.grip)) {
    return 'Stow weapons with an unrecorded grip before selecting a hand.';
  }
  const other = grip && grip !== 'both'
    ? weapons.find(item => item !== weapon && item?.equipped && item.grip === (grip === 'main' ? 'off' : 'main'))
    : undefined;
  if (other && !isShield(other) && !isShield(weapon)) {
    const main = sizeRank(grip === 'main' ? weapon : other);
    const off = sizeRank(grip === 'off' ? weapon : other);
    if (main < 0 || off < 0) return 'Set both weapon sizes to check whether they can be wielded together.';
    if (off >= main && !(main === 0 && off === 0)) return 'The off-hand weapon must be smaller, unless both are Small.';
  }
  for (const item of weapons) {
    if (item && item !== weapon && grip && (grip === 'both' || item.grip === 'both' || item.grip === grip)) {
      item.equipped = false;
      delete item.grip;
    }
  }
  weapon.equipped = grip !== null;
  if (grip) weapon.grip = grip;
  else delete weapon.grip;
  return '';
}
