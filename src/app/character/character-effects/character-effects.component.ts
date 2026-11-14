import { DismissOnBackdropDirective } from '../../directives/dismiss-on-backdrop.directive';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { v4 as uuid } from 'uuid';
import { Character } from '../../model/character';
import { CharacterEffect, characteristicKeys, effectAttributes, EffectAttribute, EffectTarget, fatigueLevels, FatigueLevel, StunArea } from '../../model/character-effect';
import { Skill } from '../../model/skill';
import { attributeEffectConflict, createFatigue, fatigueRules, sameTarget, skillTarget } from '../../services/character-effects';
import { sheetEffectImpact, sheetRuleRef, sheetRu } from '../../services/sheet-labels';

@Component({
  standalone: true,
  selector: 'app-character-effects',
  imports: [CommonModule, FormsModule, DismissOnBackdropDirective],
  templateUrl: './character-effects.component.html',
  styleUrls: ['./character-effects.component.scss'],
})
export class CharacterEffectsComponent implements OnChanges {
  @Input() effects: CharacterEffect[] = [];
  @Input() skills: Skill[] = [];
  @Input() character?: Character;
  @Input() location?: string;
  @Output() effectsChange = new EventEmitter<CharacterEffect[]>();

  readonly fatigueLevels = fatigueLevels;
  readonly impact = sheetEffectImpact;
  readonly ru = sheetRu;
  readonly ruleRef = sheetRuleRef;
  readonly fatigueRules = fatigueRules;
  adding = false;
  submitted = false;
  kind: 'note' | 'modifier' | 'stun' = 'note';
  editing?: CharacterEffect;
  name = '';
  source = '';
  description = '';
  ends = '';
  consequences = '';
  area: StunArea | '' = '';
  damage: number | null = null;
  stunConfirmed = false;
  targetKey = '';
  operation: 'add' | 'set' = 'add';
  value: number | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['location']) this.cancel();
  }

  get visibleEffects(): CharacterEffect[] {
    return this.effects.filter(effect => (effect.location || undefined) === this.location);
  }

  get fatigue() {
    return this.effects.filter((effect): effect is Extract<CharacterEffect, { kind: 'fatigue' }> =>
      effect.kind === 'fatigue');
  }

  get fatigueLevel(): FatigueLevel | '' {
    const [effect] = this.fatigue;
    return effect?.level ?? '';
  }

  get targets(): { key: string; label: string; target: EffectTarget }[] {
    return [
      ...characteristicKeys.map(key => ({ key, label: key.toUpperCase(), target: { kind: 'characteristic', key } as const })),
      ...(Object.keys(effectAttributes) as EffectAttribute[]).map(key => ({
        key, label: effectAttributes[key], target: { kind: 'attribute', key } as const,
      })),
      ...this.skills.map(skill => ({
        key: 'skill:' + Number(skill.professional === true) + ':' + skill.name,
        label: skill.name, target: skillTarget(skill),
      })),
    ];
  }

  trackTarget(_index: number, target: { key: string }): string {
    return target.key;
  }

  get validationError(): string {
    if (this.kind === 'stun') {
      if (!this.location || !this.area) return 'Choose the anatomy of the affected location.';
      if (this.damage === null || !Number.isSafeInteger(this.damage) || this.damage <= 0) return 'Enter the damage inflicted as a positive whole number.';
      return this.stunConfirmed ? '' : 'Confirm the hit and the failed Endurance test before saving.';
    }
    if (!this.name.trim()) return 'Enter an effect name.';
    if (this.kind === 'modifier') {
      if (!this.targets.some(target => target.key === this.targetKey)) return 'Choose a parameter to modify.';
      if (!Number.isSafeInteger(this.value)) return 'Enter a whole number for the modifier.';
    }
    return '';
  }

  add(): void {
    this.submitted = true;
    if (this.validationError) return;
    const common = { id: this.editing?.id ?? uuid(), name: this.name.trim(), source: this.source.trim() || 'GM ruling',
      description: this.description.trim(), ends: this.ends.trim(), active: this.editing?.active ?? true,
      location: this.location, consequences: this.consequences.trim() || undefined };
    const target = this.targets.find(entry => entry.key === this.targetKey)?.target;
    const effect: CharacterEffect = this.kind === 'stun' && this.location && this.area && this.damage !== null
      ? { ...common, kind: 'stun', location: this.location, area: this.area, damage: this.damage,
          name: 'Stun Location', source: 'Core Rules, Stun Location, p. 99' }
      : this.kind === 'modifier' && target && this.value !== null
      ? { ...common, kind: 'modifier', target, operation: this.operation, value: this.value }
      : { ...common, kind: 'note' };
    this.effectsChange.emit(this.editing
      ? this.effects.map(entry => entry === this.editing ? effect : entry)
      : [...this.effects, effect]);
    this.cancel();
  }

  cancel(): void {
    this.submitted = false;
    this.editing = undefined;
    this.kind = 'note';
    this.name = this.source = this.description = this.ends = this.targetKey = this.consequences = '';
    this.area = '';
    this.damage = null;
    this.stunConfirmed = false;
    this.operation = 'add';
    this.value = null;
    this.adding = false;
  }

  edit(effect: CharacterEffect): void {
    if (effect.kind === 'fatigue') return;
    this.cancel();
    this.adding = true;
    this.editing = effect;
    this.kind = effect.kind;
    this.name = effect.name;
    this.source = effect.source ?? '';
    this.description = effect.description ?? '';
    this.ends = effect.ends ?? '';
    this.consequences = effect.consequences ?? '';
    if (effect.kind === 'modifier') {
      this.targetKey = this.targets.find(entry => sameTarget(entry.target, effect.target))?.key ?? '';
      this.operation = effect.operation;
      this.value = effect.value;
    }
    if (effect.kind === 'stun') {
      this.area = effect.area;
      this.damage = effect.damage;
      this.stunConfirmed = true;
    }
  }

  setFatigue(level: FatigueLevel | ''): void {
    if (!level || !fatigueLevels.includes(level) || this.fatigue.length > 1) return;
    const previous = this.fatigue[0];
    const next = createFatigue(level, previous?.id ?? uuid(), previous?.active ?? true);
    this.effectsChange.emit(previous
      ? this.effects.map(effect => effect === previous ? next : effect)
      : [...this.effects, next]);
  }

  toggle(effect: CharacterEffect): void {
    if (this.editing === effect) this.cancel();
    this.effectsChange.emit(this.effects.map(entry => entry === effect ? { ...entry, active: !entry.active } : entry));
  }

  remove(effect: CharacterEffect): void {
    if (this.editing === effect) this.cancel();
    this.effectsChange.emit(this.effects.filter(entry => entry !== effect));
  }

  hasConflict(effect: CharacterEffect): boolean {
    if (!effect.active) return false;
    if (effect.kind === 'fatigue') return this.fatigue.filter(entry => entry.active).length > 1;
    if (effect.kind !== 'modifier') return false;
    const target = effect.target;
    if (target.kind === 'attribute' && this.character && attributeEffectConflict(this.character, target.key)) return true;
    const affected = target.kind === 'skill' ? this.skills.find(skill => sameTarget(skillTarget(skill), target)) : undefined;
    return this.effects.some(entry => entry !== effect && entry.active && entry.kind === 'modifier' &&
      (sameTarget(entry.target, target) ||
        (entry.target.kind === 'characteristic' && !!affected?.base.includes(entry.target.key))));
  }
}
