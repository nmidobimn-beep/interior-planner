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

/** 벽 전체를 이동할 때 스냅 후보로 함께 검사할 주요 기준점 — 시작점·끝점·중간점. */
export function wallKeyPoints(wall: Pick<Wall, 'start' | 'end'>): Point[] {
  return [wall.start, wall.end, { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 }];
}

export function wallDirectionUnit(wall: Pick<Wall, 'start' | 'end'>): Point {
  const len = wallLengthMm(wall) || 1;
  return { x: (wall.end.x - wall.start.x) / len, y: (wall.end.y - wall.start.y) / len };
}

export function wallPerpendicularUnit(wall: Pick<Wall, 'start' | 'end'>): Point {
  const dir = wallDirectionUnit(wall);
  return { x: -dir.y, y: dir.x };
}

/** point를 벽 중심선에 투영해, 시작점부터의 거리(offsetMm)와 중심선까지 수직 거리(perpDistanceMm)를 구한다. */
export function projectPointOntoWall(point: Point, wall: Pick<Wall, 'start' | 'end'>): { offsetMm: number; perpDistanceMm: number } {
  const dir = wallDirectionUnit(wall);
  const perp = wallPerpendicularUnit(wall);
  const rel = { x: point.x - wall.start.x, y: point.y - wall.start.y };
  return {
    offsetMm: rel.x * dir.x + rel.y * dir.y,
    perpDistanceMm: Math.abs(rel.x * perp.x + rel.y * perp.y),
  };
}

/** 두 무한 직선(각각 두 점으로 정의)의 교점을 구한다. 평행하면 null. */
export function lineIntersection(a1: Point, a2: Point, b1: Point, b2: Point): Point | null {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  const denom = d1x * d2y - d1y * d2x;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  return { x: a1.x + d1x * t, y: a1.y + d1y * t };
}

export interface WallTrimResult {
  start: Point;
  end: Point;
}

/**
 * TR(트림/익스텐드): baseWall을 기준으로 targetWall을 자르거나 늘린다. clickPoint에 더 가까운
 * targetWall의 끝점을 baseWall과의 교점으로 옮긴다.
 * - extend=false(트림): 교점이 targetWall 구간 안(0~1)에 실제로 있을 때만 적용.
 * - extend=true(익스텐드): 교점이 존재하기만 하면(평행이 아니면) 구간 밖이어도 적용.
 */
export function computeWallTrim(baseWall: Wall, targetWall: Wall, clickPoint: Point, extend: boolean): WallTrimResult | null {
  const p = lineIntersection(baseWall.start, baseWall.end, targetWall.start, targetWall.end);
  if (!p) return null;
  const length = wallLengthMm(targetWall);
  if (length === 0) return null;
  const t = projectPointOntoWall(p, targetWall).offsetMm / length;
  if (!extend && (t < 0 || t > 1)) return null;
  const nearEnd: WallEndpointKey = distance(clickPoint, targetWall.start) <= distance(clickPoint, targetWall.end) ? 'start' : 'end';
  return nearEnd === 'start' ? { start: p, end: targetWall.end } : { start: targetWall.start, end: p };
}

/** 문/창문을 새로 놓을 때: point(mm)가 어느 벽 위에 있는지, 있다면 그 벽 위 offset(mm)까지 함께 찾는다. */
export function findWallAtPoint(point: Point, walls: Wall[], toleranceMm: number): { wall: Wall; offsetMm: number } | null {
  let best: { wall: Wall; offsetMm: number } | null = null;
  let bestDistance = Infinity;

  for (const wall of walls) {
    const { offsetMm, perpDistanceMm } = projectPointOntoWall(point, wall);
    const length = wallLengthMm(wall);
    if (offsetMm < 0 || offsetMm > length) continue;
    const edgeDistance = perpDistanceMm - wall.thicknessMm / 2;
    if (edgeDistance <= toleranceMm && edgeDistance < bestDistance) {
      best = { wall, offsetMm };
      bestDistance = edgeDistance;
    }
  }

  return best;
}
