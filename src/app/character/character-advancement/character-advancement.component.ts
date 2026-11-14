import { DismissOnBackdropDirective } from '../../directives/dismiss-on-backdrop.directive';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Character } from 'src/app/model/character';
import { characteristicKeys, CharacteristicKey } from 'src/app/model/character-effect';
import { AdvancementAction, advancementRoll, advancementSkill, advancementSkills, applyAdvancement, experienceBalance,
  trainingExpression, trainingPrice, trainingShift } from 'src/app/services/character-advancement';
import { getSkillTotal } from 'src/app/services/character-service.service';
import { withEffectiveCharacteristics } from 'src/app/services/characteristics';
import { getHitLocations, getMaximumHp } from 'src/app/services/hit-points';
import { initiativeWithArmour, magicPointMaximum, resolveSessionSkill, sessionValue } from 'src/app/services/session-values';
import { sheetRu } from 'src/app/services/sheet-labels';

interface PreviewRow { label: string; before: string | number; after: string | number; change: string; }
type Mode = 'experience' | 'training' | 'manual';

@Component({
  selector: 'app-character-advancement',
  standalone: true,
  imports: [CommonModule, FormsModule, DismissOnBackdropDirective],
  templateUrl: './character-advancement.component.html',
  styleUrls: ['./character-advancement.component.scss'],
})
export class CharacterAdvancementComponent {
  @Input() character!: Character;
  @Output() applyDraft = new EventEmitter<{ actions: AdvancementAction[]; baseline: string; descriptions: string[]; dialog: HTMLDialogElement }>();
  @Output() opened = new EventEmitter<void>();
  @Input() saveError = '';
  readonly ru = sheetRu;
  readonly keys = characteristicKeys;
  readonly balance = experienceBalance;
  readonly price = trainingPrice;
  readonly modes: { key: Mode; label: string }[] = [
    { key: 'experience', label: 'Опыт' }, { key: 'training', label: 'Тренировка' }, { key: 'manual', label: 'Ручные изменения' },
  ];
  mode: Mode = 'experience';
  experienceKind = 'experience';
  manualKind = 'skill';
  skillIndex: number | null = null;
  passionIndex: number | null = null;
  stat: CharacteristicKey = 'str';
  value: number | null = null;
  maximum: number | null = null;
  minimum: number | null = null;
  mentorSkill: number | null = null;
  teach: number | null = null;
  modifier: number | null = 0;
  mentor = '';
  period = '';
  terms = '';
  manualD100 = '';
  manualD4 = '';
  manualTeach = '';
  manualTraining = '';
  resolvedTeach?: number;
  confirmed = false;
  reducePassion = false;
  tradition: Extract<AdvancementAction, { kind: 'magic' }>['tradition'] = 'folk';
  magicDescription = '';
  actions: AdvancementAction[] = [];
  descriptions: string[] = [];
  rows: PreviewRow[] = [];
  projected?: Character;
  baseline = '';
  error = '';
  reviewing = false;

  open(dialog: HTMLDialogElement): void {
    this.discard();
    this.baseline = JSON.stringify(this.character);
    this.resetInput();
    this.opened.emit();
    dialog.showModal();
  }

  get draft(): Character { return this.projected ?? this.character; }
  get options() { return advancementSkills(this.draft); }
  skillLabel(index: number): string {
    const entries = this.options;
    const entry = entries[index];
    const label = this.ru(entry.skill.name);
    const matching = entries.filter(option => option.learned === entry.learned && this.ru(option.skill.name) === label);
    return matching.length === 1 ? label : label + ' · ' + (matching.findIndex(option => option.skill === entry.skill) + 1);
  }
  get selected() {
    const entry = this.skillIndex === null ? undefined : this.options[this.skillIndex];
    return entry && entry.learned === (this.experienceKind !== 'learn' || this.mode !== 'experience') ? entry : undefined;
  }
  get training() { return this.draft.advancement?.training; }
  get trainingSkill() { return this.training ? advancementSkill(this.draft, this.training.skill) : undefined; }
  get currentTrainingExpression(): string | undefined {
    if (!this.training || !this.trainingSkill) return;
    const shift = this.training.teach === undefined ? 0 : trainingShift(this.training.teach, this.resolvedTeach ?? 0);
    return shift === undefined ? undefined : trainingExpression(this.training.mentorSkill - getSkillTotal(this.draft, this.trainingSkill), shift);
  }
  get trainingCost(): number | undefined {
    return this.mentorSkill === null || this.mentorSkill < 0 || (this.teach ?? 0) < 0
      ? undefined : trainingPrice(this.mentorSkill, this.teach ?? 0);
  }
  get trainingDie(): string | undefined {
    if (this.mentorSkill === null || !this.selected) return;
    return trainingExpression(this.mentorSkill - getSkillTotal(this.draft, this.selected.skill));
  }

