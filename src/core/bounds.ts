import type { Bounds } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture } from '../types/furniture';
import { furnitureBounds } from './furnitureGeometry';

const EMPTY_PLAN_MARGIN_MM = 500;

/** 벽·가구를 모두 포함하는 mm 경계 상자를 계산한다. 아무 객체도 없으면 null. */
export function computePlanBounds(walls: Wall[], furniture: Furniture[]): Bounds | null {
  if (walls.length === 0 && furniture.length === 0) return null;

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

  for (const item of furniture) {
    const b = furnitureBounds(item);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }

  return {
    minX: minX - EMPTY_PLAN_MARGIN_MM,
    minY: minY - EMPTY_PLAN_MARGIN_MM,
    maxX: maxX + EMPTY_PLAN_MARGIN_MM,
    maxY: maxY + EMPTY_PLAN_MARGIN_MM,
  };
}
