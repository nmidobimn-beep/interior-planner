import type { Point } from '../types/geometry';
import type { Polygon } from '../types/polygon';
import { COLORS, POLYGON_VERTEX_HANDLE_RADIUS_PX } from '../config/constants';
import { hexToRgba } from './color';
import { worldToScreen, type Viewport } from './viewport';
import { polygonCentroid } from './polygonGeometry';

function toScreenPath(ctx: CanvasRenderingContext2D, viewport: Viewport, points: Point[]) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const screen = worldToScreen(viewport, p);
    if (i === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.closePath();
}

export function drawPolygons(ctx: CanvasRenderingContext2D, viewport: Viewport, polygons: Polygon[], selectedIds: ReadonlySet<string>) {
  for (const polygon of polygons) {
    if (polygon.points.length < 3) continue;
    const isSelected = selectedIds.has(polygon.id);

    toScreenPath(ctx, viewport, polygon.points);
    ctx.fillStyle = isSelected ? COLORS.polygonSelectedFill : hexToRgba(polygon.color, 0.22);
    ctx.strokeStyle = isSelected ? COLORS.polygonSelectedStroke : polygon.color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.fill();
    ctx.stroke();

    const centroid = worldToScreen(viewport, polygonCentroid(polygon));
    ctx.fillStyle = COLORS.polygonText;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(polygon.name, centroid.x, centroid.y);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  // 꼭짓점 손잡이는 정확히 하나만 선택됐을 때만 보여준다(다중 선택 시엔 그룹 손잡이를 대신 씀).
  if (selectedIds.size === 1) {
    const onlyId = selectedIds.values().next().value;
    const selected = polygons.find((p) => p.id === onlyId);
    if (selected) {
      for (const point of selected.points) {
        const screen = worldToScreen(viewport, point);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, POLYGON_VERTEX_HANDLE_RADIUS_PX, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.polygonHandle;
        ctx.strokeStyle = COLORS.polygonHandleStroke;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

/** 다각형을 그리는 중(꼭짓점을 하나씩 추가하는 중) 임시로 보여주는 미리보기. */
export function drawPolygonPreview(ctx: CanvasRenderingContext2D, viewport: Viewport, points: Point[], cursor: Point | null) {
  if (points.length === 0) return;
  const screenPoints = points.map((p) => worldToScreen(viewport, p));
  const cursorScreen = cursor ? worldToScreen(viewport, cursor) : null;

  ctx.strokeStyle = COLORS.polygonPreview;
  ctx.fillStyle = COLORS.polygonPreview;
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  screenPoints.forEach((p, i) => {
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  if (cursorScreen) ctx.lineTo(cursorScreen.x, cursorScreen.y);
  ctx.stroke();
  ctx.setLineDash([]);

  for (const p of screenPoints) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}
