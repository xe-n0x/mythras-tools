import { TestBed } from '@angular/core/testing';
import { CharacterEffect } from '../../model/character-effect';
import { CharacterEffectsComponent } from './character-effects.component';

describe('Save effect form', () => {
  async function openEditor(location?: string) {
    await TestBed.configureTestingModule({ imports: [CharacterEffectsComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CharacterEffectsComponent);
    if (location) fixture.componentRef.setInput('location', location);
    const saved: CharacterEffect[][] = [];
    fixture.componentInstance.effectsChange.subscribe(effects => saved.push(effects));
    fixture.detectChanges();
    const root: HTMLElement = fixture.nativeElement;
    root.querySelector<HTMLButtonElement>('header button')!.click();
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('dialog .add-effect')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    return { fixture, root, saved };
  }

  function fill(root: HTMLElement, name: string, value: string): void {
    const field = root.querySelector<HTMLInputElement | HTMLSelectElement>(`[name="${name}"]`)!;
    field.value = value;
    field.dispatchEvent(new Event(field instanceof HTMLSelectElement ? 'change' : 'input', { bubbles: true }));
  }

  function save(root: HTMLElement): void {
    root.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
  }

  it('explains a missing name and then saves a manual condition with no source entered', async () => {
    const { fixture, root, saved } = await openEditor();
    save(root);
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent).toContain('Введите название эффекта');
    expect(saved.length).toBe(0);

    fill(root, 'name', 'Session condition');
    save(root);
    fixture.detectChanges();
    expect(saved[0][0]).toEqual(jasmine.objectContaining({ name: 'Session condition', source: 'GM ruling' }));
    expect(root.querySelector('form')).toBeNull();
  });

  it('saves a local numerical modifier with its selected parameter and explicit source', async () => {
    const { fixture, root, saved } = await openEditor('leftWing');
    fill(root, 'kind', 'modifier');
    fixture.detectChanges();
    await fixture.whenStable();
    fill(root, 'name', 'Weakness');
    fill(root, 'source', 'Campaign ruling');
    fill(root, 'target', 'str');
    fill(root, 'value', '-3');
    save(root);
    expect(saved[0][0]).toEqual(jasmine.objectContaining({
      kind: 'modifier', source: 'Campaign ruling', location: 'leftWing', value: -3,
      target: { kind: 'characteristic', key: 'str' },
    }));
  });
});
