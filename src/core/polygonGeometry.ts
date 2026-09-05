import type { Bounds, Point } from '../types/geometry';
import type { Polygon } from '../types/polygon';
import { distance, distanceToSegment } from './wallGeometry';

/** 다각형의 mm 기준 경계 상자. */
export function polygonBounds(polygon: Pick<Polygon, 'points'>): Bounds {
  const xs = polygon.points.map((p) => p.x);
  const ys = polygon.points.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

/** 다각형의 중심(꼭짓점 평균) — 회전 기준점으로 쓴다. */
export function polygonCentroid(polygon: Pick<Polygon, 'points'>): Point {
  const n = polygon.points.length || 1;
  const sum = polygon.points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / n, y: sum.y / n };
}

/** 다각형을 이동/스냅할 때 함께 검사할 주요 기준점 — 모든 꼭짓점 + 각 변의 중간점 + 중심. */
export function polygonKeyPoints(polygon: Pick<Polygon, 'points'>): Point[] {
  const points = polygon.points;
  const mids: Point[] = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    mids.push({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  }
  return [...points, ...mids, polygonCentroid(polygon)];
}

function pointInPolygon(point: Point, points: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const a = points[i];
    const b = points[j];
    const intersects = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

/** point(mm)가 다각형 내부에 있거나(꽉 채워진 도형으로 간주) 테두리 근처(toleranceMm)에 있는지 검사한다. */
export function isPointNearPolygon(point: Point, polygon: Pick<Polygon, 'points'>, toleranceMm: number): boolean {
  if (polygon.points.length < 3) return false;
  if (pointInPolygon(point, polygon.points)) return true;
  for (let i = 0; i < polygon.points.length; i++) {
    const a = polygon.points[i];
    const b = polygon.points[(i + 1) % polygon.points.length];
    if (distanceToSegment(point, a, b) <= toleranceMm) return true;
  }
  return false;
}

/** 여러 다각형 중 point(mm)를 포함(또는 테두리 근처)하는 것을 찾는다 (나중에 추가된 것을 위로 간주). */
export function hitTestPolygons(point: Point, polygons: Polygon[], toleranceMm: number): Polygon | null {
  for (let i = polygons.length - 1; i >= 0; i--) {
    if (isPointNearPolygon(point, polygons[i], toleranceMm)) return polygons[i];
  }
  return null;
}

/** 다각형 하나의 특정 꼭짓점이 point(mm) 근처(toleranceMm)에 있으면 그 인덱스를 반환한다. */
export function hitTestPolygonVertex(point: Point, polygon: Polygon, toleranceMm: number): number | null {
  for (let i = 0; i < polygon.points.length; i++) {
    if (distance(point, polygon.points[i]) <= toleranceMm) return i;
  }
  return null;
}
