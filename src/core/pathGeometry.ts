import type { Point } from '../types/geometry';
import type { Path } from '../types/path';
import { ARROW_HEAD_LENGTH_MM, ARROW_HEAD_WIDTH_MM, CURVE_SAMPLE_SEGMENTS, DEFAULT_CURVE_OFFSET_RATIO } from '../config/constants';
import { distanceToSegment } from './wallGeometry';

/** 2차 베지어 곡선 위의 한 점 (t: 0~1). */
function quadraticBezierPoint(p0: Point, p1: Point, p2: Point, t: number): Point {
  const mt = 1 - t;
  return {
    x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
    y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
  };
}

/** 곡선을 CURVE_SAMPLE_SEGMENTS개의 직선 구간으로 근사한 점 목록 (히트테스트/경계 계산용). */
export function sampleCurve(path: Path): Point[] {
  if (!path.curve || !path.controlPoint) return [path.start, path.end];
  const points: Point[] = [];
  for (let i = 0; i <= CURVE_SAMPLE_SEGMENTS; i++) {
    points.push(quadraticBezierPoint(path.start, path.controlPoint, path.end, i / CURVE_SAMPLE_SEGMENTS));
  }
  return points;
}

/** 동선 시작-끝의 중점에서 수직으로 약간 밀어낸 기본 제어점 (곡선으로 처음 바꿀 때 사용). */
export function defaultControlPoint(start: Point, end: Point): Point {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const offset = len * DEFAULT_CURVE_OFFSET_RATIO;
  return { x: (start.x + end.x) / 2 + px * offset, y: (start.y + end.y) / 2 + py * offset };
}

/** 여러 동선 중 point(mm)에 가장 가까우면서 허용치(toleranceMm) 안에 있는 것을 찾는다. 곡선은 선분들로 근사해 검사한다. */
export function hitTestPaths(point: Point, paths: Path[], toleranceMm: number): Path | null {
  let closest: Path | null = null;
  let closestDistance = toleranceMm;

  for (const path of paths) {
    const samples = sampleCurve(path);
    for (let i = 0; i < samples.length - 1; i++) {
      const d = distanceToSegment(point, samples[i], samples[i + 1]);
      if (d <= closestDistance) {
        closest = path;
        closestDistance = d;
      }
    }
  }
  return closest;
}

/** 동선 끝(end)에서의 진행 방향 — 직선이면 start→end, 곡선이면 (2차 베지어 미분) controlPoint→end와 방향이 같다. */
export function pathEndTangent(path: Path): { from: Point; to: Point } {
  if (path.curve && path.controlPoint) {
    return { from: path.controlPoint, to: path.end };
  }
  return { from: path.start, to: path.end };
}

/** 동선 끝(end)에 그릴 화살촉 삼각형의 세 꼭짓점(mm) — [끝점, 왼쪽 날개, 오른쪽 날개]. */
export function arrowHeadTriangle(start: Point, end: Point): [Point, Point, Point] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;

  const backX = end.x - ux * ARROW_HEAD_LENGTH_MM;
  const backY = end.y - uy * ARROW_HEAD_LENGTH_MM;
  const half = ARROW_HEAD_WIDTH_MM / 2;

  return [
    { x: end.x, y: end.y },
    { x: backX + px * half, y: backY + py * half },
    { x: backX - px * half, y: backY - py * half },
  ];
}
