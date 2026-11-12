import { hydrateCharacter } from './character-format';
import { getCurrentHp, getHitLocations, setCurrentHp, getMaximumHp, HIT_LOCATIONS, usesHumanoidBodyMap } from './hit-points';
import { editCurrentHp, getLocationInjury, getWoundSeverity, initializeCurrentHp, setLocationInjury } from './hit-points';

describe('Manual current hit points', () => {
  const legacy = () => ({skills:{con:10,siz:10}, hp:{head:{extraBonus:-2},chest:{extraBonus:0},leftArm:{extraBonus:-3},rightArm:{extraBonus:null}}});
  it('leaves all current fields absent while calculating maximums', () => {
    const character=hydrateCharacter({skills:{con:10,siz:10}});
    for (const {key} of HIT_LOCATIONS) expect(getCurrentHp(character,key)).toBe('');
    expect(getMaximumHp(character,'head')).toBe(4);
    expect(character.currentHitPoints).toBeUndefined();
  });
  it('restores explicit legacy HP edits, including zero and an unchanged maximum', () => {
    const character=hydrateCharacter(legacy());
    expect(getCurrentHp(character,'head')).toBe(2);
    expect(getCurrentHp(character,'chest')).toBe(6);
    expect(getCurrentHp(character,'leftArm')).toBe(0);
    expect(getCurrentHp(character,'rightArm')).toBe('');
    expect(getMaximumHp(character,'head')).toBe(4);
    character.skills.con=30;
    expect(getCurrentHp(character,'head')).toBe(2);
  });
  it('preserves manually entered zero, negative HP and cleared values across reload without restoring old values', () => {
    const character=hydrateCharacter(legacy());
    setCurrentHp(character,'head','');setCurrentHp(character,'chest',0);setCurrentHp(character,'leftLeg',-2);
    const reloaded=hydrateCharacter(JSON.parse(JSON.stringify(character)));
    expect(getCurrentHp(reloaded,'head')).toBe('');
    expect(getCurrentHp(reloaded,'chest')).toBe(0);
    expect(getCurrentHp(reloaded,'leftLeg')).toBe(-2);
    expect(reloaded.hp.head.extraBonus).toBe(-2);
    setCurrentHp(reloaded,'chest',null);
    expect(getCurrentHp(reloaded,'chest')).toBe('');
  });
  it('keeps existing manual values and unknown save fields while restoring old HP edits', () => {
    const character=hydrateCharacter({...legacy(), currentHitPoints:{head:1,chest:null}, extension:{keep:'unchanged'}});
    expect(getCurrentHp(character,'head')).toBe(1);
    expect(getCurrentHp(character,'chest')).toBe('');
    expect((character as any).extension.keep).toBe('unchanged');
  });

  it('preserves explicit custom locations and their edited HP across JSON reloads', () => {
    const character = hydrateCharacter({
      species: 'Wyvern',
      skills: { con: 10, siz: 10 },
      hp: { leftWing: { name: 'Left wing', base: ['con', 'siz'], divide: 5 }, tail: 6 },
    });
    expect(usesHumanoidBodyMap(character)).toBeFalse();
    expect(getHitLocations(character)).toEqual([{ key: 'leftWing', label: 'Left wing' }, { key: 'tail', label: 'Tail' }]);
    expect(getMaximumHp(character, 'leftWing')).toBe(4);
    expect(getMaximumHp(character, 'tail')).toBe(6);
    setCurrentHp(character, 'leftWing', '-1');
    const reloaded = hydrateCharacter(JSON.parse(JSON.stringify(character)));
    expect(getCurrentHp(reloaded, 'leftWing')).toBe(-1);
    expect(getHitLocations(reloaded)).toEqual(getHitLocations(character));
    expect(getMaximumHp(reloaded, 'chest')).toBe('');
  });

  it('uses only stored locations for a nonhuman save with partial data', () => {
    const character = hydrateCharacter({ species: 'Serpent', hp: { head: 5 } });
    expect(usesHumanoidBodyMap(character)).toBeFalse();
    expect(getHitLocations(character)).toEqual([{ key: 'head', label: 'Head' }]);
  });

  it('restores legacy manual HP on a nonhuman save with a partial standard location', () => {
    const character = hydrateCharacter({ ...legacy(), species: 'Elf' });
    expect(usesHumanoidBodyMap(character)).toBeFalse();
    expect(getCurrentHp(character, 'head')).toBe(2);
    expect(getHitLocations(character).map(location => location.key)).not.toContain('leftLeg');
  });

  it('keeps the standard body map and legacy partial HP data for a human save', () => {
    const character = hydrateCharacter({ ...legacy(), species: 'Human' });
    expect(usesHumanoidBodyMap(character)).toBeTrue();
    expect(getHitLocations(character)).toEqual([...HIT_LOCATIONS]);
    expect(getCurrentHp(character, 'head')).toBe(2);
  });
});

describe('Initial HP and wound state', () => {
  it('initializes every location for a completed humanoid and preserves explicit legacy data', () => {
    const draft = hydrateCharacter({ skills: { con: 12, siz: 13 } });
    initializeCurrentHp(draft);
    for (const { key } of HIT_LOCATIONS) {
      expect(getCurrentHp(draft, key)).toBe(getMaximumHp(draft, key));
    }
    const saved = hydrateCharacter({
      skills: { con: 12, siz: 13 },
      currentHitPoints: { head: 0, chest: -4, leftLeg: null, rightLeg: '' },
    });
    initializeCurrentHp(saved);
    const restored = hydrateCharacter(JSON.parse(JSON.stringify(saved)));
    expect(restored.currentHitPoints).toEqual(jasmine.objectContaining({ head: 0, chest: -4, leftLeg: null, rightLeg: '', leftArm: 4 }));
  });

  it('leaves HP uninitialized when a draft is missing an input to its maximum', () => {
    const draft = hydrateCharacter({ skills: { con: 12 } });
    initializeCurrentHp(draft);
    expect(draft.currentHitPoints).toBeUndefined();
  });

  it('classifies wounds at zero and at the negative starting HP boundary', () => {
    expect(getWoundSeverity(5, 5)).toBe('healthy');
    expect(getWoundSeverity(4, 5)).toBe('minor');
    expect(getWoundSeverity(0, 5)).toBe('serious');
    expect(getWoundSeverity(-4, 5)).toBe('serious');
    expect(getWoundSeverity(-5, 5)).toBe('major');
    expect(getWoundSeverity(-6, 5)).toBe('major');
    expect(getWoundSeverity('', 5)).toBe('unknown');
  });

  it('caps healing, preserves negative HP, and applies a recorded reduced maximum after export and import', () => {
    const character = hydrateCharacter({ skills: { con: 12, siz: 13 } });
    editCurrentHp(character, 'leftArm', -5);
    expect(getCurrentHp(character, 'leftArm')).toBe(-5);
    expect(getLocationInjury(character, 'leftArm')).toBeUndefined();
    setLocationInjury(character, 'leftArm', { note: 'Hand lost', maximumHp: 2 });
    const restored = hydrateCharacter(JSON.parse(JSON.stringify(character)));
    expect(getLocationInjury(restored, 'leftArm')?.note).toBe('Hand lost');
    expect(getMaximumHp(restored, 'leftArm')).toBe(2);
    expect(getWoundSeverity(getCurrentHp(restored, 'leftArm'), 2)).toBe('major');
    editCurrentHp(restored, 'leftArm', 7);
    expect(getCurrentHp(restored, 'leftArm')).toBe(2);
  });
});
