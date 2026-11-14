import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Character, LocationInjury, LocationInjuryCondition } from 'src/app/model/character';
import { CharacterEffect } from 'src/app/model/character-effect';
import { Skill } from 'src/app/model/skill';
import { CharacterEffectsComponent } from '../character-effects/character-effects.component';
import { sheetRu } from 'src/app/services/sheet-labels';
import { WoundSeverity } from 'src/app/services/hit-points';
import { CommittedNumberComponent } from '../committed-number/committed-number.component';

export interface HealthLocation {
  key: string;
  label: string;
  range?: string;
  current: number | string;
  maximum: number | '';
  armour: number | string;
  severity?: WoundSeverity;
  injury?: LocationInjury;
}

const anatomy = [
  { key: 'head', x: 78, y: 12, line: '159,52 185,52 233,53', path: 'M128 29 C134 14 166 14 172 29 C177 41 174 60 169 69 L163 76 L163 89 Q150 98 137 89 L137 76 L131 69 C126 59 123 42 128 29Z' },
  { key: 'chest', x: 18, y: 26, line: '132,116 106,116 54,114', path: 'M137 89 Q150 98 163 89 C170 96 181 98 195 102 C198 111 199 122 196 136 L184 157 Q150 172 116 157 L104 136 Q99 112 105 102 C119 98 130 96 137 89Z' },
  { key: 'abdoment', x: 82, y: 42, line: '173,182 193,182 245,185', path: 'M116 157 Q150 172 184 157 C180 175 184 187 190 202 L188 220 Q168 218 150 233 Q132 218 112 220 L110 202 C116 187 120 175 116 157Z' },
  { key: 'rightArm', x: 15, y: 53, line: '78,219 66,233 46,233', path: 'M105 102 C91 103 82 115 81 132 L76 164 L65 195 L57 224 L46 242 L43 260 Q44 266 49 261 L54 250 L53 268 Q57 272 60 264 L65 252 L66 264 Q70 265 73 256 L79 234 L83 213 L97 180 L104 151 L112 145 L104 136 C101 122 102 111 105 102Z' },
  { key: 'leftArm', x: 85, y: 57, line: '222,226 236,250 255,250', path: 'M195 102 C209 103 218 115 219 132 L224 164 L235 195 L243 224 L254 242 L257 260 Q256 266 251 261 L246 250 L247 268 Q243 272 240 264 L235 252 L234 264 Q230 265 227 256 L221 234 L217 213 L203 180 L196 151 L188 145 L196 136 C199 122 198 111 195 102Z' },
  { key: 'rightLeg', x: 18, y: 80, line: '122,328 101,350 54,352', path: 'M112 220 Q132 218 150 233 L143 268 L138 300 L139 317 Q140 336 133 359 L125 402 L126 415 L123 424 L89 424 Q82 421 89 416 L106 405 L110 384 L110 356 Q104 334 111 313 L106 282 Q100 247 112 220Z' },
  { key: 'leftLeg', x: 82, y: 80, line: '178,328 199,350 246,352', path: 'M188 220 Q168 218 150 233 L157 268 L162 300 L161 317 Q160 336 167 359 L175 402 L174 415 L177 424 L211 424 Q218 421 211 416 L194 405 L190 384 L190 356 Q196 334 189 313 L194 282 Q200 247 188 220Z' },
] as const;

