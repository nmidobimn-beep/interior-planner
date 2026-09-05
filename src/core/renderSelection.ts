import type { Bounds, Point } from '../types/geometry';
import { COLORS, FURNITURE_HANDLE_RADIUS_PX, MULTI_SELECT_BOUNDS_PADDING_MM, ROTATION_HANDLE_OFFSET_MM } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';
import { boundsCenter } from './multiSelectGeometry';

/** 다중 선택 바운딩 박스의 회전 손잡이 world 좌표 (박스 위쪽으로 떨어진 지점). */
export function groupRotationHandleWorldPoint(bounds: Bounds): Point {
  const center = boundsCenter(bounds);
  return { x: center.x, y: bounds.minY - MULTI_SELECT_BOUNDS_PADDING_MM - ROTATION_HANDLE_OFFSET_MM };
}

/** 다중 선택된 객체 전체를 감싸는 점선 바운딩 박스 + 회전 손잡이를 그린다. */
export function drawSelectionBounds(ctx: CanvasRenderingContext2D, viewport: Viewport, bounds: Bounds) {
  const paddedMin = { x: bounds.minX - MULTI_SELECT_BOUNDS_PADDING_MM, y: bounds.minY - MULTI_SELECT_BOUNDS_PADDING_MM };
  const paddedMax = { x: bounds.maxX + MULTI_SELECT_BOUNDS_PADDING_MM, y: bounds.maxY + MULTI_SELECT_BOUNDS_PADDING_MM };
  const topLeft = worldToScreen(viewport, paddedMin);
  const bottomRight = worldToScreen(viewport, paddedMax);

  ctx.save();
  ctx.strokeStyle = COLORS.multiSelectBounds;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 4]);
  ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
  ctx.setLineDash([]);

  const topCenterWorld = { x: (paddedMin.x + paddedMax.x) / 2, y: paddedMin.y };
  const handleWorld = groupRotationHandleWorldPoint(bounds);
  const topCenterScreen = worldToScreen(viewport, topCenterWorld);
  const handleScreen = worldToScreen(viewport, handleWorld);

  ctx.beginPath();
  ctx.moveTo(topCenterScreen.x, topCenterScreen.y);
  ctx.lineTo(handleScreen.x, handleScreen.y);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(handleScreen.x, handleScreen.y, FURNITURE_HANDLE_RADIUS_PX, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.furnitureHandle;
  ctx.strokeStyle = COLORS.multiSelectBounds;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

/** 영역 드래그 선택 중 표시하는 반투명 마퀴(marquee) 사각형. */
export function drawSelectionMarquee(ctx: CanvasRenderingContext2D, viewport: Viewport, start: Point, end: Point) {
  const a = worldToScreen(viewport, start);
  const b = worldToScreen(viewport, end);
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(a.x - b.x);
  const h = Math.abs(a.y - b.y);

  ctx.save();
  ctx.fillStyle = COLORS.marqueeFill;
  ctx.strokeStyle = COLORS.marqueeStroke;
  ctx.lineWidth = 1;
  // 오른쪽→왼쪽 드래그(닿기만 해도 선택)는 실선, 왼쪽→오른쪽(완전 포함)은 점선으로 구분해 보여준다.
  if (end.x < start.x) ctx.setLineDash([4, 3]);
  ctx.fillRect(x, y, w, h);
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}
