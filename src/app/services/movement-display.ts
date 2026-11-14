export function heightInMetres(height: number): number | '' {
  if (!Number.isFinite(height) || height <= 0) return '';
  // Older saves can store height in metres or centimetres.
  return height < 10 ? height : height / 100;
}

export interface JumpConditions {
  runUp: boolean;
  armourPenalty: number;
  normalStep?: number;
  critical?: boolean;
}

/** Core Rules, Jumping, p. 39. An unknown normal step prevents a final armoured distance. */
export function jumpDistance(height: number, athletics: number, direction: 'vertical' | 'horizontal', conditions: JumpConditions): number | '' {
  const metres = heightInMetres(height);
  if (metres === '') return '';
  const steps = conditions.runUp ? Math.max(0, Math.floor(athletics / 20)) : 0;
  const base = (direction === 'vertical' ? metres / 2 : metres * 2) * (conditions.runUp ? 1 : 0.5);
  const distance = base + steps * (direction === 'vertical' ? 0.2 : 1);
  const penalty = Math.max(0, conditions.armourPenalty);
  const normalStep = conditions.normalStep ?? 0;
  if (penalty > 0 && (!Number.isFinite(normalStep) || normalStep <= 0)) return '';
  const afterArmour = penalty > 0 ? Math.max(normalStep, distance - penalty / 2) : distance;
  return Math.floor(afterArmour + (conditions.critical ? 1 : 0));
}

export function runningJumpDistance(height: number, athletics: number, direction: 'vertical' | 'horizontal'): number | '' {
  return jumpDistance(height, athletics, direction, { runUp: true, armourPenalty: 0 });
}

/** Running (p. 39) and Swimming (p. 43), with Tennla rounding the final distance. */
export function groundDistance(movement: number, athletics: number, pace: 3 | 5): number {
  return Math.floor((movement + Math.floor(athletics / 25) * 0.5) * pace);
}

export function swimDistance(movement: number, swim: number): number {
  return Math.floor(movement + Math.floor(swim / 20));
}

const measurement = new Intl.NumberFormat('en', { useGrouping: false, maximumFractionDigits: 12 });

export function formatMeasurement(value: number | ''): string {
  return value !== '' && Number.isFinite(value) ? measurement.format(value) : '—';
}
