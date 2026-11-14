/** Mythras Core Rules, Sorcery → Shaping, pp. 161–162 Tennla rounds down. */
export function shapingLimit(skill: number): number {
  return Math.max(0, Math.floor(skill / 10));
}
