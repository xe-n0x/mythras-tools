import { advancementSkills, applyAdvancement, experienceBalance, experienceImprovement, trainingExpression, trainingPrice, trainingShift } from './character-advancement';
import { hydrateCharacter, parseCharacterFile } from './character-format';
import { getSkillTotal } from './character-service.service';
import { resolveSessionSkill } from './session-values';
import { CharacterHistory } from './character-history';

describe('Character advancement', () => {
  const hero = () => hydrateCharacter({ name:'Hero', skills:{str:12,dex:12,int:12,con:12,siz:12,pow:12,cha:12},
    currentValues:{str:15}, currentHitPoints:{head:0}, extension:{tag:'keep'} });
  const athletics = (character: ReturnType<typeof hero>) => advancementSkills(character).find(option => option.skill.name === 'Athletics')!;

  it('uses d100 + INT and awards the larger improvement at equality (Core Rules p. 72)', () => {
    expect(experienceImprovement(50, 12, 37)).toBe(1);
    expect(experienceImprovement(50, 12, 38)).toBeUndefined();
    expect(experienceImprovement(50, 12, 38, 4)).toBe(5);
    expect(experienceImprovement(50, 12, 0, 4)).toBeUndefined();
  });

  it('charges once, keeps effects and current HP separate, and leaves the original intact (p. 72)', () => {
    const character = hero();
    const { skill, address } = athletics(character);
    const score = getSkillTotal(character, skill);
    character.activeEffects = [{id:'stat', kind:'modifier', name:'Strength', source:'GM', description:'', ends:'',
      active:true, target:{kind:'characteristic',key:'str'},operation:'add',value:4}];
    const result = applyAdvancement(character, [{kind:'award',rolls:1,modifier:0},{kind:'experience',skill:address,d100:score-12,d4:2}]);
    expect(experienceBalance(result)).toBe(0);
    expect(getSkillTotal(result, athletics(result).skill)).toBe(score + 3);
    expect(resolveSessionSkill(result, athletics(result).skill).effective).toBe(score + 10);
    expect(getSkillTotal(character, skill)).toBe(score);
    expect(result.currentHitPoints?.['head']).toBe(0);
    expect(() => applyAdvancement(result,[{kind:'experience',skill:address,d100:100,d4:4}])).toThrow();
  });

  it('keeps prepared edits atomic, preserves absolute current overrides and round-trips unknown fields', () => {
    const character = hero();
    const address = athletics(character).address;
    expect(() => applyAdvancement(character,[{kind:'manualStat',key:'str',value:14},{kind:'experience',skill:address,d100:100,d4:4}])).toThrow();
    expect(character.skills.str).toBe(12);
    const result = applyAdvancement(character,[{kind:'manualStat',key:'str',value:14},{kind:'manualSkill',skill:address,value:30}]);
    const saved = parseCharacterFile(JSON.stringify(result))[0];
    expect(getSkillTotal(saved,athletics(saved).skill)).toBe(30);
    expect(saved.currentValues?.['str']).toBe(15);
    expect((saved as any).extension).toEqual({tag:'keep'});
  });

  it('allows one claim for a fumbled skill per award period (p. 72)', () => {
    const character = hero();
    const address = athletics(character).address;
    const action = {kind:'fumble' as const,skill:address};
    expect(() => applyAdvancement(character,[action])).toThrow();
    const result = applyAdvancement(character,[{kind:'award',rolls:1,modifier:0}, action]);
    expect(() => applyAdvancement(result,[action])).toThrow();
    expect(experienceBalance(result)).toBe(1);
  });

  it('requires a source and month for a new professional skill and charges three ER (p. 73)', () => {
    const character = applyAdvancement(hero(),[{kind:'award',rolls:3,modifier:0}]);
    const unlearned = advancementSkills(character).find(option => option.skill.name === 'Shaping')!;
    expect(() => applyAdvancement(character,[{kind:'learn',skill:unlearned.address,source:'Tutor',month:''}])).toThrow();
    const result = applyAdvancement(character,[{kind:'learn',skill:unlearned.address,source:'Tutor',month:'First month completed'}]);
    const learned = advancementSkills(result).find(option => option.skill.name === 'Shaping')!;
    expect(learned.learned).toBeTrue();
    expect(getSkillTotal(result,learned.skill)).toBe(24);
    expect(experienceBalance(result)).toBe(0);
  });

  it('changes a recorded passion by the skill procedure (p. 72)', () => {
    const character = hero();
    character.passions = [{passion:'Loyalty',modifierNumber:50} as typeof character.passions[number]];
    const result = applyAdvancement(character,[{kind:'award',rolls:2,modifier:0},
      {kind:'passion',index:0,d100:38,d4:2},{kind:'passion',index:0,d100:1,reduce:true}]);
    expect(result.passions[0].modifierNumber).toBe(52);
    expect(character.passions[0].modifierNumber).toBe(50);
    expect(experienceBalance(result)).toBe(0);
  });

  it('covers training chart rows, Teach shifts and the price example (p. 73; Tennla uses d2 at 20)', () => {
    expect([19,20,21,30,31,41,51,61,91,101].map(difference => trainingExpression(difference)))
      .toEqual([undefined,'d2','d2','d2','d3','d4','d6','d6+1','d6+4','d6+5']);
    expect(trainingExpression(20,-1)).toBe('0');
    expect(trainingShift(50,5)).toBe(2);
    expect(trainingShift(50,24)).toBe(1);
    expect(trainingShift(50,55)).toBe(0);
    expect(trainingShift(50,100)).toBe(-1);
    expect(trainingPrice(70,50)).toBe(19);
  });

  it('registers a week without a gain, completes once, and unlocks retraining only through ER (p. 73)', () => {
    const character = hero();
    const { address, skill } = athletics(character);
    const total = getSkillTotal(character,skill);
    const start = {kind:'startTraining' as const,training:{skill:address,mentor:'Mentor',mentorSkill:total + 20,period:'Week 1',terms:'Favor'}};
    const planned = applyAdvancement(character,[start]);
    expect(getSkillTotal(planned,athletics(planned).skill)).toBe(total);
    expect(() => applyAdvancement(planned,[start])).toThrow();
    const result = applyAdvancement(planned,[{kind:'finishTraining',week:'Week 1 completed',die:2}]);
    expect(getSkillTotal(result,athletics(result).skill)).toBe(total + 2);
    expect(experienceBalance(result)).toBe(0);
    expect(() => applyAdvancement(result,[{kind:'finishTraining',week:'Week 1 completed',die:2}])).toThrow();
    expect(() => applyAdvancement(result,[start])).toThrow();
    const improved = applyAdvancement(result,[{kind:'award',rolls:1,modifier:0},{kind:'experience',skill:address,d100:1}]);
    expect(athletics(improved).skill.trainedSinceExperience).toBeUndefined();
  });

  it('uses ongoing upkeep and award-triggered decline, and separates the optional purchase (pp. 72–73)', () => {
    const character = hero();
    const started = applyAdvancement(character,[{kind:'regime',key:'str',steps:1,maximum:18},{kind:'award',rolls:3,modifier:0}]);
    expect(started.skills.str).toBe(13);
    expect(experienceBalance(started)).toBe(2);
    const stopped = applyAdvancement(started,[{kind:'regime',key:'str',steps:0,maximum:18}]);
    expect(stopped.skills.str).toBe(13);
    const awarded = applyAdvancement(stopped,[{kind:'award',rolls:10,modifier:0}]);
    expect(awarded.skills.str).toBe(12);
    const paid = applyAdvancement(awarded,[{kind:'permanent',key:'dex',minimum:3,maximum:18}]);
    expect(paid.skills.dex).toBe(13);
    expect(experienceBalance(paid)).toBe(2);
    expect(() => applyAdvancement(character,[{kind:'regime',key:'siz',steps:1,maximum:18}])).toThrow();
  });

  it('stores a batch as one existing history action and replays the skill and resource together', () => {
    const character = hero();
    const { address, skill } = athletics(character);
    const past = new CharacterHistory();
    const score = getSkillTotal(character,skill);
    const result = applyAdvancement(character,[{kind:'award',rolls:2,modifier:0},{kind:'experience',skill:address,d100:1}]);
    past.record(character,['skills','advancement'],{type:'Experience Roll',target:'Advancement'},()=>{
      character.skills=result.skills;
      character.advancement=result.advancement;
    },()=>true);
    expect(character.history?.length).toBe(1);
    const undone = past.replay(character,'undo',()=>true)!;
    expect(getSkillTotal(undone,athletics(undone).skill)).toBe(score);
    expect(experienceBalance(undone)).toBe(0);
    expect(experienceBalance(past.replay(undone,'redo',()=>true)!)).toBe(1);
  });
});
