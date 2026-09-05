import type { Point } from '../types/geometry';
import type { Path } from '../types/path';
import { COLORS, PATH_ENDPOINT_HANDLE_RADIUS_PX } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';
import { arrowHeadTriangle } from './pathGeometry';

export function drawPaths(ctx: CanvasRenderingContext2D, viewport: Viewport, paths: Path[], selectedId: string | null) {
  for (const path of paths) {
    const isSelected = path.id === selectedId;
    const start = worldToScreen(viewport, path.start);
    const end = worldToScreen(viewport, path.end);
    const color = isSelected ? COLORS.pathSelected : COLORS.path;

    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash([10, 6]);
    ctx.beginPath();
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(end.x, end.y);
    ctx.stroke();
    ctx.setLineDash([]);

    if (path.showArrow) {
      const [tip, left, right] = arrowHeadTriangle(path.start, path.end).map((p) => worldToScreen(viewport, p));
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (isSelected) {
      for (const point of [start, end]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, PATH_ENDPOINT_HANDLE_RADIUS_PX, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.pathHandle;
        ctx.strokeStyle = COLORS.pathSelected;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

/** 동선을 그리는 중(클릭 한 번 후 두 번째 클릭 전) 임시로 보여주는 구간. */
export function drawPathPreview(ctx: CanvasRenderingContext2D, viewport: Viewport, start: Point, end: Point) {
  const s = worldToScreen(viewport, start);
  const e = worldToScreen(viewport, end);

  ctx.strokeStyle = COLORS.pathSelected;
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 6]);
  ctx.beginPath();
  ctx.moveTo(s.x, s.y);
  ctx.lineTo(e.x, e.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const [tip, left, right] = arrowHeadTriangle(start, end).map((p) => worldToScreen(viewport, p));
  ctx.beginPath();
  ctx.moveTo(tip.x, tip.y);
  ctx.lineTo(left.x, left.y);
  ctx.lineTo(right.x, right.y);
  ctx.closePath();
  ctx.fillStyle = COLORS.pathSelected;
  ctx.fill();
}
