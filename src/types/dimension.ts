import type { Point } from './geometry';

/**
 * 치수선(길이 제도선) — 두 점 사이의 거리를 도면 위에 표시하는 주석 객체.
 * mode에 따라 실제로 표시되는 값이 달라진다:
 * - 'straight': 두 점 사이의 직선 거리
 * - 'horizontal': 가로(x) 거리만 (세로 차이는 무시)
 * - 'vertical': 세로(y) 거리만 (가로 차이는 무시)
 * 표시용 치수선/보조선(연장선) 위치는 core/dimensionGeometry.ts에서 start/end/mode로부터
 * 계산한다(따로 저장하지 않음).
 */
export type DimensionMode = 'straight' | 'horizontal' | 'vertical';

export interface DimensionLine {
  id: string;
  start: Point;
  end: Point;
  mode: DimensionMode;
  memo?: string;
  layerId: string;
  /**
   * 숫자(거리) 라벨을 기본 위치에서 얼마나 옮겨뒀는지(mm, world 기준 상대 오프셋).
   * 없으면 {0,0} — 기본 위치(치수선 중점 등) 그대로. 치수 측정 대상인 start/end에는 전혀
   * 영향을 주지 않는다 — 라벨은 순수하게 "어디에 표시할지"만 담당한다.
   */
  labelOffset?: Point;
}
