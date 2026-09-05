import type { Point } from '../types/geometry';
import type { DimensionLine, DimensionMode } from '../types/dimension';
import { COLORS, DIMENSION_ENDPOINT_HANDLE_RADIUS_PX, DIMENSION_TICK_LENGTH_PX } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';
import { computeDimensionGeometry } from './dimensionGeometry';
import { formatLengthMm, type DisplayUnit } from './units';

/** 치수선 양 끝에 그리는 작은 사선 눈금(건축 도면에서 흔히 쓰는 방식) — screen 좌표 기준. */
function drawTick(ctx: CanvasRenderingContext2D, at: Point, dirX: number, dirY: number) {
  const half = DIMENSION_TICK_LENGTH_PX / 2;
  // 진행 방향에 수직인 45도 사선 눈금
  const px = -dirY;
  const py = dirX;
  ctx.beginPath();
  ctx.moveTo(at.x - px * half - dirX * half, at.y - py * half - dirY * half);
  ctx.lineTo(at.x + px * half + dirX * half, at.y + py * half + dirY * half);
  ctx.stroke();
}

export function drawDimensions(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  dimensions: DimensionLine[],
  selectedIds: ReadonlySet<string>,
  unit: DisplayUnit,
) {
  const showHandles = selectedIds.size === 1;

  for (const dim of dimensions) {
    const isSelected = selectedIds.has(dim.id);
    const geo = computeDimensionGeometry(dim);
    const color = isSelected ? COLORS.dimensionSelected : COLORS.dimensionLine;

    // 보조선(연장선) — 실제 측정 대상 점에서 치수선까지
    ctx.strokeStyle = COLORS.dimensionExtensionLine;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (const [a, b] of geo.extensionLines) {
      const sa = worldToScreen(viewport, a);
      const sb = worldToScreen(viewport, b);
      ctx.beginPath();
      ctx.moveTo(sa.x, sa.y);
      ctx.lineTo(sb.x, sb.y);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 치수선 본체
    const lineStart = worldToScreen(viewport, geo.lineStart);
    const lineEnd = worldToScreen(viewport, geo.lineEnd);
    ctx.strokeStyle = color;
    ctx.lineWidth = isSelected ? 2 : 1.5;
    ctx.beginPath();
    ctx.moveTo(lineStart.x, lineStart.y);
    ctx.lineTo(lineEnd.x, lineEnd.y);
    ctx.stroke();

    // 양 끝 눈금
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const len = Math.hypot(dx, dy) || 1;
    drawTick(ctx, lineStart, dx / len, dy / len);
    drawTick(ctx, lineEnd, dx / len, dy / len);

    // 거리 라벨
    const labelScreen = worldToScreen(viewport, geo.labelPosition);
    ctx.font = '600 12px system-ui, -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const text = formatLengthMm(geo.valueMm, unit);
    const metrics = ctx.measureText(text);
    const paddingX = 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(labelScreen.x - metrics.width / 2 - paddingX, labelScreen.y - 8, metrics.width + paddingX * 2, 16);
    ctx.fillStyle = isSelected ? COLORS.dimensionSelected : COLORS.dimensionText;
    ctx.fillText(text, labelScreen.x, labelScreen.y);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';

    if (isSelected && showHandles) {
      for (const point of [dim.start, dim.end]) {
        const screen = worldToScreen(viewport, point);
        ctx.beginPath();
        ctx.arc(screen.x, screen.y, DIMENSION_ENDPOINT_HANDLE_RADIUS_PX, 0, Math.PI * 2);
        ctx.fillStyle = COLORS.dimensionHandle;
        ctx.strokeStyle = COLORS.dimensionSelected;
        ctx.lineWidth = 2;
        ctx.fill();
        ctx.stroke();
      }
    }
  }
}

/** 치수선을 그리는 중(첫 클릭 후 두 번째 클릭 전) 임시로 보여주는 미리보기. */
export function drawDimensionPreview(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  start: Point,
  end: Point,
  mode: DimensionMode,
  unit: DisplayUnit,
) {
  const geo = computeDimensionGeometry({ start, end, mode });
  ctx.save();
  ctx.strokeStyle = COLORS.dimensionLine;
  ctx.setLineDash([6, 4]);
  ctx.lineWidth = 1.5;

  for (const [a, b] of geo.extensionLines) {
    const sa = worldToScreen(viewport, a);
    const sb = worldToScreen(viewport, b);
    ctx.beginPath();
    ctx.moveTo(sa.x, sa.y);
    ctx.lineTo(sb.x, sb.y);
    ctx.stroke();
  }

  const lineStart = worldToScreen(viewport, geo.lineStart);
  const lineEnd = worldToScreen(viewport, geo.lineEnd);
  ctx.beginPath();
  ctx.moveTo(lineStart.x, lineStart.y);
  ctx.lineTo(lineEnd.x, lineEnd.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const labelScreen = worldToScreen(viewport, geo.labelPosition);
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.dimensionText;
  ctx.fillText(formatLengthMm(geo.valueMm, unit), labelScreen.x, labelScreen.y - 10);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.restore();
}
