import type { Point } from '../types/geometry';
import type { Furniture } from '../types/furniture';
import { COLORS, FURNITURE_HANDLE_RADIUS_PX } from '../config/constants';
import { hexToRgba } from './color';
import { worldToScreen, type Viewport } from './viewport';
import { rotationHandleWorldPoint, toWorldPolygon } from './furnitureGeometry';

function toScreenPath(ctx: CanvasRenderingContext2D, viewport: Viewport, points: Point[]) {
  ctx.beginPath();
  points.forEach((p, i) => {
    const screen = worldToScreen(viewport, p);
    if (i === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.closePath();
}

export function drawFurniture(ctx: CanvasRenderingContext2D, viewport: Viewport, furnitureList: Furniture[], selectedId: string | null) {
  for (const item of furnitureList) {
    const isSelected = item.id === selectedId;
    const center = worldToScreen(viewport, { x: item.x, y: item.y });

    ctx.fillStyle = isSelected ? COLORS.furnitureSelectedFill : hexToRgba(item.color, 0.18);
    ctx.strokeStyle = isSelected ? COLORS.furnitureSelectedStroke : item.color;
    ctx.lineWidth = isSelected ? 2 : 1.5;

    if (item.shape === 'circle') {
      const radiusPx = (item.width / 2) * viewport.scale;
      ctx.beginPath();
      ctx.arc(center.x, center.y, radiusPx, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else {
      const polygon = toWorldPolygon(item);
      if (!polygon) continue;
      toScreenPath(ctx, viewport, polygon);
      ctx.fill();
      ctx.stroke();
    }

    ctx.fillStyle = COLORS.furnitureText;
    ctx.font = '12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(item.name, center.x, center.y);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  const selected = furnitureList.find((item) => item.id === selectedId);
  if (selected) drawRotationHandle(ctx, viewport, selected);
}

function drawRotationHandle(ctx: CanvasRenderingContext2D, viewport: Viewport, furniture: Furniture) {
  const center = worldToScreen(viewport, { x: furniture.x, y: furniture.y });
  const handle = worldToScreen(viewport, rotationHandleWorldPoint(furniture));

  ctx.strokeStyle = COLORS.furnitureRotateLine;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(center.x, center.y);
  ctx.lineTo(handle.x, handle.y);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(handle.x, handle.y, FURNITURE_HANDLE_RADIUS_PX, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.furnitureHandle;
  ctx.strokeStyle = COLORS.furnitureHandleStroke;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
}
