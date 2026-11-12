import { CharacterEffect } from '../model/character-effect';
import { applyAttributeEffect, characterEffects, createFatigue, currentFatigue, effectiveMovement, effectImpact } from './character-effects';
import { hydrateCharacter, parseCharacterFile } from './character-format';
import { withEffectiveCharacteristics } from './characteristics';
import { getMaximumHp, restoreLocationHp } from './hit-points';
import { resolveSessionSkill, sessionValue, storedSkillValue } from './session-values';
import { hardestGrade, skillCheckTarget } from './skill-check';

describe('Character session effects', () => {
  const strength: CharacterEffect = {
    id: 'strength', name: 'Might', source: 'GM ruling', description: '', ends: 'End of scene',
    active: true, kind: 'modifier', target: { kind: 'characteristic', key: 'str' }, operation: 'add', value: 3,
  };
  const athleticsEffect: CharacterEffect = {
    ...strength, id: 'skill', name: 'Practice', target: { kind: 'skill', name: 'Athletics', professional: false },
    operation: 'set', value: 80,
  };

  it('recalculates STR 15 → 12, Athletics and Damage Modifier and restores the original on removal', () => {
    const character = hydrateCharacter({ skills: { str: 15, dex: 12, siz: 11, pow: 12 } });
    const athletics = character.skills.skills.find(skill => skill.name === 'Athletics')!;
    const damage = sessionValue(character, character.skills.damage);
    character.activeEffects = [{ ...strength, value: -3 }];
    expect(withEffectiveCharacteristics(character).skills.str).toBe(12);
    expect(resolveSessionSkill(character, athletics).effective).toBe(24);
    expect(sessionValue(character, character.skills.damage)).not.toBe(damage);
    expect(character.skills.str).toBe(15);
    character.activeEffects = [];
    expect(resolveSessionSkill(character, athletics).effective).toBe(27);
    expect(sessionValue(character, character.skills.damage)).toBe(damage);
  });

  it('round-trips a local state on a non-humanoid key without changing HP or characteristics', () => {
    const stun: CharacterEffect = {
      id: 'stun', name: 'Stun Location', active: true, location: 'leftWing',
      kind: 'stun', area: 'other', damage: 3, description: '', source: 'Core Rules p. 99', ends: '',
    };
    const character = parseCharacterFile(JSON.stringify({
      name: 'Winged', species: 'Griffin', skills: { str: 15 }, hp: { leftWing: 5 },
      currentHitPoints: { leftWing: -5 }, activeEffects: [stun],
    }))[0];
    expect(characterEffects(character)).toEqual([stun]);
    expect(effectImpact(stun)).toBe('Location incapacitated · 3 turns');
    expect(effectImpact({ ...stun, area: 'head', damage: 1 })).toBe('Insensible · 1 turn');
    expect(effectImpact({ ...stun, area: 'torso' })).toBe('Can only defend · 3 turns');
    expect(withEffectiveCharacteristics(character).skills.str).toBe(15);
    expect(character.currentHitPoints?.['leftWing']).toBe(-5);
    expect(character.locationInjuries?.['leftWing']).toBeUndefined();
  });

  it('applies explicit local numerical effects once and pauses a Movement conflict with Fatigue', () => {
    const movement: CharacterEffect = {
      ...strength, id: 'movement', location: 'leftLeg', target: { kind: 'attribute', key: 'movement' }, value: -1,
    };
    const ap: CharacterEffect = { ...strength, id: 'ap', target: { kind: 'attribute', key: 'actionPoints' }, value: 1 };
    const character = hydrateCharacter({ skills: { str: 15, int: 12, dex: 12 }, movementRate: 6, currentValues: { ap: 2 } });
    character.activeEffects = [movement, ap];
    expect(applyAttributeEffect(character, 'movement', character.movementRate)).toBe(5);
    expect(applyAttributeEffect(character, 'movement', character.movementRate)).toBe(5);
    expect(sessionValue(character, character.skills.ap)).toBe(3);
    expect(character.currentValues?.['ap']).toBe(2);
    character.activeEffects.push(createFatigue('Tired', 'fatigue'));
    expect(applyAttributeEffect(character, 'movement', character.movementRate)).toBe(6);
    expect(effectiveMovement(character.movementRate, currentFatigue(character))).toBe(5);
  });

  it('applies a characteristic modifier to a projection and derives skills from the existing formula', () => {
    const character = hydrateCharacter({ skills: { str: 12, dex: 13 }, currentValues: { str: 14, ap: 2 } });
    const athletics = character.skills.skills.find(skill => skill.name === 'Athletics')!;
    expect(storedSkillValue(character, athletics)).toBe(27);
    character.activeEffects = [strength];
    expect(resolveSessionSkill(character, athletics).effective).toBe(30);
    expect(resolveSessionSkill(character, athletics).effective).toBe(30);
    expect(character.skills.str).toBe(12);
    expect(character.currentValues).toEqual({ str: 14, ap: 2 });

    character.activeEffects = [{ ...strength, active: false }];
    expect(resolveSessionSkill(character, athletics).effective).toBe(27);
    character.activeEffects = [];
    expect(resolveSessionSkill(character, athletics).effects).toEqual([]);
  });

  it('blocks conflicting inputs and supports explicit decisions without stacking', () => {
    const character = hydrateCharacter({ skills: { str: 12, dex: 13 }, activeEffects: [strength, athleticsEffect] });
    const athletics = character.skills.skills.find(skill => skill.name === 'Athletics')!;
    const first = resolveSessionSkill(character, athletics);
    expect(first.effective).toBe(28);
    expect(first.effects.find(entry => entry.effect.id === athleticsEffect.id)?.blocked).toBeTrue();

    character.activeEffects = [{ ...strength, active: false }, athleticsEffect];
    expect(resolveSessionSkill(character, athletics).effective).toBe(80);
    character.activeEffects = [strength, { ...strength, id: 'second' }];
    expect(resolveSessionSkill(character, athletics).effective).toBe(25);
    expect(resolveSessionSkill(character, athletics).effects.every(entry => entry.blocked)).toBeTrue();
  });

  it('applies the saved Fatigue level to checks, movement, initiative and Action Points without spending resources', () => {
    const character = hydrateCharacter({ fatigueLevel: 'Exhausted', skills: { dex: 15, int: 12 }, currentValues: { ap: 2 } });
    expect(characterEffects(character).length).toBe(1);
    expect(character.activeEffects).toBeUndefined();
    const fatigue = currentFatigue(character);
    expect(fatigue.grade).toBe('Formidable');
    expect(effectiveMovement(6, fatigue)).toBe(3);
    expect(sessionValue(character, character.skills.ap)).toBe(Number(storedSkillValue(character, character.skills.ap)) - 1);
    expect(sessionValue(character, character.skills.init)).toBe(Number(storedSkillValue(character, character.skills.init)) - 4);
    expect(character.currentValues?.['ap']).toBe(2);
    expect(skillCheckTarget(60, hardestGrade('Hard', [fatigue.grade!]), 'standard')).toBe(30);
    character.activeEffects = [createFatigue('Comatose', 'fatigue')];
    expect(currentFatigue(character).unableToAct).toBeTrue();
    expect(sessionValue(character, character.skills.ap)).toBe('—');
  });

  it('keeps current resources through JSON, including when a modified maximum changes', () => {
    const endurance: CharacterEffect = { ...strength, target: { kind: 'characteristic', key: 'con' }, value: 5 };
    const character = hydrateCharacter({
      name: 'Hero', skills: { con: 10, siz: 10 }, currentValues: { magicPoints: 7 },
      currentHitPoints: { chest: 3 }, activeEffects: [endurance, createFatigue('Tired', 'fatigue', false)],
    });
    const reloaded = parseCharacterFile(JSON.stringify(character))[0];
    expect(reloaded.activeEffects).toEqual(character.activeEffects);
    expect(getMaximumHp(withEffectiveCharacteristics(reloaded), 'chest')).toBe(7);
    expect(reloaded.currentHitPoints?.['chest']).toBe(3);
    expect(reloaded.currentValues?.['magicPoints']).toBe(7);
    expect(currentFatigue(reloaded).grade).toBeUndefined();
  });

  it('restores only the selected location and respects a lasting injury maximum after confirmation', () => {
    const character = hydrateCharacter({
      skills: { con: 10, siz: 10 }, currentHitPoints: { chest: -2, leftArm: -1 },
      locationInjuries: { chest: { note: 'Lasting injury', maximumHp: 2 } },
    });
    expect(restoreLocationHp(character, 'chest', false)).toBeFalse();
    expect(restoreLocationHp(character, 'chest', true)).toBeTrue();
    expect(character.currentHitPoints).toEqual({ chest: 2, leftArm: -1 });
    expect(character.locationInjuries?.['chest']).toEqual({ note: 'Lasting injury', maximumHp: 2 });
    expect(restoreLocationHp(character, 'nonexistent', true)).toBeFalse();
  });
});