  resetInput(): void {
    this.error = '';
    this.skillIndex = null;
    this.passionIndex = null;
    this.value = null;
    this.confirmed = false;
    this.manualD100 = '';
    this.manualD4 = '';
    this.manualTeach = '';
    this.manualTraining = '';
    this.resolvedTeach = undefined;
  }

  add(action: AdvancementAction, description: string): void {
    try {
      this.refresh([...this.actions, action], [...this.descriptions, description]);
      this.confirmed = false;
    } catch (error) {
      this.error = (error as Error).message;
    }
  }

  remove(index: number): void {
    try {
      this.refresh(this.actions.filter((_, i) => i !== index), this.descriptions.filter((_, i) => i !== index));
    } catch (error) {
      this.error = 'Операция нужна следующему шагу. Сначала уберите зависящий от неё шаг.';
    }
  }

  discard(): void {
    this.actions = [];
    this.descriptions = [];
    this.projected = undefined;
    this.rows = [];
    this.error = '';
    this.reviewing = false;
    this.confirmed = false;
  }

  private refresh(actions: AdvancementAction[], descriptions: string[]): void {
    const projected = actions.length ? applyAdvancement(this.character, actions) : undefined;
    this.rows = projected ? this.differences(projected) : [];
    this.actions = actions;
    this.descriptions = descriptions;
    this.projected = projected;
    this.skillIndex = null;
    this.error = '';
  }

  private differences(projected: Character): PreviewRow[] {
    const original = this.character;
    const rows: PreviewRow[] = [];
    const compare = (label: string, before: number | string, after: number | string) => {
      if (before === after) return;
      const difference = typeof before === 'number' && typeof after === 'number' ? after - before : 0;
      rows.push({ label, before, after, change: difference ? (difference > 0 ? '+' : '') + Number(difference.toFixed(4)) : '' });
    };
    compare('Experience Rolls', experienceBalance(original), experienceBalance(projected));
    const originalEffective = withEffectiveCharacteristics(original);
    const projectedEffective = withEffectiveCharacteristics(projected);
    for (const key of this.keys) {
      compare(key.toUpperCase(), original.skills[key] ?? '—', projected.skills[key] ?? '—');
      if (originalEffective.skills[key] !== original.skills[key] || projectedEffective.skills[key] !== projected.skills[key])
        compare(key.toUpperCase() + ' · действующее', originalEffective.skills[key], projectedEffective.skills[key]);
    }
    for (const { address, skill, learned } of advancementSkills(original)) {
      const next = advancementSkill(projected, address);
      if (!next || (!learned && !next.force)) continue;
      compare(this.ru(skill.name), getSkillTotal(original, skill), getSkillTotal(projected, next));
      const before = resolveSessionSkill(original, skill);
      const after = resolveSessionSkill(projected, next);
      if (before.original !== before.effective || after.original !== after.effective) {
        compare(this.ru(skill.name) + ' · действующее', before.effective, after.effective);
      }
    }
    for (const [index, passion] of original.passions.entries()) {
      if (passion?.passion) compare(passion.passion, passion.modifierNumber ?? '—', projected.passions[index]?.modifierNumber ?? '—');
    }
    for (const attribute of ['ap', 'damage', 'expMod', 'healing', 'luck'] as const) {
      compare(this.ru(original.skills[attribute].name), sessionValue(original, original.skills[attribute]), sessionValue(projected, projected.skills[attribute]));
    }
    compare('Инициатива с учётом брони', initiativeWithArmour(original), initiativeWithArmour(projected));
    compare('Максимум очков магии', magicPointMaximum(original), magicPointMaximum(projected));
    for (const { key, label } of getHitLocations(original)) {
      compare(this.ru(label) + ' · максимум ОЗ', getMaximumHp(originalEffective, key), getMaximumHp(projectedEffective, key));
    }
    return rows;
  }

  addManual(): void {
    if (this.value === null || !this.confirmed) return;
    if (this.manualKind === 'stat') this.add({ kind:'manualStat', key:this.stat, value:this.value }, 'Ручная правка · ' + this.stat.toUpperCase());
    else if (this.selected) this.add({ kind:'manualSkill', skill:this.selected.address, value:this.value }, 'Ручная правка · ' + this.ru(this.selected.skill.name));
  }

