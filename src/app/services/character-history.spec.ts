import { CharacterEffect } from '../model/character-effect';
import { changeWeaponGrip } from './character-loadout';
import { hydrateCharacter, parseCharacterFile } from './character-format';
import { CharacterHistory, savedHistory } from './character-history';
import { editCurrentHp, restoreLocationHp, setLocationInjury } from './hit-points';
import { resolveSessionSkill } from './session-values';
import { rollSkillCheck } from './skill-check';

describe('Character history', () => {
  it('persists a completed roll independently of Undo and Redo', () => {
    const history = new CharacterHistory();
    let character = hydrateCharacter({ name: 'Hero' });
    history.record(character, ['name'], { type:'Identity', target:'Name' }, () => character.name = 'New');
    character = history.replay(character, 'undo', () => true)!;
    const roll = rollSkillCheck({
      skill:'Athletics', original:60, effective:60, target:60,
      grade:'Standard', selectedGrade:'Standard', system:'standard', modifiers:[],
    }, '42')!;
    history.recordRoll(character, roll);
    expect(history.canRedo).toBeTrue();
    character = history.replay(character, 'redo', () => true)!;
    roll.dice.total = 5;
    expect(savedHistory(character)[1].roll?.dice.total).toBe(42);
    character = history.replay(character, 'undo', () => true)!;
    const restored = parseCharacterFile(JSON.stringify(character))[0];
    expect(savedHistory(restored)[1].roll?.dice.total).toBe(42);
    expect(savedHistory(restored)[1].roll?.outcome?.degree).toBe('Success');
  });
  it('retains old fractional targets and recorded outcomes when decoding JSON', () => {
    const roll = { check: { target: 42.5 }, outcome: { degree: 'Critical Success' }, dice: { total: 5 } };
    const character = parseCharacterFile(JSON.stringify({ name: 'Legacy', history: [{ id: 'old', type: 'Roll', roll, changes: [] }] }))[0];
    expect(character.history?.[0].roll).toEqual(jasmine.objectContaining(roll));
  });
  it('records one HP commit, undoes and redoes it, and keeps only the journal after reload', () => {
    let character = hydrateCharacter({ name: 'Hero', currentHitPoints: { head: 3, chest: 6 } });
    const history = new CharacterHistory();
    history.record(character, ['currentHitPoints'], { type: 'HP', target: 'Head' }, () => editCurrentHp(character, 'head', -2));
    history.record(character, ['currentHitPoints'], { type: 'HP', target: 'Head' }, () => editCurrentHp(character, 'head', -2));
    expect(savedHistory(character).length).toBe(1);
    expect(savedHistory(character)[0].before).toBe(3);
    character = history.replay(character, 'undo', () => true)!;
    expect(character.currentHitPoints).toEqual({ head: 3, chest: 6 });
    expect(savedHistory(character)[0].undone).toBeTrue();
    character = history.replay(character, 'redo', () => true)!;
    expect(character.currentHitPoints).toEqual({ head: -2, chest: 6 });
    const restored = parseCharacterFile(JSON.stringify(character))[0];
    expect(savedHistory(restored).length).toBe(1);
    expect(new CharacterHistory().replay(restored, 'undo', () => true)).toBeUndefined();
    expect(savedHistory(hydrateCharacter({ name: 'Legacy' }))).toEqual([]);
  });

  it('preserves multiple explicit wounds through healing, history replay and JSON', () => {
    const history = new CharacterHistory();
    let character = hydrateCharacter({ name: 'Old hero', skills: { con: 13, siz: 11 }, currentHitPoints: {leftArm: -2}, locationInjuries: {leftArm: {note: 'Old note', extension: true}} });
    history.record(character, ['locationInjuries'], {type: 'Location state', target: 'Left arm'}, () =>
      setLocationInjury(character, 'leftArm', {conditions: ['impaling', 'crushing']}));
    character = history.replay(character, 'undo', () => true)!;
    expect(character.locationInjuries?.['leftArm'].conditions).toBeUndefined();
    character = history.replay(character, 'redo', () => true)!;
    expect(restoreLocationHp(character, 'leftArm', false)).toBeFalse();
    expect(restoreLocationHp(character, 'leftArm', true)).toBeTrue();
    character = parseCharacterFile(JSON.stringify(character))[0];
    expect(character.currentHitPoints?.['leftArm']).toBe(4);
    expect(character.locationInjuries?.['leftArm']).toEqual(jasmine.objectContaining({note: 'Old note', extension: true, conditions: ['impaling', 'crushing']}));
    setLocationInjury(character, 'leftArm', {conditions: []});
    expect(character.locationInjuries?.['leftArm'].conditions).toBeUndefined();
    expect(character.locationInjuries?.['leftArm'].note).toBe('Old note');
  });

  it('recalculates dependent skills without logging them and restores an effect only once', () => {
    let character = hydrateCharacter({ name: 'Hero', skills: { str: 15, dex: 12 } });
    const history = new CharacterHistory();
    const athletics = () => resolveSessionSkill(character, character.skills.skills.find(skill => skill.name === 'Athletics')!).effective;
    const effect: CharacterEffect = {
      kind: 'modifier', id: 'strength', name: 'Weakness', target: { kind: 'characteristic', key: 'str' },
      operation: 'add', value: -3, active: true, source: 'GM ruling', description: '', ends: '',
    };
    history.record(character, ['currentValues'], { type: 'Characteristic', target: 'STR' }, () => character.currentValues = { str: 16 });
    expect(athletics()).toBe(28);
    history.record(character, ['activeEffects'], { type: 'Add effect', target: effect.name }, () => character.activeEffects = [effect]);
    expect(athletics()).toBe(25);
    expect(savedHistory(character).length).toBe(2);
    character = history.replay(character, 'undo', () => true)!;
    expect(athletics()).toBe(28);
    character = history.replay(character, 'redo', () => true)!;
    expect(athletics()).toBe(25);
    expect(character.activeEffects?.length).toBe(1);
    expect(character.skills.str).toBe(15);
  });

  it('restores a composite weapon change and leaves unrelated edits intact', () => {
    const character = hydrateCharacter({ name: 'Hero', equipment: { weapons: [
      { name: 'Sword', grip: 'main', oneHanded: '1d8', equipped: true },
      { name: 'Great sword', twoHanded: '2d6', equipped: false },
    ] } });
    const history = new CharacterHistory();
    history.record(character, ['equipment'], { type: 'Weapon', target: 'Great sword' }, () =>
      changeWeaponGrip(character.equipment.weapons, character.equipment.weapons[1], 'both'));
    expect(character.equipment.weapons.map(weapon => weapon.equipped)).toEqual([false, true]);
    character.name = 'Unrelated';
    const restored = history.replay(character, 'undo', () => true)!;
    expect(restored.equipment.weapons.map(weapon => weapon.equipped)).toEqual([true, false]);
    expect(restored.name).toBe('Unrelated');
  });

  it('preserves data on a conflicting edit or failed save and clears only the journal', () => {
    const character = hydrateCharacter({ name: 'Old' });
    const history = new CharacterHistory();
    history.record(character, ['name'], { type: 'Identity', target: 'Name' }, () => character.name = 'New');
    const save = jasmine.createSpy('save').and.returnValue(false);
    character.name = 'Later';
    expect(history.replay(character, 'undo', save)).toBeUndefined();
    expect(save).not.toHaveBeenCalled();
    character.name = 'New';
    expect(history.replay(character, 'undo', save)).toBeUndefined();
    expect(history.canUndo).toBeTrue();
    expect(character.name).toBe('New');
    history.clear(character);
    expect(history.canUndo).toBeFalse();
    expect(savedHistory(character)).toEqual([]);
    expect(character.name).toBe('New');
  });
});
