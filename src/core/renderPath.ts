import type { Point } from '../types/geometry';
import type { Path } from '../types/path';
import { COLORS, CURVE_CONTROL_HANDLE_RADIUS_PX, PATH_ENDPOINT_HANDLE_RADIUS_PX } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';
import { arrowHeadTriangle, pathEndTangent } from './pathGeometry';

function strokePathShape(ctx: CanvasRenderingContext2D, viewport: Viewport, path: Path) {
  const start = worldToScreen(viewport, path.start);
  const end = worldToScreen(viewport, path.end);

  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  if (path.curve && path.controlPoint) {
    const control = worldToScreen(viewport, path.controlPoint);
    ctx.quadraticCurveTo(control.x, control.y, end.x, end.y);
  } else {
    ctx.lineTo(end.x, end.y);
  }
  ctx.stroke();
}

export function drawPaths(ctx: CanvasRenderingContext2D, viewport: Viewport, paths: Path[], selectedIds: ReadonlySet<string>) {
  // 끝점/곡선 조절점 손잡이는 정확히 하나만 선택됐을 때만 보여준다 (다중 선택 시엔 그룹 손잡이를 대신 씀).
  const showHandles = selectedIds.size === 1;
  for (const path of paths) {
    const isSelected = selectedIds.has(path.id);
    const color = isSelected ? COLORS.pathSelected : COLORS.path;

    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash([10, 6]);
    strokePathShape(ctx, viewport, path);
    ctx.setLineDash([]);

    if (path.showArrow) {
      const { from, to } = pathEndTangent(path);
      const [tip, left, right] = arrowHeadTriangle(from, to).map((p) => worldToScreen(viewport, p));
      ctx.beginPath();
      ctx.moveTo(tip.x, tip.y);
      ctx.lineTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    }

    if (isSelected && showHandles) {
      const start = worldToScreen(viewport, path.start);
      const end = worldToScreen(viewport, path.end);
      for (const point of [start, end]) {
        ctx.beginPath();
        ctx.arc(point.x, point.y, PATH_ENDPOINT_HANDLE_RADIUS_PX, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.pathHandle;
        ctx.strokeStyle = COLORS.pathSelected;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }

      if (path.curve && path.controlPoint) {
        const control = worldToScreen(viewport, path.controlPoint);
        ctx.strokeStyle = COLORS.pathControlLine;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(control.x, control.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.arc(control.x, control.y, CURVE_CONTROL_HANDLE_RADIUS_PX, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.pathControlHandle;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

/** 동선을 그리는 중(클릭 한 번 후 두 번째 클릭 전) 임시로 보여주는 구간. 직선 미리보기만 지원(곡선은 완성 후 조절). */
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
