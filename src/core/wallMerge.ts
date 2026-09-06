import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Door, WindowOpening } from '../types/opening';
import { createId } from './id';
import { distance, wallDirectionUnit } from './wallGeometry';
import { MIN_WALL_LENGTH_MM } from '../config/constants';

/** 두 점이 "같은 지점에서 만난다"고 볼 허용 오차(mm). */
const JOIN_EPSILON_MM = 2;
/** 이 각도(도) 이내면 "일직선"으로 본다(같은 런으로 묶어 하나의 벽으로 병합). */
const COLLINEAR_ANGLE_TOLERANCE_DEG = 1.5;

/**
 * 병합 결과. 일직선으로 이어진 구간은 벽 하나(newWalls)로 합쳐지고, 꺾이는 지점(모서리)은
 * 벽 개수를 줄이지 않는 대신 두 벽이 정확히 같은 점에서 만나도록 끝점만 정리한다
 * (wallPointPatches). 문/창문은 실제로 다른 벽으로 대체된 경우에만 재배치된다.
 */
export interface WallMergePayload {
  /** 일직선 구간 병합으로 완전히 대체되어 사라지는 원래 벽들. */
  removedWallIds: string[];
  /** 일직선 구간마다 새로 만들어진 병합 벽(구간 하나당 1개). */
  newWalls: Wall[];
  /** 모서리에서 살짝 어긋나 있던 끝점을 정확히 맞추기 위한, 기존 벽 유지 + 끝점만 수정. */
  wallPointPatches: { id: string; start?: Point; end?: Point }[];
  doorPatches: { id: string; wallId: string; offsetMm: number }[];
  windowPatches: { id: string; wallId: string; offsetMm: number }[];
  /** 결과를 바로 확인할 수 있도록 선택해줄 벽 id들(새 병합 벽 + 모서리 정리 후 남은 벽). */
  resultWallIds: string[];
  mergedRunCount: number;
  joinedCornerCount: number;
}

export type WallMergeResult = { ok: true; payload: WallMergePayload } | { ok: false; reason: string };

function samePoint(a: Point, b: Point): boolean {
  return distance(a, b) <= JOIN_EPSILON_MM;
}

