import type { Bounds, Size } from '../types/geometry';
import { COLORS } from '../config/constants';
import { worldToScreen, type Viewport } from './viewport';

/**
 * 1단계(캔버스/좌표계) 검증용 예시 데이터.
 * 스펙 예시와 동일한 4000×3000mm 방 + 2000×1000mm 가구를 그려서
 * "화면 비율 = 실제 치수 비율"이 맞는지 눈으로 바로 확인할 수 있게 한다.
 * 2단계(벽 작성)부터는 실제 Wall 데이터로 대체된다.
 */
const DEMO_ROOM: Size = { width: 4000, height: 3000 };
const DEMO_FURNITURE = {
  name: '침대',
  x: 300, // 방 내부 기준 x (mm)
  y: 300, // 방 내부 기준 y (mm)
  width: 2000,
  height: 1000,
};

export const DEMO_BOUNDS: Bounds = {
  minX: -500,
  minY: -500,
  maxX: DEMO_ROOM.width + 500,
  maxY: DEMO_ROOM.height + 500,
};

export function drawDemoScene(ctx: CanvasRenderingContext2D, viewport: Viewport) {
  drawRoomRect(ctx, viewport, { x: 0, y: 0 }, DEMO_ROOM, `방 ${DEMO_ROOM.width}×${DEMO_ROOM.height}mm`);
  drawRoomRect(
    ctx,
    viewport,
    { x: DEMO_FURNITURE.x, y: DEMO_FURNITURE.y },
    { width: DEMO_FURNITURE.width, height: DEMO_FURNITURE.height },
    `${DEMO_FURNITURE.name} ${DEMO_FURNITURE.width}×${DEMO_FURNITURE.height}mm`,
    true,
  );
}

function drawRoomRect(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  origin: { x: number; y: number },
  size: Size,
  label: string,
  isFurniture = false,
) {
  const topLeft = worldToScreen(viewport, origin);
  const bottomRight = worldToScreen(viewport, { x: origin.x + size.width, y: origin.y + size.height });
  const w = bottomRight.x - topLeft.x;
  const h = bottomRight.y - topLeft.y;

  ctx.fillStyle = isFurniture ? COLORS.demoFurnitureFill : COLORS.demoRoomFill;
  ctx.strokeStyle = isFurniture ? COLORS.demoFurnitureStroke : COLORS.demoRoomStroke;
  ctx.lineWidth = isFurniture ? 2 : 3;
  ctx.fillRect(topLeft.x, topLeft.y, w, h);
  ctx.strokeRect(topLeft.x, topLeft.y, w, h);

  ctx.fillStyle = COLORS.demoFurnitureText;
  ctx.font = '12px system-ui, -apple-system, sans-serif';
  ctx.fillText(label, topLeft.x + 6, topLeft.y + 16);
}
