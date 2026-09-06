import type { Bounds } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture } from '../types/furniture';
import type { Outlet } from '../types/outlet';
import type { Path } from '../types/path';
import type { TextLabel } from '../types/label';
import type { Polygon } from '../types/polygon';
import type { DimensionLine } from '../types/dimension';
import { furnitureBounds } from './furnitureGeometry';
import { computeDisplacedDimensionGeometry } from './dimensionGeometry';

const EMPTY_PLAN_MARGIN_MM = 500;

/**
 * 벽·가구·콘센트·동선·라벨·다각형·치수선을 모두 포함하는 mm 경계 상자를 계산한다.
 * 아무 객체도 없으면 null. 문/창문은 항상 벽 위에 있으므로 벽의 경계에 이미 포함된다.
 */
export function computePlanBounds(
  walls: Wall[],
  furniture: Furniture[],
  outlets: Outlet[] = [],
  paths: Path[] = [],
  labels: TextLabel[] = [],
  polygons: Polygon[] = [],
  dimensions: DimensionLine[] = [],
): Bounds | null {
  if (
    walls.length === 0 &&
    furniture.length === 0 &&
    outlets.length === 0 &&
    paths.length === 0 &&
    labels.length === 0 &&
    polygons.length === 0 &&
    dimensions.length === 0
  )
    return null;

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

  for (const outlet of outlets) {
    minX = Math.min(minX, outlet.x);
    minY = Math.min(minY, outlet.y);
    maxX = Math.max(maxX, outlet.x);
    maxY = Math.max(maxY, outlet.y);
  }

  for (const path of paths) {
    for (const point of [path.start, path.end]) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  for (const label of labels) {
    minX = Math.min(minX, label.x);
    minY = Math.min(minY, label.y);
    maxX = Math.max(maxX, label.x);
    maxY = Math.max(maxY, label.y);
  }

  for (const polygon of polygons) {
    for (const point of polygon.points) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  for (const dim of dimensions) {
    // 라벨과 함께 치수선이 옮겨져 있으면(labelOffset) 전체보기가 그 옮겨진 위치까지 포함해야 한다.
    const geo = computeDisplacedDimensionGeometry(dim);
    for (const point of [dim.start, dim.end, geo.lineStart, geo.lineEnd]) {
      minX = Math.min(minX, point.x);
      minY = Math.min(minY, point.y);
      maxX = Math.max(maxX, point.x);
      maxY = Math.max(maxY, point.y);
    }
  }

  return {
    minX: minX - EMPTY_PLAN_MARGIN_MM,
    minY: minY - EMPTY_PLAN_MARGIN_MM,
    maxX: maxX + EMPTY_PLAN_MARGIN_MM,
    maxY: maxY + EMPTY_PLAN_MARGIN_MM,
  };
}
