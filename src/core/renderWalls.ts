import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import { COLORS, WALL_ENDPOINT_HANDLE_RADIUS_PX } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';
import { wallCorners, wallLengthMm } from './wallGeometry';
import type { SnapKind } from './snap';
import { formatLengthMm, type DisplayUnit } from './units';

function toScreenPath(ctx: CanvasRenderingContext2D, viewport: Viewport, corners: Point[]) {
  ctx.beginPath();
  corners.forEach((corner, i) => {
    const screen = worldToScreen(viewport, corner);
    if (i === 0) ctx.moveTo(screen.x, screen.y);
    else ctx.lineTo(screen.x, screen.y);
  });
  ctx.closePath();
}

export function drawWalls(ctx: CanvasRenderingContext2D, viewport: Viewport, walls: Wall[], selectedIds: ReadonlySet<string>) {
  for (const wall of walls) {
    const isSelected = selectedIds.has(wall.id);
    toScreenPath(ctx, viewport, wallCorners(wall));
    ctx.fillStyle = isSelected ? COLORS.wallSelectedFill : COLORS.wallFill;
    ctx.strokeStyle = isSelected ? COLORS.wallSelectedStroke : COLORS.wallStroke;
    ctx.lineWidth = isSelected ? 2 : 1;
    ctx.fill();
    ctx.stroke();
  }

  // 끝점 손잡이는 벽 하나만 선택됐을 때만 보여준다(BL로 이어붙인 벽 그룹처럼 여러 개가 선택된
  // 경우는 개별 끝점을 드래그하는 게 아니라 그룹 전체를 이동하는 것이므로 손잡이가 필요 없다).
  if (selectedIds.size === 1) {
    const selected = walls.find((w) => selectedIds.has(w.id));
    if (selected) drawEndpointHandles(ctx, viewport, selected);
  }
}

function drawEndpointHandles(ctx: CanvasRenderingContext2D, viewport: Viewport, wall: Wall) {
  for (const point of [wall.start, wall.end]) {
    const screen = worldToScreen(viewport, point);
    ctx.beginPath();
    ctx.arc(screen.x, screen.y, WALL_ENDPOINT_HANDLE_RADIUS_PX, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.wallHandle;
    ctx.strokeStyle = COLORS.wallHandleStroke;
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();
  }
}

/** 벽 그리기 중인 구간(rubber-band)과 실시간 길이 라벨을 그린다. */
export function drawWallPreview(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  start: Point,
  end: Point,
  thicknessMm: number,
  unit: DisplayUnit,
) {
  toScreenPath(ctx, viewport, wallCorners({ start, end, thicknessMm }));
  ctx.fillStyle = COLORS.wallPreview;
  ctx.fill();
  ctx.setLineDash([6, 4]);
  ctx.strokeStyle = COLORS.wallSelectedStroke;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.setLineDash([]);

  const mid = worldToScreen(viewport, { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 });
  const label = formatLengthMm(wallLengthMm({ start, end }), unit);
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = COLORS.wallLengthLabel;
  ctx.textAlign = 'center';
  ctx.fillText(label, mid.x, mid.y - 8);
  ctx.textAlign = 'left';
}

/** 스냅이 걸린 지점을 종류별 색상의 작은 점으로 표시한다 (끝점 스냅/각도 스냅/격자 스냅 구분). */
export function drawSnapIndicator(ctx: CanvasRenderingContext2D, viewport: Viewport, point: Point, kind: SnapKind) {
  if (!kind) return;
  const color = kind === 'endpoint' ? COLORS.snapEndpoint : kind === 'angle' ? COLORS.snapAngle : COLORS.snapGrid;
  const screen = worldToScreen(viewport, point);

  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = '#ffffff';
  ctx.stroke();
}
