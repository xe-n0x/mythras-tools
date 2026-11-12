import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RollCheckContext, RollRecord } from '../../model/roll-record';
import { diceSides, formatPercentile, parseDiceExpression, rollDice, RollOrigin } from '../../services/dice';
import { rollSkillCheck } from '../../services/skill-check';
import { sheetRu } from '../../services/sheet-labels';

@Component({
  standalone: true,
  selector: 'app-dice-roller',
  imports: [CommonModule, FormsModule],
  templateUrl: './dice-roller.component.html',
  styleUrls: ['./dice-roller.component.scss'],
})
export class DiceRollerComponent {
  @Input() check?: RollCheckContext;
  @Input() animate = true;
  @Output() animateChange = new EventEmitter<boolean>();
  @Output() rolled = new EventEmitter<RollRecord>();

  readonly sidesList = diceSides;
  readonly ru = sheetRu;
  origin: RollOrigin = 'virtual';
  sides = 6;
  count: number | null = 1;
  modifier: number | null = 0;
  customExpression = '';
  manual = '';
  error = '';
  result?: RollRecord;
  private rolling = false;

  get percentile(): string | undefined {
    const dice = this.result?.dice;
    return dice?.dice.length === 1 && dice.dice[0].sides === 100 && dice.dice[0].sign === 1 && dice.modifier === 0
      ? formatPercentile(dice.dice[0].value) : undefined;
  }

  get breakdown(): string {
    const dice = this.result?.dice;
    if (!dice) return '';
    const faces = dice.dice.map((die, index) => {
      const sign = die.sign < 0 ? '−' : index > 0 ? '+' : '';
      return (index > 0 ? sign + ' ' : sign) + (die.sides === 100 ? formatPercentile(die.value) + (die.value === 100 ? ' (100)' : '') : die.value);
    }).join(' ');
    return faces + (dice.modifier > 0 ? ' + ' + dice.modifier : dice.modifier < 0 ? ' − ' + Math.abs(dice.modifier) : '');
  }

  submit(): void {
    if (this.rolling || this.result || this.check?.target === null) return;
    this.rolling = true;
    this.error = '';
    try {
      const manual = this.origin === 'manual' ? this.manual : undefined;
      const result = this.check ? rollSkillCheck(this.check, manual) : this.freeRoll(manual);
      if (!result) {
        if (!this.error) this.error = this.check
          ? 'Enter one percentile value from 01 to 99, or 00 for 100.'
          : 'Enter one valid face for each die, in order, separated by commas or spaces.';
        return;
      }
      this.result = result;
      this.rolled.emit(result);
    } catch {
      this.error = 'The browser could not roll the dice. You can enter a physical roll.';
    } finally {
      this.rolling = false;
    }
  }

  private freeRoll(manual?: string): RollRecord | undefined {
    const modifier = this.modifier ?? 0;
    const text = this.customExpression.trim() ||
      (this.count ?? '') + 'd' + this.sides + (modifier > 0 ? '+' + modifier : modifier < 0 ? String(modifier) : '');
    const expression = parseDiceExpression(text);
    if (!expression || (!this.customExpression.trim() && this.count === null)) {
      this.error = 'Enter a dice expression such as 2d6+3, with 1–50 dice and modifiers up to ±10000.';
      return undefined;
    }
    const dice = rollDice(expression, manual);
    return dice ? { dice } : undefined;
  }

  newRoll(): void {
    this.result = undefined;
    this.manual = '';
    this.error = '';
  }
}
