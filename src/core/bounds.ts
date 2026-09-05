import type { Bounds } from '../types/geometry';
import type { Wall } from '../types/wall';

const EMPTY_PLAN_MARGIN_MM = 500;

/** 벽들의 mm 경계 상자를 계산한다. 벽이 하나도 없으면 null. */
export function computeWallsBounds(walls: Wall[]): Bounds | null {
  if (walls.length === 0) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const wall of walls) {
    const half = wall.thicknessMm / 2;
    for (const point of [wall.start, wall.end]) {
      minX = Math.min(minX, point.x - half);
      minY = Math.min(minY, point.y - half);
      maxX = Math.max(maxX, point.x + half);
      maxY = Math.max(maxY, point.y + half);
    }
  }

  return {
    minX: minX - EMPTY_PLAN_MARGIN_MM,
    minY: minY - EMPTY_PLAN_MARGIN_MM,
    maxX: maxX + EMPTY_PLAN_MARGIN_MM,
    maxY: maxY + EMPTY_PLAN_MARGIN_MM,
  };
}
