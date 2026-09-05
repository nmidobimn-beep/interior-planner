/** 화면에 보여줄 길이 단위. 내부 저장은 항상 mm — 이 값은 표시/입력 변환에만 쓰인다. */
export type DisplayUnit = 'mm' | 'cm' | 'm';

export const DISPLAY_UNITS: readonly DisplayUnit[] = ['mm', 'cm', 'm'];

const UNIT_FACTOR_MM: Record<DisplayUnit, number> = { mm: 1, cm: 10, m: 1000 };
/** 단위별로 mm 단위 정밀도를 눈으로 확인할 수 있을 정도의 소수 자리수 */
const UNIT_DECIMALS: Record<DisplayUnit, number> = { mm: 0, cm: 1, m: 2 };

export function mmToDisplay(mm: number, unit: DisplayUnit): number {
  const factor = 10 ** UNIT_DECIMALS[unit];
  return Math.round((mm / UNIT_FACTOR_MM[unit]) * factor) / factor;
}

export function displayToMm(value: number, unit: DisplayUnit): number {
  return Math.round(value * UNIT_FACTOR_MM[unit]);
}

export function displayStep(unit: DisplayUnit): number {
  return 1 / 10 ** UNIT_DECIMALS[unit];
}

export function formatLengthMm(mm: number, unit: DisplayUnit): string {
  return `${mmToDisplay(mm, unit)}${unit}`;
}

/** 표시 단위를 mm → cm → m → mm 순으로 한 단계 돌린다 (툴바의 단위 전환 버튼용). */
export function nextDisplayUnit(unit: DisplayUnit): DisplayUnit {
  const index = DISPLAY_UNITS.indexOf(unit);
  return DISPLAY_UNITS[(index + 1) % DISPLAY_UNITS.length];
}