  addExperience(): void {
    const selected = this.selected;
    const number = this.value ?? NaN;
    switch (this.experienceKind) {
      case 'award':
        this.add({ kind:'award', rolls:number, modifier:this.modifier ?? 0 }, 'Награда ведущего · ' + (number + (this.modifier ?? 0)) + ' ER до содержания');
        return;
      case 'experience':
      case 'passion': {
        const passion = this.passionIndex === null ? undefined : this.draft.passions[this.passionIndex];
        const score = this.experienceKind === 'experience' ? selected && getSkillTotal(this.draft, selected.skill) : passion?.modifierNumber;
        if (!Number.isFinite(score) || !Number.isFinite(Number(this.draft.skills.int)) || experienceBalance(this.draft) < 1) {
          this.error = 'Нужны записанные постоянные значения, INT и 1 Experience Roll.';
          return;
        }
        const d100 = advancementRoll('d100', this.manualD100);
        const needsD4 = d100 !== undefined && d100 + Number(this.draft.skills.int) >= score!;
        const d4 = needsD4 ? advancementRoll('d4', this.manualD4) : undefined;
        if (d100 === undefined || needsD4 && d4 === undefined) { this.error = 'Неверный результат кубика.'; return; }
        const dice = ' · d100 ' + d100 + (d4 === undefined ? '' : ', d4 ' + d4) + ' · 1 ER';
        if (this.experienceKind === 'experience' && selected) {
          this.add({ kind:'experience', skill:selected.address, d100, d4 }, 'Опыт · ' + this.ru(selected.skill.name) + dice);
        } else if (passion && this.passionIndex !== null) {
          this.add({ kind:'passion', index:this.passionIndex, d100, d4, reduce:this.reducePassion }, 'Опыт · ' + passion.passion + dice);
        }
        return;
      }
      case 'fumble':
        if (selected && this.confirmed) this.add({ kind:'fumble', skill:selected.address }, 'Критический провал · ' + this.ru(selected.skill.name) + ' · 0 ER');
        return;
      case 'learn':
        if (selected && this.confirmed) this.add({ kind:'learn', skill:selected.address, source:this.mentor, month:this.period }, 'Изучение · ' + this.ru(selected.skill.name) + ' · 3 ER · ' + this.mentor + ' · ' + this.period);
        return;
      case 'regime':
        if (this.confirmed) this.add({ kind:'regime', key:this.stat, steps:number, maximum:this.maximum ?? NaN }, 'Режим тренировки · ' + this.stat.toUpperCase() + ' · ступеней: ' + number);
        return;
      case 'permanent':
        if (this.confirmed) this.add({ kind:'permanent', key:this.stat, minimum:this.minimum ?? NaN, maximum:this.maximum ?? NaN }, 'Опциональное развитие · ' + this.stat.toUpperCase());
        return;
      case 'magic':
        if (this.confirmed) this.add({ kind:'magic', tradition:this.tradition, name:this.mentor, description:this.magicDescription, rolls:number, study:this.period }, 'Изучение магии · ' + this.mentor + ' · ' + number + ' ER · ' + this.period);
    }
  }

  startTraining(): void {
    if (!this.selected || !this.confirmed) return;
    const skill = this.selected;
    this.add({ kind:'startTraining', training:{ skill:skill.address, mentor:this.mentor, mentorSkill:this.mentorSkill ?? NaN,
      teach:this.teach ?? undefined, period:this.period, terms:this.terms } }, 'Начало тренировки · ' + this.ru(skill.skill.name) +
      ' · ' + this.mentor + ' · ' + this.period + ' · ' + this.terms);
  }

  finishTraining(): void {
    if (!this.training || !this.trainingSkill || !this.confirmed) return;
    const teachRoll = this.resolvedTeach;
    const expression = this.currentTrainingExpression;
    const baseDie = expression?.match(/^d\d+/)?.[0];
    const die = baseDie ? advancementRoll(baseDie, this.manualTraining) : undefined;
    if (!expression || baseDie && die === undefined) { this.error = 'Проверьте броски Teach и прироста.'; return; }
    const result = expression === '0' ? 0 : advancementRoll(expression, String(die));
    this.add({ kind:'finishTraining', week:this.period, teachRoll, die }, 'Тренировка · ' + this.ru(this.trainingSkill.name) +
      ' · ' + this.period + ' · ' + expression + ' → ' + result + (teachRoll === undefined ? '' : ' · Teach d100 ' + teachRoll));
  }

  resolveTeach(): void {
    const roll = advancementRoll('d100', this.manualTeach);
    if (roll === undefined) {
      this.error = 'Введите допустимый результат Teach на d100.';
      return;
    }
    this.error = '';
    this.resolvedTeach = roll;
  }

  submit(dialog: HTMLDialogElement): void {
    this.applyDraft.emit({ actions:this.actions, baseline:this.baseline, descriptions:this.descriptions, dialog });
  }
}
