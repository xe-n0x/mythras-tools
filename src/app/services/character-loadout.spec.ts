import { CharacterWeapon } from '../model/character-weapon';
import { Equipment } from '../model/equipment';
import { hydrateCharacter, parseCharacterFile } from './character-format';
import { addSpareArmour, armourPenalty, changeArmour, changeWeaponGrip, getArmourAt, spareArmour, weaponGrips, wornArmourEnc } from './character-loadout';
import { getTotalFromItems } from './character-service.service';

describe('Character loadout', () => {
  it('keeps old armour worn and moves the same piece to carried inventory when it is removed', () => {
    const hero = hydrateCharacter({
      name: 'Old save',
      hp: {},
      currentHitPoints: { chest: -2 },
      equipment: { chest: { name: 'Mail', ap: 6, enc: 5 }, head: { ap: 2, enc: 1 } },
    });
    expect(wornArmourEnc(hero)).toBe(6);
    expect(armourPenalty(hero)).toBe(1);
    expect(getTotalFromItems(hero, 'enc', true)).toBe(3);

    expect(changeArmour(hero, 'chest', null)).toBeTrue();
    expect(getArmourAt(hero.equipment, 'chest')?.ap).toBeUndefined();
    expect(getArmourAt(hero.equipment, 'head')?.ap).toBe(2);
    expect(getTotalFromItems(hero, 'enc', true)).toBe(5);
    expect(armourPenalty(hero)).toBe(0);
    expect(hero.currentHitPoints?.['chest']).toBe(-2);

    const restored = parseCharacterFile(JSON.stringify(hero))[0];
    expect(changeArmour(restored, 'head', 0)).toBeFalse();
    expect(changeArmour(restored, 'chest', 0)).toBeTrue();
    expect(getArmourAt(restored.equipment, 'chest')?.ap).toBe(6);
    expect(spareArmour(restored.equipment)).toEqual([]);
    expect(restored.currentHitPoints?.['chest']).toBe(-2);
  });

  it('swaps recorded alternatives without losing the previously worn piece or rewriting manual overrides', () => {
    const hero = hydrateCharacter({ equipment: { armorPenalty: '3', chest: { name: 'Mail', ap: 6, enc: 5 } } });
    expect(addSpareArmour(hero, 'chest', { name: 'Gambeson', ap: 2, enc: 1 } as Equipment)).toBeTrue();
    expect(changeArmour(hero, 'chest', 0)).toBeTrue();
    expect(getArmourAt(hero.equipment, 'chest')?.name).toBe('Gambeson');
    expect(spareArmour(hero.equipment)[0].piece.name).toBe('Mail');
    expect(armourPenalty(hero)).toBe(3);
    delete (hero.equipment as Partial<typeof hero.equipment>).armorPenalty;
    expect(armourPenalty(hero)).toBe(0);
  });

  it('validates offensive pairs, allows a shield, and frees both hands for a two-handed weapon', () => {
    const main = { name: 'Sword', oneHanded: '1d8', size: 'M' } as CharacterWeapon;
    const equal = { name: 'Other sword', oneHanded: '1d8', size: 'Medium' } as CharacterWeapon;
    const dagger = { name: 'Dagger', oneHanded: '1d4', size: 'S' } as CharacterWeapon;
    const shield = { name: 'Shield', shield: '1d3', size: 'L' } as CharacterWeapon;
    const great = { name: 'Great axe', twoHanded: '2d6', size: 'H' } as CharacterWeapon;
    const weapons = [main, equal, dagger, shield, great];
    expect(changeWeaponGrip(weapons, main, 'main')).toBe('');
    expect(changeWeaponGrip(weapons, equal, 'off')).toContain('smaller');
    expect(changeWeaponGrip(weapons, dagger, 'off')).toBe('');
    expect(changeWeaponGrip(weapons, shield, 'off')).toBe('');
    expect(dagger.equipped).toBeFalse();
    expect(weaponGrips(great)).toEqual(['both']);
    expect(changeWeaponGrip(weapons, great, 'both')).toBe('');
    expect(weapons.filter(item => item.equipped)).toEqual([great]);
    expect(changeWeaponGrip(weapons, great, null)).toBe('');
    expect(weapons.some(item => item.equipped)).toBeFalse();
  });

  it('preserves legacy equipment flags, serializes explicit grips and leaves combat skills intact', () => {
    const hero = hydrateCharacter({
      name: 'Old save',
      skills: { combatstyles: [{ name: 'Sword style', cultureBonus: 10 }] },
      equipment: { weapons: [{ name: 'Sword', equipped: true, oneHanded: '1d8' }] },
    });
    const sword = hero.equipment.weapons[0];
    const skills = JSON.stringify(hero.skills);
    expect(sword.equipped).toBeTrue();
    expect(sword.grip).toBeUndefined();
    expect(changeWeaponGrip(hero.equipment.weapons, sword, 'main')).toBe('');
    const restored = parseCharacterFile(JSON.stringify(hero))[0];
    expect(restored.equipment.weapons[0].grip).toBe('main');
    expect(JSON.stringify(restored.skills)).toBe(skills);
  });
});
