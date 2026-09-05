import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';

export function wallLengthMm(wall: Pick<Wall, 'start' | 'end'>): number {
  return distance(wall.start, wall.end);
}

export function wallAngleRad(wall: Pick<Wall, 'start' | 'end'>): number {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
}

/** start와 각도는 그대로 두고, 길이만 newLengthMm으로 바꿨을 때의 새 end 좌표를 계산한다. */
export function endPointForLength(wall: Pick<Wall, 'start' | 'end'>, newLengthMm: number): Point {
  const angle = wallAngleRad(wall);
  return {
    x: wall.start.x + Math.cos(angle) * newLengthMm,
    y: wall.start.y + Math.sin(angle) * newLengthMm,
  };
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

/** 점(point)에서 선분(a-b)까지의 최단 거리 (mm). */
export function distanceToSegment(point: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lengthSq = dx * dx + dy * dy;

  if (lengthSq === 0) return distance(point, a);

  const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / lengthSq));
  const projected: Point = { x: a.x + t * dx, y: a.y + t * dy };
  return distance(point, projected);
}

/**
 * 두께가 있는 벽을 중심선 기준 좌우로 thicknessMm/2씩 오프셋한 사각형 4개 꼭짓점(mm)을 계산한다.
 * 순서: start쪽 좌, end쪽 좌, end쪽 우, start쪽 우 (사각형을 그대로 fill 가능).
 */
export function wallCorners(wall: Pick<Wall, 'start' | 'end' | 'thicknessMm'>): [Point, Point, Point, Point] {
  const angle = wallAngleRad(wall);
  const half = wall.thicknessMm / 2;
  const nx = -Math.sin(angle) * half;
  const ny = Math.cos(angle) * half;

  return [
    { x: wall.start.x + nx, y: wall.start.y + ny },
    { x: wall.end.x + nx, y: wall.end.y + ny },
    { x: wall.end.x - nx, y: wall.end.y - ny },
    { x: wall.start.x - nx, y: wall.start.y - ny },
  ];
}

/** 여러 벽 중 point(mm)에 가장 가까우면서 허용치(toleranceMm) 안에 있는 벽을 찾는다. */
export function hitTestWalls(point: Point, walls: Wall[], toleranceMm: number): Wall | null {
  let closest: Wall | null = null;
  let closestDistance = Infinity;

  for (const wall of walls) {
    const d = distanceToSegment(point, wall.start, wall.end) - wall.thicknessMm / 2;
    if (d <= toleranceMm && d < closestDistance) {
      closest = wall;
      closestDistance = d;
    }
  }

  return closest;
}

export type WallEndpointKey = 'start' | 'end';

/** point(mm)가 wall의 어느 끝점(start/end)의 허용치(toleranceMm) 안에 있는지 찾는다. */
export function hitTestWallEndpoint(point: Point, wall: Wall, toleranceMm: number): WallEndpointKey | null {
  if (distance(point, wall.start) <= toleranceMm) return 'start';
  if (distance(point, wall.end) <= toleranceMm) return 'end';
  return null;
}

/** 모든 벽의 끝점을 하나의 배열로 모은다 (스냅 후보 계산용). */
export function collectEndpoints(walls: Wall[], excludeWallId?: string): Point[] {
  const points: Point[] = [];
  for (const wall of walls) {
    if (wall.id === excludeWallId) continue;
    points.push(wall.start, wall.end);
  }
  return points;
}
