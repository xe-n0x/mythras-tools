import { attributeDetails, characteristicDetails, hpDetails } from './calculation-details';
import { hydrateCharacter } from './character-format';
import { initiativeWithArmour, resolveSessionSkill, sessionValue } from './session-values';

describe('Calculation explanations', () => {
  it('uses the same results as the session and shows effect sources and actual dependencies', () => {
    const character = hydrateCharacter({ skills: { str: 15, dex: 12, siz: 11, int: 12 }, activeEffects: [{
      kind:'modifier', id:'str', name:'Weakness', target:{ kind:'characteristic', key:'str' },
      operation:'add', value:-3, active:true, source:'GM decision',
    }] });
    const skill = character.skills.skills.find(entry => entry.name === 'Athletics')!;
    const stat = characteristicDetails(character, 'str', [skill]);
    expect(stat.result).toBe(12);
    expect(stat.lines.some(line => String(line.value).includes('GM decision'))).toBeTrue();
    expect(stat.lines.some(line => String(line.value).includes('Athletics'))).toBeTrue();
    expect(resolveSessionSkill(character, skill).effectiveBase).toBe(24);
    expect(attributeDetails(character, 'damage').result).toBe(sessionValue(character, character.skills.damage));
    expect(attributeDetails(character, 'init').result).toBe(initiativeWithArmour(character));
  });

  it('distinguishes custom or injured maximums from current HP and does not infer a custom formula', () => {
    const character = hydrateCharacter({ species:'Griffin', hp:{ leftWing:5 }, currentHitPoints:{ leftWing:1 },
      locationInjuries:{ leftWing:{ maximumHp:3 } } });
    const details = hpDetails(character, 'leftWing', 'Left wing', false);
    expect(details.result).toBe(3);
    expect(details.lines).toContain({ label:'Current HP', value:1 });
    delete character.locationInjuries?.['leftWing'];
    expect(hpDetails(character, 'leftWing', 'Left wing', false).page).toBeUndefined();
  });
});
