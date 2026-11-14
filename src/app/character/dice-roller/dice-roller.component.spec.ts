import { TestBed } from '@angular/core/testing';
import { DiceRollerComponent } from './dice-roller.component';
import { hydrateCharacter } from '../../services/character-format';
import { CharacterHistory, savedHistory } from '../../services/character-history';
import type { RollCheckContext } from '../../model/roll-record';

describe('Dice result interaction', () => {
  it('shows the free-roll form without a skill and hides it for a check that cannot be rolled', async () => {
    await TestBed.configureTestingModule({ imports: [DiceRollerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DiceRollerComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
    fixture.componentRef.setInput('check', {
      skill:'Athletics', original:40, effective:40, target:null, system:'standard',
      selectedGrade:'Standard', grade:'Hopeless', modifiers:[],
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('emits once per submitted result until the player explicitly starts another roll', () => {
    const panel = new DiceRollerComponent();
    const emitted = jasmine.createSpy('rolled');
    panel.rolled.subscribe(emitted);
    panel.origin = 'manual';
    panel.customExpression = '2d6+3';
    panel.manual = '4,6';
    panel.submit();
    panel.submit();
    expect(panel.result?.dice.total).toBe(13);
    expect(panel.breakdown).toBe('4 + 6 + 3');
    panel.animate = false;
    panel.submit();
    expect(emitted).toHaveBeenCalledTimes(1);
    panel.newRoll();
    panel.manual = '1,2';
    panel.submit();
    expect(emitted).toHaveBeenCalledTimes(2);
    expect(panel.result?.dice.total).toBe(6);
  });

  it('repeats the previous virtual expression directly from the result', async () => {
    await TestBed.configureTestingModule({ imports: [DiceRollerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DiceRollerComponent);
    const panel = fixture.componentInstance;
    const emitted = jasmine.createSpy('rolled');
    panel.rolled.subscribe(emitted);
    panel.customExpression = '2d100-1d6+3';
    panel.submit();
    fixture.detectChanges();
    const first = panel.result;
    const firstFaces = fixture.nativeElement.querySelector('.dice-faces');
    panel.customExpression = 'd4';
    fixture.nativeElement.querySelector('.result-actions .roll-button').click();
    fixture.detectChanges();

    expect(panel.result).not.toBe(first);
    expect(panel.result?.dice.expression).toBe('2d100-1d6+3');
    expect(panel.result?.dice.dice.map(die => die.sides)).toEqual([100, 100, 6]);
    expect(panel.result?.dice.modifier).toBe(3);
    expect(fixture.nativeElement.querySelector('.dice-faces')).not.toBe(firstFaces);
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(emitted).toHaveBeenCalledTimes(2);
  });

  it('uses a fresh manual d100 result and repeats the original check difficulty', () => {
    const panel = new DiceRollerComponent();
    const emitted = jasmine.createSpy('rolled');
    panel.rolled.subscribe(emitted);
    panel.check = {
      skill:'Athletics', original:60, effective:60, target:40, system:'standard',
      selectedGrade:'Hard', grade:'Hard', modifiers:[],
    };
    panel.origin = 'manual';
    panel.manual = '20';
    panel.submit();
    const first = panel.result;
    panel.check = { ...panel.check, target:60, grade:'Standard', selectedGrade:'Standard' };
    panel.repeatRoll();
    expect(panel.result).toBe(first);
    expect(emitted).toHaveBeenCalledTimes(1);

    panel.repeatManual = '50';
    panel.repeatRoll();
    expect(panel.result?.dice.total).toBe(50);
    expect(panel.result?.check?.grade).toBe('Hard');
    expect(panel.result?.outcome?.degree).toBe('Failure');
    expect(panel.repeatManual).toBe('');
    expect(emitted).toHaveBeenCalledTimes(2);
  });

  it('saves the applied context for each reroll and uses the new settings for a new roll', async () => {
    await TestBed.configureTestingModule({ imports: [DiceRollerComponent] }).compileComponents();
    const fixture = TestBed.createComponent(DiceRollerComponent);
    const panel = fixture.componentInstance;
    const history = new CharacterHistory();
    const character = hydrateCharacter({ name: 'Hero' });
    const initialCheck: RollCheckContext = {
      skill: 'Athletics', original: 55, effective: 60, target: 40, system: 'standard',
      selectedGrade: 'Hard', grade: 'Hard', modifiers: [{ name: 'Bonus', source: 'GM', impact: '+5' }],
    };
    panel.rolled.subscribe(roll => history.recordRoll(character, roll));
    panel.check = { ...initialCheck, modifiers: initialCheck.modifiers.map(modifier => ({ ...modifier })) };
    panel.origin = 'manual';
    panel.manual = '50';
    panel.submit();

    panel.check = { ...panel.check, effective: 55, target: 55, system: 'simplified', selectedGrade: 'Standard', grade: 'Standard', modifiers: [] };
    panel.repeatManual = '51';
    panel.repeatRoll();
    fixture.detectChanges();
    const target = fixture.nativeElement.querySelector('.roll-target');
    expect(target.textContent).toContain('40%');
    expect(target.textContent).not.toContain('55%');

    panel.newRoll();
    panel.manual = '52';
    panel.submit();
    const entries = savedHistory(hydrateCharacter(JSON.parse(JSON.stringify(character))));
    expect(entries.map(event => event.roll?.check)).toEqual([
      initialCheck, initialCheck, panel.check,
    ]);
    expect(entries.map(event => event.roll?.outcome?.degree)).toEqual(['Failure', 'Failure', 'Success']);
  });
});
