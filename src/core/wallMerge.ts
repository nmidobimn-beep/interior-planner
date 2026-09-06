import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Door, WindowOpening } from '../types/opening';
import { createId } from './id';
import { distance, wallDirectionUnit } from './wallGeometry';
import { MIN_WALL_LENGTH_MM } from '../config/constants';

/** 두 점이 "같은 지점에서 만난다"고 볼 허용 오차(mm). */
const JOIN_EPSILON_MM = 2;
/** 이 각도(도) 이내면 "일직선"으로 본다. */
const COLLINEAR_ANGLE_TOLERANCE_DEG = 1.5;

export interface WallMergePayload {
  removedWallIds: string[];
  newWall: Wall;
  doorPatches: { id: string; offsetMm: number }[];
  windowPatches: { id: string; offsetMm: number }[];
}

export type WallMergeResult = { ok: true; payload: WallMergePayload } | { ok: false; reason: string };

function samePoint(a: Point, b: Point): boolean {
  return distance(a, b) <= JOIN_EPSILON_MM;
}

/** 선택한 벽들의 끝점 중 한 지점에 벽이 3개 이상 모이면(가지침) 하나의 사슬로 볼 수 없다. */
function hasBranchingPoint(walls: Wall[]): boolean {
  const points: Point[] = [];
  for (const w of walls) points.push(w.start, w.end);
  for (let i = 0; i < points.length; i++) {
    let count = 1;
    for (let j = 0; j < points.length; j++) {
      if (i !== j && samePoint(points[i], points[j])) count++;
    }
    if (count > 2) return true;
  }
  return false;
}

interface ChainLink {
  wall: Wall;
  /** true면 이 벽을 end→start 방향으로 순회한다(사슬 진행 방향과 저장된 방향이 반대인 경우). */
  reversed: boolean;
}

/**
 * 선택한 벽들이 끝점끼리 이어진 하나의 연속된 사슬(가지침 없음)을 이루는지 확인하고,
 * 순서대로 정렬한다. 이어붙일 수 없으면(끊어짐/가지침) null.
 */
function buildChain(walls: Wall[]): ChainLink[] | null {
  const remaining = [...walls];
  const first = remaining.shift();
  if (!first) return null;
  const chain: ChainLink[] = [{ wall: first, reversed: false }];

  while (remaining.length > 0) {
    const tail = chain[chain.length - 1];
    const tailPoint = tail.reversed ? tail.wall.start : tail.wall.end;
    const head = chain[0];
    const headPoint = head.reversed ? head.wall.end : head.wall.start;

    const nextIndex = remaining.findIndex((w) => samePoint(w.start, tailPoint) || samePoint(w.end, tailPoint));
    if (nextIndex !== -1) {
      const w = remaining.splice(nextIndex, 1)[0];
      chain.push({ wall: w, reversed: samePoint(w.end, tailPoint) });
      continue;
    }

    const prevIndex = remaining.findIndex((w) => samePoint(w.start, headPoint) || samePoint(w.end, headPoint));
    if (prevIndex !== -1) {
      const w = remaining.splice(prevIndex, 1)[0];
      chain.unshift({ wall: w, reversed: samePoint(w.start, headPoint) });
      continue;
    }

    return null; // 더 이어붙일 벽을 찾지 못했는데 남은 벽이 있음 -> 하나의 사슬이 아님
  }

  return chain;
}

function angleDeg(dir: Point): number {
  return (Math.atan2(dir.y, dir.x) * 180) / Math.PI;
}

function angleDiffDeg(a: number, b: number): number {
  const d = Math.abs(a - b) % 360;
  return Math.min(d, 360 - d);
}

function chainLinkDirection(link: ChainLink): Point {
  return wallDirectionUnit(link.reversed ? { start: link.wall.end, end: link.wall.start } : link.wall);
}

/**
 * 선택한 벽들을 하나의 벽으로 병합할 수 있는지 확인하고, 가능하면 병합 결과(새 벽 + 문/창문
 * 재배치 정보)를 계산한다. 병합할 수 없는 구조라면 이유와 함께 실패를 반환한다 — 어떤 경우에도
 * 데이터를 강제로 바꾸지 않는다.
 */
export function planWallMerge(selectedWalls: Wall[], doors: Door[], windows: WindowOpening[]): WallMergeResult {
  if (selectedWalls.length < 2) {
    return { ok: false, reason: '벽을 2개 이상 선택하세요.' };
  }

  if (hasBranchingPoint(selectedWalls)) {
    return { ok: false, reason: '한 지점에 벽이 3개 이상 만나고 있어 하나로 합칠 수 없습니다.' };
  }

  const chain = buildChain(selectedWalls);
  if (!chain) {
    return { ok: false, reason: '선택한 벽들이 하나의 연속된 사슬로 이어져 있지 않습니다.' };
  }

  const baseAngle = angleDeg(chainLinkDirection(chain[0]));
  for (const link of chain) {
    const a = angleDeg(chainLinkDirection(link));
    if (angleDiffDeg(a, baseAngle) > COLLINEAR_ANGLE_TOLERANCE_DEG) {
      return { ok: false, reason: '선택한 벽이 일직선상에 있지 않아 하나로 합칠 수 없습니다.' };
    }
  }

  const start = chain[0].reversed ? chain[0].wall.end : chain[0].wall.start;
  const end = chain[chain.length - 1].reversed ? chain[chain.length - 1].wall.start : chain[chain.length - 1].wall.end;

  if (distance(start, end) < MIN_WALL_LENGTH_MM) {
    return { ok: false, reason: '병합 결과가 유효한 벽 길이가 되지 않습니다.' };
  }

  const thicknessMm = Math.max(...selectedWalls.map((w) => w.thicknessMm));
  const layerId = chain[0].wall.layerId;
  const newWall: Wall = { id: createId(), start, end, thicknessMm, layerId };
  const mergedDir = wallDirectionUnit(newWall);
  const removedWallIds = selectedWalls.map((w) => w.id);
  const removedSet = new Set(removedWallIds);

  const worldPointOnWall = (wall: Wall, offsetMm: number): Point => {
    const dir = wallDirectionUnit(wall);
    return { x: wall.start.x + dir.x * offsetMm, y: wall.start.y + dir.y * offsetMm };
  };
  const offsetOnNewWall = (worldPt: Point): number =>
    (worldPt.x - newWall.start.x) * mergedDir.x + (worldPt.y - newWall.start.y) * mergedDir.y;

  const doorPatches = doors
    .filter((d) => removedSet.has(d.wallId))
    .map((d) => {
      const wall = selectedWalls.find((w) => w.id === d.wallId)!;
      return { id: d.id, offsetMm: offsetOnNewWall(worldPointOnWall(wall, d.offsetMm)) };
    });

  const windowPatches = windows
    .filter((w) => removedSet.has(w.wallId))
    .map((win) => {
      const wall = selectedWalls.find((w) => w.id === win.wallId)!;
      return { id: win.id, offsetMm: offsetOnNewWall(worldPointOnWall(wall, win.offsetMm)) };
    });

  return { ok: true, payload: { removedWallIds, newWall, doorPatches, windowPatches } };
}
