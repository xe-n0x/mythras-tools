import { RollCheckContext } from '../model/roll-record';
import { hydrateCharacter } from './character-format';
import { resolveSessionSkill } from './session-values';
import { DifficultyGrade, hardestGrade, resolveCheckRoll, rollSkillCheck, skillCheckTarget } from './skill-check';

describe('Mythras Difficulty Grades', () => {
  const cases: [DifficultyGrade, number | null, number | null][] = [
    ['Automatic', null, null],
    ['Very Easy', 120, 100],
    ['Easy', 90, 80],
    ['Standard', 60, 60],
    ['Hard', 40, 40],
    ['Formidable', 30, 20],
    ['Herculean', 6, -20],
    ['Hopeless', null, null],
  ];

  for (const [grade, core, simplified] of cases) {
    it('applies the two separate tables for ' + grade, () => {
      expect(skillCheckTarget(60, grade, 'standard')).toBe(core);
      expect(skillCheckTarget(60, grade, 'simplified')).toBe(simplified);
    });
  }

  it('keeps the fractional target and only uses the hardest applicable grade', () => {
    const grade = hardestGrade('Hard', ['Hard', 'Formidable']);
    expect(grade).toBe('Formidable');
    expect(skillCheckTarget(65, grade, 'standard')).toBe(32.5);
    expect(skillCheckTarget(65, 'Hard', 'standard')).toBeCloseTo(130 / 3);
    expect(hardestGrade('Herculean', ['Hard'])).toBe('Herculean');
    expect(hardestGrade('Automatic', [])).toBe('Automatic');
    expect(hardestGrade('Very Easy', ['Hopeless'])).toBe('Hopeless');
  });
});

describe('Simple percentile checks', () => {
  const context = (target: number | null, original = target ?? 0, effective = original): RollCheckContext => ({
    skill: 'Athletics', target, original, effective, grade:'Standard', selectedGrade:'Standard', system:'standard', modifiers:[],
  });

  it('uses the modified and rounded-up critical threshold and honours the 96–00 boundary', () => {
    const check = context(42.5);
    expect(resolveCheckRoll(check, 5)?.degree).toBe('Critical Success');
    expect(resolveCheckRoll(check, 6)?.degree).toBe('Success');
    expect(resolveCheckRoll(check, 42)?.degree).toBe('Success');
    expect(resolveCheckRoll(check, 43)?.degree).toBe('Failure');
    expect(resolveCheckRoll(check, 99)?.degree).toBe('Fumble');
    expect(resolveCheckRoll(check, 100)?.degree).toBe('Fumble');
    expect(resolveCheckRoll(context(1000), 95)?.degree).toBe('Critical Success');
    expect(resolveCheckRoll(context(1000), 96)?.degree).toBe('Failure');
  });

  it('preserves guaranteed successes at low scores and fumbles over 100%', () => {
    expect(resolveCheckRoll(context(-20), 1)?.degree).toBe('Success');
    expect(resolveCheckRoll(context(1), 1)?.degree).toBe('Critical Success');
    expect(resolveCheckRoll(context(1), 5)?.degree).toBe('Success');
    expect(resolveCheckRoll(context(1), 6)?.degree).toBe('Failure');
    expect(resolveCheckRoll(context(100), 99)?.degree).toBe('Fumble');
    expect(resolveCheckRoll(context(101), 99)?.degree).toBe('Failure');
    expect(resolveCheckRoll(context(101), 100)?.degree).toBe('Fumble');
    expect(resolveCheckRoll(context(120, 80), 99)?.degree).toBe('GM ruling required');
    expect(resolveCheckRoll(context(80, 120), 99)?.degree).toBe('GM ruling required');
    expect(resolveCheckRoll(context(120, 80), 98)?.degree).toBe('Failure');
    expect(resolveCheckRoll(context(60), 0)).toBeUndefined();
    expect(resolveCheckRoll(context(60), 100.5)).toBeUndefined();
  });

  it('resolves a manual and a deterministic virtual roll identically, while preserving origin', () => {
    const check = context(60);
    const manual = rollSkillCheck(check, '00')!;
    const virtual = rollSkillCheck(check, undefined, () => 99)!;
    expect(manual.outcome).toEqual(virtual.outcome);
    expect(manual.dice.total).toBe(virtual.dice.total);
    expect(manual.dice.origin).toBe('manual');
    expect(virtual.dice.origin).toBe('virtual');
    expect(rollSkillCheck(context(null), undefined, () => { throw Error('Dice should not be used'); })).toBeUndefined();
  });

  it('uses the existing effective value once and takes the hardest active grade', () => {
    const hero = hydrateCharacter({ skills: { str: 15, dex: 12 }, activeEffects: [{
      id:'str', kind:'modifier', name:'Weakness', operation:'add', value:-3, active:true,
      target:{kind:'characteristic', key:'str'}, source:'GM ruling',
    }] });
    const skill = hero.skills.skills.find(entry => entry.name === 'Athletics')!;
    const effective = resolveSessionSkill(hero, skill).effective;
    const grade = hardestGrade('Easy', ['Hard']);
    expect(effective).toBe(24);
    expect(skillCheckTarget(effective, grade, 'standard')).toBe(16);
    expect(skillCheckTarget(effective, grade, 'simplified')).toBe(4);
    expect(rollSkillCheck(context(16, 27, effective), '16')?.outcome?.degree).toBe('Success');
    expect(rollSkillCheck(context(16, 27, effective), '17')?.outcome?.degree).toBe('Failure');
    expect(hero.skills.str).toBe(15);
  });
});
