import type { Point } from '../types/geometry';
import type { Path } from '../types/path';
import { ARROW_HEAD_LENGTH_MM, ARROW_HEAD_WIDTH_MM } from '../config/constants';
import { distanceToSegment } from './wallGeometry';

/** 여러 동선 중 point(mm)에 가장 가까우면서 허용치(toleranceMm) 안에 있는 것을 찾는다. */
export function hitTestPaths(point: Point, paths: Path[], toleranceMm: number): Path | null {
  let closest: Path | null = null;
  let closestDistance = toleranceMm;

  for (const path of paths) {
    const d = distanceToSegment(point, path.start, path.end);
    if (d <= closestDistance) {
      closest = path;
      closestDistance = d;
    }
  }
  return closest;
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
