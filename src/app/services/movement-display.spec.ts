import { formatMeasurement, groundDistance, jumpDistance, runningJumpDistance, swimDistance } from './movement-display';

describe('Movement distances on the character sheet', () => {
  it('uses half the height for a vertical jump and twice the height for a horizontal jump', () => {
    expect(runningJumpDistance(180, 39, 'vertical')).toBe(1);
    expect(runningJumpDistance(1.8, 40, 'vertical')).toBe(1);
    expect(runningJumpDistance(180, 39, 'horizontal')).toBe(4);
  });

  it('rounds final distances and preserves an unknown distance', () => {
    const distance = runningJumpDistance(200, 280, 'vertical');
    expect(distance).toBe(3);
    expect(formatMeasurement(distance)).toBe('3');
    expect(groundDistance(6, 25, 3)).toBe(19);
    expect(groundDistance(6, 25, 5)).toBe(32);
    expect(swimDistance(6.5, 40)).toBe(8);
    expect(formatMeasurement(runningJumpDistance(0, 80, 'vertical'))).toBe('—');
    expect(formatMeasurement(6 * 5)).toBe('30');
  });

  it('updates with height and full Athletics bands, and ignores the band when standing', () => {
    const running = { runUp: true, armourPenalty: 0 };
    expect(jumpDistance(180, 30, 'horizontal', running)).toBe(jumpDistance(180, 39, 'horizontal', running));
    expect(jumpDistance(180, 40, 'horizontal', running)).toBe(5);
    expect(jumpDistance(200, 40, 'horizontal', running)).toBeCloseTo(6);
    expect(jumpDistance(200, 40, 'vertical', running)).toBe(1);
    expect(jumpDistance(180, 80, 'horizontal', { ...running, runUp: false })).toBe(1);
    expect(jumpDistance(180, 80, 'vertical', { ...running, runUp: false })).toBe(0);
  });

  it('applies half the armour penalty, a supplied step minimum, and the critical bonus', () => {
    const armoured = { runUp: true, armourPenalty: 2, normalStep: 0.6 };
    expect(jumpDistance(180, 40, 'horizontal', armoured)).toBe(4);
    expect(jumpDistance(180, 40, 'vertical', armoured)).toBe(0);
    expect(jumpDistance(180, 40, 'vertical', { ...armoured, normalStep: 0.4 })).toBe(0);
    expect(jumpDistance(180, 40, 'vertical', { ...armoured, critical: true })).toBe(1);
    expect(jumpDistance(180, 40, 'vertical', { ...armoured, normalStep: undefined })).toBe('');
  });
});
