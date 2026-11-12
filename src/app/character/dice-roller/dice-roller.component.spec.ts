import { TestBed } from '@angular/core/testing';
import { DiceRollerComponent } from './dice-roller.component';

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
});
