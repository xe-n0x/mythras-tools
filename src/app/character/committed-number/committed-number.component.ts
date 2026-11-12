import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

@Component({
  standalone: true,
  selector: 'app-committed-number',
  template: `
    <div class="number-editor">
      <button type="button" [attr.aria-label]="'Уменьшить: ' + label" (pointerdown)="$event.preventDefault()" (click)="step(input, -1)">−</button>
      <input #input type="text" inputmode="numeric" [attr.aria-label]="label" [placeholder]="placeholder"
        [value]="draft ?? value" [attr.aria-invalid]="invalid ? 'true' : null" [title]="invalid ? 'Введите целое число' : ''"
        (focus)="input.select()" (input)="write(input.value)" (blur)="commit()"
        (keydown.enter)="$event.preventDefault(); input.blur()" (keydown.escape)="$event.preventDefault(); cancel(input)" />
      <button type="button" [attr.aria-label]="'Увеличить: ' + label" [disabled]="atMaximum"
        (pointerdown)="$event.preventDefault()" (click)="step(input, 1)">+</button>
    </div>
  `,
  styles: [`
    :host { display:block; min-width:0; width:100%; }
    .number-editor { display:grid; grid-template-columns:1fr minmax(2.4em,1.4fr) 1fr; gap:2px; }
    input,button { box-sizing:border-box; min-width:0; min-height:34px; border:1px solid var(--number-border,#bfc3b7);
      border-radius:5px; background:var(--number-background,#fffdf8); color:var(--number-ink,#263029);
      font:700 16px Roboto,sans-serif; text-align:center; padding:0; }
    input { width:100%; }
    input::placeholder { opacity:.7; color:inherit; }
    button { cursor:pointer; }
    button:not(:disabled):hover { border-color:#b3761e; }
    button:disabled { opacity:.45; cursor:default; }
    input[aria-invalid=true] { border-color:#be4337; }
    :focus-visible { outline:2px solid #b3761e; outline-offset:1px; }
    @media(max-width:680px) { input,button { min-height:44px; } }
  `],
})
export class CommittedNumberComponent implements OnChanges {
  @Input() label = 'Value';
  @Input() value: number | string = '';
  @Input() placeholder = '—';
  @Input() maximum: number | '' = '';
  @Output() committed = new EventEmitter<number | ''>();
  draft: string | null = null;
  invalid = false;

  get atMaximum(): boolean {
    const number = this.parse((this.draft ?? String(this.value)).trim());
    return this.maximum !== '' && number !== undefined && number >= this.maximum;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['label']) {
      this.draft = null;
      this.invalid = false;
    }
  }

  write(value: string): void {
    this.draft = value;
    this.invalid = false;
  }

  commit(): void {
    if (this.draft === null) return;
    const raw = this.draft.trim();
    this.draft = null;
    if (!raw) this.committed.emit('');
    else {
      const number = this.parse(raw);
      this.invalid = number === undefined;
      if (number !== undefined) this.emit(number);
    }
  }

  step(input: HTMLInputElement, direction: number): void {
    const number = this.parse((this.draft ?? String(this.value)).trim()) ??
      this.parse(this.placeholder);
    this.draft = null;
    this.invalid = false;
    if (number !== undefined && Number.isSafeInteger(number + direction)) {
      this.emit(number + direction);
    }
    input.select();
  }

  cancel(input: HTMLInputElement): void {
    this.draft = null;
    this.invalid = false;
    input.blur();
  }

  private parse(raw: string): number | undefined {
    const number = Number(raw);
    return /^[+-]?\d+$/.test(raw) && Number.isSafeInteger(number) ? number : undefined;
  }

  private emit(value: number): void {
    this.committed.emit(this.maximum === '' ? value : Math.min(value, this.maximum));
  }
}
