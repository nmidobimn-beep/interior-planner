import type { Point } from '../types/geometry';
import {
  SNAP_ANGLE_STEPS_DEG,
  SNAP_ANGLE_TOLERANCE_DEG,
  SNAP_ENDPOINT_RADIUS_PX,
  SNAP_GRID_MM,
} from '../config/constants';
import { distance } from './wallGeometry';

/** 어떤 종류의 스냅이 적용됐는지 (시각 피드백에 사용). */
export type SnapKind = 'endpoint' | 'angle' | 'grid' | null;

export interface SnapResult {
  point: Point;
  kind: SnapKind;
}

interface SnapOptions {
  /** 각도 스냅의 기준점 (예: 벽 그리기 시작점). 없으면 각도 스냅을 건너뛴다. */
  origin?: Point;
  /** 끝점 스냅 후보가 될 기존 점들 (다른 벽들의 시작/끝점). */
  candidatePoints?: Point[];
  /** 화면 px per mm. 픽셀 단위 허용치를 mm로 환산하는 데 사용한다. */
  scale: number;
  enabled: boolean;
}

/**
 * 우선순위: ① 기존 벽 끝점 스냅 → ② 각도 스냅(0/45/90°...) → ③ 격자 스냅.
 * 방/거실/화장실 등 여러 벽이 한 화면에서 서로 맞물려야 하므로 끝점 스냅을 최우선으로 둔다.
 */
export function snapPoint(point: Point, options: SnapOptions): SnapResult {
  if (!options.enabled) return { point, kind: null };

  const endpointToleranceMm = SNAP_ENDPOINT_RADIUS_PX / options.scale;
  const endpointSnap = snapToNearestPoint(point, options.candidatePoints ?? [], endpointToleranceMm);
  if (endpointSnap) return { point: endpointSnap, kind: 'endpoint' };

  if (options.origin) {
    const angleSnap = snapToAngle(options.origin, point);
    if (angleSnap) return { point: angleSnap, kind: 'angle' };
  }

  return { point: snapToGrid(point, SNAP_GRID_MM), kind: 'grid' };
}

function snapToNearestPoint(point: Point, candidates: Point[], toleranceMm: number): Point | null {
  let closest: Point | null = null;
  let closestDistance = toleranceMm;

  for (const candidate of candidates) {
    const d = distance(point, candidate);
    if (d <= closestDistance) {
      closest = candidate;
      closestDistance = d;
    }
  }
  return closest;
}

/** origin 기준 point의 각도가 "보기 좋은" 각도에 가까우면 그 각도 위로 투영한다. 비정형 구조는 자유 각도 그대로 유지. */
function snapToAngle(origin: Point, point: Point): Point | null {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return null;

  const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
  const snapped = snapAngleDeg(angleDeg);
  if (snapped === null) return null;

  const rad = (snapped * Math.PI) / 180;
  return { x: origin.x + Math.cos(rad) * dist, y: origin.y + Math.sin(rad) * dist };
}

/**
 * 각도(도)가 "보기 좋은" 각도(0/45/90°...)에 허용오차 안으로 가까우면 그 각도로 스냅한다.
 * 가구 회전 손잡이 드래그에도 그대로 재사용한다. 허용오차 밖이면 null(자유 각도 유지).
 */
export function snapAngleDeg(angleDeg: number): number | null {
  const normalized = ((angleDeg % 360) + 360) % 360;

  for (const step of SNAP_ANGLE_STEPS_DEG) {
    const diff = Math.min(Math.abs(normalized - step), 360 - Math.abs(normalized - step));
    if (diff <= SNAP_ANGLE_TOLERANCE_DEG) return step;
  }
  return null;
}

function snapToGrid(point: Point, gridMm: number): Point {
  return {
    x: Math.round(point.x / gridMm) * gridMm,
    y: Math.round(point.y / gridMm) * gridMm,
  };
}
