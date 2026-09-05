import type { Point } from '../types/geometry';
import type { TextLabel } from '../types/label';
import { distance } from './wallGeometry';

/** 라벨 텍스트는 화면 px 크기로 고정 표시되므로, 히트테스트도 화면 px 반경(→mm 환산)으로 검사한다. */
export function hitTestLabels(point: Point, labels: TextLabel[], toleranceMm: number): TextLabel | null {
  let closest: TextLabel | null = null;
  let closestDistance = toleranceMm;

  for (const label of labels) {
    const d = distance(point, label);
    if (d <= closestDistance) {
      closest = label;
      closestDistance = d;
    }
  }
  return closest;
}