function midpoint(a: Point, b: Point): Point {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
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

function chainLinkStart(link: ChainLink): Point {
  return link.reversed ? link.wall.end : link.wall.start;
}

function chainLinkEnd(link: ChainLink): Point {
  return link.reversed ? link.wall.start : link.wall.end;
}

/** 사슬을 진행 방향이 이어지는(일직선) 연속 구간(run)들로 나눈다. 꺾이는 지점마다 구간이 갈린다. */
function splitIntoRuns(chain: ChainLink[]): ChainLink[][] {
  const runs: ChainLink[][] = [];
  let current: ChainLink[] = [chain[0]];

  for (let i = 1; i < chain.length; i++) {
    const prevAngle = angleDeg(chainLinkDirection(chain[i - 1]));
    const curAngle = angleDeg(chainLinkDirection(chain[i]));
    if (angleDiffDeg(curAngle, prevAngle) <= COLLINEAR_ANGLE_TOLERANCE_DEG) {
      current.push(chain[i]);
    } else {
      runs.push(current);
      current = [chain[i]];
    }
  }
  runs.push(current);
  return runs;
}

function worldPointOnWall(wall: Wall, offsetMm: number): Point {
  const dir = wallDirectionUnit(wall);
  return { x: wall.start.x + dir.x * offsetMm, y: wall.start.y + dir.y * offsetMm };
}

/**
 * 선택한 벽들을 최대한 병합한다. 끝점끼리 이어진(가지침 없는) 하나의 사슬이어야 하며, 사슬을
 * 일직선 구간별로 나눠 각 구간(벽 2개 이상)은 벽 하나로 합치고, 구간과 구간이 만나는 모서리는
 * 벽 개수를 줄이는 대신 두 벽의 끝점을 정확히 일치시킨다("모서리 정리"). 사슬 자체가 성립하지
 * 않으면(끊어짐/가지침) 실패를 반환하며, 어떤 경우에도 데이터를 강제로 바꾸지 않는다.
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

  const runs = splitIntoRuns(chain);

  const removedWallIds: string[] = [];
  const newWalls: Wall[] = [];
  const wallPointPatches: { id: string; start?: Point; end?: Point }[] = [];
  const doorPatches: { id: string; wallId: string; offsetMm: number }[] = [];
  const windowPatches: { id: string; wallId: string; offsetMm: number }[] = [];
  const resultWallIds: string[] = [];

  // 각 구간을 처리한 결과, 그 구간의 최종 시작/끝점(모서리 정리에 쓰임)과 대표 벽 id를 기록한다.
  interface RunOutcome {
    startPoint: Point;
    endPoint: Point;
    /** 병합되지 않은(벽 1개짜리) 구간이면 그 벽 id, 병합됐으면 새 벽 id. */
    representativeWallId: string;
    /** 병합되지 않은 구간의 시작/끝 patch 대상 — 모서리 정리 시 갱신한다. */
    singleWall?: { id: string; reversed: boolean };
  }

  const runOutcomes: RunOutcome[] = runs.map((run) => {
    const startPoint = chainLinkStart(run[0]);
    const endPoint = chainLinkEnd(run[run.length - 1]);

    if (run.length === 1) {
      const link = run[0];
      return {
        startPoint,
        endPoint,
        representativeWallId: link.wall.id,
        singleWall: { id: link.wall.id, reversed: link.reversed },
      };
    }

    // 벽 2개 이상 이어진 일직선 구간 -> 벽 하나로 합친다(기존 단일-런 병합 로직과 동일).
    const runWalls = run.map((l) => l.wall);
    const thicknessMm = Math.max(...runWalls.map((w) => w.thicknessMm));
    const layerId = run[0].wall.layerId;
    const newWall: Wall = { id: createId(), start: startPoint, end: endPoint, thicknessMm, layerId };
    const mergedDir = wallDirectionUnit(newWall);
    const offsetOnNewWall = (worldPt: Point) => (worldPt.x - newWall.start.x) * mergedDir.x + (worldPt.y - newWall.start.y) * mergedDir.y;

    for (const l of run) {
      removedWallIds.push(l.wall.id);
      for (const d of doors.filter((door) => door.wallId === l.wall.id)) {
        doorPatches.push({ id: d.id, wallId: newWall.id, offsetMm: offsetOnNewWall(worldPointOnWall(l.wall, d.offsetMm)) });
      }
      for (const w of windows.filter((win) => win.wallId === l.wall.id)) {
        windowPatches.push({ id: w.id, wallId: newWall.id, offsetMm: offsetOnNewWall(worldPointOnWall(l.wall, w.offsetMm)) });
      }
    }

    newWalls.push(newWall);
    return { startPoint, endPoint, representativeWallId: newWall.id };
  });

  for (const outcome of runOutcomes) resultWallIds.push(outcome.representativeWallId);

  // 구간과 구간 사이(모서리)를 정확히 같은 점으로 정리한다. 병합된 구간은 이미 새 벽 데이터에
  // 반영하고, 병합되지 않은(벽 1개짜리) 구간은 그 벽의 시작/끝점만 patch한다.
  let joinedCornerCount = 0;
  for (let i = 0; i < runOutcomes.length - 1; i++) {
    const current = runOutcomes[i];
    const next = runOutcomes[i + 1];
    const corner = midpoint(current.endPoint, next.startPoint);
    if (distance(current.endPoint, corner) < 0.01 && distance(next.startPoint, corner) < 0.01) continue; // 이미 정확히 일치

    joinedCornerCount++;
    if (current.singleWall) {
      const patch: (typeof wallPointPatches)[number] = { id: current.singleWall.id };
      if (current.singleWall.reversed) patch.start = corner;
      else patch.end = corner;
      wallPointPatches.push(patch);
    } else {
      const w = newWalls.find((nw) => nw.id === current.representativeWallId)!;
      w.end = corner;
    }
    current.endPoint = corner;

    if (next.singleWall) {
      const patch: (typeof wallPointPatches)[number] = { id: next.singleWall.id };
      if (next.singleWall.reversed) patch.end = corner;
      else patch.start = corner;
      wallPointPatches.push(patch);
    } else {
      const w = newWalls.find((nw) => nw.id === next.representativeWallId)!;
      w.start = corner;
    }
    next.startPoint = corner;
  }

  // 모든 구간이 이미 벽 1개씩이고 끝점도 이미 정확히 일치하는 경우(newWalls·wallPointPatches
  // 둘 다 비어있음)에도 실패로 취급하지 않는다 — "이미 모서리가 깔끔하게 맞물려 있다"는 성공으로
  // 보고하고, 호출 쪽에서 바꿀 데이터가 없으면 Undo 기록 없이 안내만 하면 된다.

  for (const w of newWalls) {
    if (distance(w.start, w.end) < MIN_WALL_LENGTH_MM) {
      return { ok: false, reason: '병합 결과가 유효한 벽 길이가 되지 않습니다.' };
    }
  }

  return {
    ok: true,
    payload: {
      removedWallIds,
      newWalls,
      wallPointPatches,
      doorPatches,
      windowPatches,
      resultWallIds,
      mergedRunCount: newWalls.length,
      joinedCornerCount,
    },
  };
}
