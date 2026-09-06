import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Door, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import {
  distance,
  projectPointOntoWall,
  wallDirectionUnit,
  wallLengthMm,
  wallPerpendicularUnit,
} from './wallGeometry';

/** [offsetMm, offsetMm+widthMm] 구간이 벽 길이 안에 들어오도록 offset을 보정한다. */
export function clampOpeningOffset(offsetMm: number, widthMm: number, wallLength: number): number {
  const maxOffset = Math.max(0, wallLength - widthMm);
  return Math.min(maxOffset, Math.max(0, offsetMm));
}

/** 문/창문 구간의 중심선 시작·끝 world 좌표(mm). */
export function openingEndpoints(wall: Pick<Wall, 'start' | 'end'>, offsetMm: number, widthMm: number): { start: Point; end: Point } {
  const dir = wallDirectionUnit(wall);
  return {
    start: { x: wall.start.x + dir.x * offsetMm, y: wall.start.y + dir.y * offsetMm },
    end: { x: wall.start.x + dir.x * (offsetMm + widthMm), y: wall.start.y + dir.y * (offsetMm + widthMm) },
  };
}

/** 문/창문 구간을 벽 두께만큼 채운 사각형 4개 꼭짓점(mm). */
export function openingCorners(wall: Pick<Wall, 'thicknessMm'>, segStart: Point, segEnd: Point): [Point, Point, Point, Point] {
  const perp = wallPerpendicularUnit({ start: segStart, end: segEnd });
  const half = wall.thicknessMm / 2;
  const nx = perp.x * half;
  const ny = perp.y * half;
  return [
    { x: segStart.x + nx, y: segStart.y + ny },
    { x: segEnd.x + nx, y: segEnd.y + ny },
    { x: segEnd.x - nx, y: segEnd.y - ny },
    { x: segStart.x - nx, y: segStart.y - ny },
  ];
}

export interface DoorSwingGeometry {
  hinge: Point;
  /** 문이 닫혀 있을 때(벽을 따라) 반대쪽 끝점 */
  closedEnd: Point;
  /** 문이 90도 열렸을 때 리프(문짝) 끝점 */
  openEnd: Point;
  radius: number;
  /** ctx.arc에 바로 쓸 수 있는 라디안 각도 (closedEnd 방향 -> openEnd 방향) */
  startAngle: number;
  endAngle: number;
  anticlockwise: boolean;
}

/** 문의 경첩 위치, 열린 상태의 문짝, 스윙 호(arc) 각도를 계산한다. */
export function doorSwingGeometry(wall: Wall, door: Door): DoorSwingGeometry {
  const { start: segStart, end: segEnd } = openingEndpoints(wall, door.offsetMm, door.widthMm);
  const hinge = door.hingeSide === 'start' ? segStart : segEnd;
  const closedEnd = door.hingeSide === 'start' ? segEnd : segStart;

  const perp = wallPerpendicularUnit(wall);
  const sign = door.swingDirection === 'in' ? 1 : -1;
  const openEnd: Point = { x: hinge.x + perp.x * sign * door.widthMm, y: hinge.y + perp.y * sign * door.widthMm };

  const startAngle = Math.atan2(closedEnd.y - hinge.y, closedEnd.x - hinge.x);
  const endAngle = Math.atan2(openEnd.y - hinge.y, openEnd.x - hinge.x);

  // closedEnd·openEnd 사이 각도는 항상 정확히 90도지만, atan2 값은 (-π, π] 범위로 감겨
  // 있어서 hingeSide/swingDirection/벽 방향 조합에 따라 (endAngle - startAngle)의 raw
  // 차이가 +90도가 아니라 -270도(= +90도의 반대 방향으로 감은 값)로 나올 수 있다.
  // ctx.arc는 anticlockwise가 false면 항상 "각도가 증가하는 방향"으로 스윕하므로, 이때
  // anticlockwise를 그대로 false로 두면 90도가 아니라 270도짜리 호를 그리게 된다.
  // 실제 회전 방향(부호)을 정규화한 각도차로 판정해 항상 정확히 90도만 그리도록 한다.
  let diff = (endAngle - startAngle) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  const anticlockwise = diff < 0;

  return { hinge, closedEnd, openEnd, radius: door.widthMm, startAngle, endAngle, anticlockwise };
}

function findOpeningAtPoint<T extends { wallId: string; offsetMm: number; widthMm: number }>(
  point: Point,
  openings: T[],
  walls: Wall[],
  toleranceMm: number,
): T | null {
  let best: T | null = null;
  let bestDistance = Infinity;

  for (const opening of openings) {
    const wall = walls.find((w) => w.id === opening.wallId);
    if (!wall) continue;

    const { offsetMm, perpDistanceMm } = projectPointOntoWall(point, wall);
    if (offsetMm < opening.offsetMm || offsetMm > opening.offsetMm + opening.widthMm) continue;

    const edgeDistance = perpDistanceMm - wall.thicknessMm / 2;
    if (edgeDistance <= toleranceMm && edgeDistance < bestDistance) {
      best = opening;
      bestDistance = edgeDistance;
    }
  }

  return best;
}

export function hitTestDoors(point: Point, doors: Door[], walls: Wall[], toleranceMm: number): Door | null {
  return findOpeningAtPoint(point, doors, walls, toleranceMm);
}

export function hitTestWindows(point: Point, windows: WindowOpening[], walls: Wall[], toleranceMm: number): WindowOpening | null {
  return findOpeningAtPoint(point, windows, walls, toleranceMm);
}

export function hitTestOutlets(point: Point, outlets: Outlet[], toleranceMm: number): Outlet | null {
  let best: Outlet | null = null;
  let bestDistance = toleranceMm;
  for (const outlet of outlets) {
    const d = distance(point, outlet);
    if (d <= bestDistance) {
      best = outlet;
      bestDistance = d;
    }
  }
  return best;
}

/** 벽 길이가 바뀌었을 때도 문/창문이 벽 안에 들어오도록 다시 계산한다. */
export function reclampOffsetForWall(offsetMm: number, widthMm: number, wall: Wall): number {
  return clampOpeningOffset(offsetMm, widthMm, wallLengthMm(wall));
}
