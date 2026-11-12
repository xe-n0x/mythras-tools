import { TestBed } from '@angular/core/testing';

import { hydrateCharacter } from './character-format';
import { WeaponService } from './weapon.service';

describe('WeaponService', () => {
  let service: WeaponService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(WeaponService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('offers ranged weapons separately from melee weapons and shields', () => {
    const names = (ranged: boolean) => service.getWeaponsByMode(ranged).map(weapon => weapon.name);
    expect(names(false)).toContain('Club');
    expect(names(false)).toContain(service.getWeapons().find(weapon => weapon.shield)!.name);
    expect(names(false)).not.toContain('Composite Bow');
    expect(names(true)).toContain('Composite Bow');
    expect(names(true)).not.toContain('Club');
  });

  it('creates independent stowed copies that round-trip in the existing save format', () => {
    const dagger = service.createCharacterWeapon('Dagger')!;
    const bow = service.createCharacterWeapon('Composite Bow')!;
    const character = hydrateCharacter({ name: 'Legacy' });
    character.equipment.weapons.push(dagger, bow);
    expect(dagger.traits[0]).not.toBe(service.getWeaponByName('Dagger').traits[0]);
    expect(service.createCharacterWeapon('Unknown weapon')).toBeUndefined();

    const saved = hydrateCharacter(JSON.parse(JSON.stringify(character)));
    expect(saved.equipment.weapons).toEqual([
      jasmine.objectContaining({ name: 'Dagger', oneHanded: dagger.oneHanded, equipped: false, quantity: 1 }),
      jasmine.objectContaining({ name: 'Composite Bow', ranged: bow.ranged, range: bow.range, equipped: false, quantity: 1 }),
    ]);
  });
});