@Component({
  standalone: true,
  imports: [CommonModule, CommittedNumberComponent, CharacterEffectsComponent],
  selector: 'app-character-health',
  templateUrl: './character-health.component.html',
  styleUrls: ['./character-health.component.scss'],
})
export class CharacterHealthComponent {
  readonly ru = sheetRu;
  @Input() locations: HealthLocation[] = [];
  @Input() humanoid = false;
  @Input() effects: CharacterEffect[] = [];
  @Input() skills: Skill[] = [];
  @Input() character?: Character;
  @Output() effectsChange = new EventEmitter<CharacterEffect[]>();
  @Output() inspectHp = new EventEmitter<string>();
  @Output() hpChange = new EventEmitter<{ key: string; value: number | '' }>();
  @Output() hpAdjustment = new EventEmitter<{ key: string; amount: number; operation: 'damage' | 'healing'; confirmed: boolean }>();
  @Output() restoreHp = new EventEmitter<{ key: string; confirmed: boolean }>();
  @Output() injuryChange = new EventEmitter<{ key: string; injury: LocationInjury }>();
  readonly anatomy = anatomy;
  readonly woundLabels: Record<WoundSeverity, string> = {
    unknown: 'Unknown HP', healthy: 'Healthy', minor: 'Minor wound', serious: 'Serious wound', major: 'Major wound',
  };
  readonly injuryConditions: ReadonlyArray<{ key: LocationInjuryCondition; label: string }> = [
    { key: 'impaling', label: 'Пронзение' },
    { key: 'crushing', label: 'Дробление' },
    { key: 'dismemberment', label: 'Отсечение' },
  ];
  showMobileBody = false;
  selectedKey = 'chest';
  hoveredKey = '';
  hpAmount = 1;
  get adjustmentAvailable(): boolean {
    const current = this.selected?.current;
    return current !== undefined && String(current).trim() !== '' && Number.isSafeInteger(Number(current));
  }

  get validAdjustment(): boolean {
    return Number.isSafeInteger(this.hpAmount) && this.hpAmount > 0;
  }

  adjust(location: HealthLocation, operation: 'damage' | 'healing'): void {
    if (!this.adjustmentAvailable || !this.validAdjustment) return;
    const confirmed = operation === 'healing' && (location.severity === 'major' || !!location.injury);
    if (confirmed && !window.confirm('Подтвердите, что лечение допустимо. Запись о травме и её предел ОЗ сохранятся.')) return;
    this.hpAdjustment.emit({ key: location.key, amount: this.hpAmount, operation, confirmed });
  }

  get selected(): HealthLocation | undefined {
    return this.locations.find(location => location.key === this.selectedKey) ?? this.locations[0];
  }

  trackLocation(_index: number, location: HealthLocation): string {
    return location.key;
  }

  location(key: string): HealthLocation | undefined {
    return this.locations.find(location => location.key === key);
  }

  localEffectNames(key: string): string {
    return this.effects.filter(effect => effect.active && effect.location === key).map(effect => this.ru(effect.name)).join(', ');
  }

  edit(location: HealthLocation, value: number | ''): void {
    this.hpChange.emit({ key: location.key, value });
  }

  restore(location: HealthLocation): void {
    const needsConfirmation = location.severity === 'major' || !!location.injury;
    if (needsConfirmation) {
      if (!window.confirm('Подтвердите, что восстановление допустимо при этом ранении. Запись о травме и её предел ОЗ сохранятся.')) return;
    }
    this.restoreHp.emit({ key: location.key, confirmed: needsConfirmation });
  }

  hasCondition(location: HealthLocation, condition: LocationInjuryCondition): boolean {
    const conditions = location.injury?.conditions;
    return Array.isArray(conditions) && conditions.includes(condition);
  }

  conditionNames(location: HealthLocation): string {
    return this.injuryConditions.filter(({ key }) => this.hasCondition(location, key)).map(({ label }) => label).join(', ');
  }

  recordCondition(location: HealthLocation, condition: LocationInjuryCondition, checked: boolean): void {
    const existing = location.injury?.conditions;
    const conditions = new Set(Array.isArray(existing) ? existing : []);
    if (checked) conditions.add(condition);
    else conditions.delete(condition);
    this.injuryChange.emit({ key: location.key, injury: { ...location.injury, conditions: [...conditions] } });
  }

  recordNote(location: HealthLocation, note: string): void {
    this.injuryChange.emit({ key: location.key, injury: { ...location.injury, note } });
  }

  recordMaximum(location: HealthLocation, input: HTMLInputElement): void {
    const value = input.valueAsNumber;
    if (input.validity.badInput || (input.value !== '' && (!Number.isSafeInteger(value) || value < 1))) {
      input.value = location.injury?.maximumHp?.toString() ?? '';
      return;
    }
    this.injuryChange.emit({
      key: location.key,
      injury: { ...location.injury, maximumHp: input.value === '' ? undefined : value },
    });
  }
}
