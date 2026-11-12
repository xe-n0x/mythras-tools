import { TestBed } from '@angular/core/testing';
import { CharacterHealthComponent } from './character-health.component';

describe('CharacterHealthComponent', () => {
  it('selects a body zone and emits the edited current HP for that location', () => {
    const fixture = TestBed.configureTestingModule({ imports: [CharacterHealthComponent] })
      .createComponent(CharacterHealthComponent);
    const health = fixture.componentInstance;
    health.humanoid = true;
    health.locations = [
      { key: 'head', label: 'Head', current: '', maximum: 4, armour: 0 },
      { key: 'chest', label: 'Chest', current: 0, maximum: 6, armour: 2 },
    ];
    const listener = jasmine.createSpy('HP edit');
    health.hpChange.subscribe(listener);
    fixture.detectChanges();

    fixture.nativeElement.querySelector('.zone-head').click();
    fixture.detectChanges();
    const hp = fixture.nativeElement.querySelector('input[aria-label="Current HP — Head"]');
    expect(hp).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.zone-head').getAttribute('aria-pressed')).toBe('true');
    hp.value = '-2';
    hp.dispatchEvent(new Event('input'));
    expect(listener).not.toHaveBeenCalled();
    hp.dispatchEvent(new Event('blur'));
    expect(listener).toHaveBeenCalledOnceWith({ key: 'head', value: -2 });
  });

  it('uses the supplied location list when the humanoid layout is unavailable', () => {
    const fixture = TestBed.configureTestingModule({ imports: [CharacterHealthComponent] })
      .createComponent(CharacterHealthComponent);
    fixture.componentInstance.locations = [{ key: 'tail', label: 'Tail', current: 0, maximum: 6, armour: 0 }];
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.body-map')).toBeNull();
    expect(fixture.nativeElement.querySelector('.location-list').textContent).toContain('Tail');
    expect(fixture.nativeElement.querySelector('input').value).toBe('0');
  });
});
