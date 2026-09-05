import type { Size } from '../types/geometry';
import { COLORS, RULER_THICKNESS_PX } from '../config/constants';
import { screenToWorld, type Viewport } from './viewport';
import { pickGridStepMm } from './grid';
import { formatLengthMm, type DisplayUnit } from './units';

/**
 * 캔버스 상단·좌측에 눈금자를 그린다. 실제 격자 간격(mm)은 항상 그대로이며,
 * 라벨에 표시되는 단위(mm/cm/m)만 unit에 따라 바뀐다.
 * 격자와 같은 간격(pickGridStepMm)을 사용해 격자선과 눈금이 항상 일치한다.
 */
export function drawRulers(ctx: CanvasRenderingContext2D, viewport: Viewport, canvasSize: Size, unit: DisplayUnit) {
  const step = pickGridStepMm(viewport.scale);
  const topLeft = screenToWorld(viewport, { x: 0, y: 0 });
  const bottomRight = screenToWorld(viewport, { x: canvasSize.width, y: canvasSize.height });

  ctx.save();
  ctx.font = '10px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = COLORS.rulerText;
  ctx.strokeStyle = COLORS.rulerBorder;
  ctx.lineWidth = 1;

  // 상단 눈금자 배경
  ctx.fillStyle = COLORS.rulerBackground;
  ctx.fillRect(0, 0, canvasSize.width, RULER_THICKNESS_PX);
  // 좌측 눈금자 배경
  ctx.fillRect(0, 0, RULER_THICKNESS_PX, canvasSize.height);

  ctx.beginPath();
  ctx.moveTo(0, RULER_THICKNESS_PX + 0.5);
  ctx.lineTo(canvasSize.width, RULER_THICKNESS_PX + 0.5);
  ctx.moveTo(RULER_THICKNESS_PX + 0.5, 0);
  ctx.lineTo(RULER_THICKNESS_PX + 0.5, canvasSize.height);
  ctx.stroke();

  ctx.fillStyle = COLORS.rulerText;

  const startX = Math.floor(topLeft.x / step) * step;
  for (let worldX = startX; worldX <= bottomRight.x; worldX += step) {
    const screenX = worldX * viewport.scale + viewport.pan.x;
    ctx.beginPath();
    ctx.moveTo(Math.round(screenX) + 0.5, RULER_THICKNESS_PX - 6);
    ctx.lineTo(Math.round(screenX) + 0.5, RULER_THICKNESS_PX);
    ctx.stroke();
    ctx.fillText(formatLengthMm(worldX, unit), screenX + 3, RULER_THICKNESS_PX - 8);
  }

  const startY = Math.floor(topLeft.y / step) * step;
  for (let worldY = startY; worldY <= bottomRight.y; worldY += step) {
    const screenY = worldY * viewport.scale + viewport.pan.y;
    ctx.beginPath();
    ctx.moveTo(RULER_THICKNESS_PX - 6, Math.round(screenY) + 0.5);
    ctx.lineTo(RULER_THICKNESS_PX, Math.round(screenY) + 0.5);
    ctx.stroke();

    ctx.save();
    ctx.translate(RULER_THICKNESS_PX - 8, screenY - 3);
    ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'right';
    ctx.fillText(formatLengthMm(worldY, unit), 0, 0);
    ctx.restore();
  }

  // 좌상단 모서리(두 눈금자가 겹치는 자리)
  ctx.fillStyle = COLORS.rulerBackground;
  ctx.fillRect(0, 0, RULER_THICKNESS_PX, RULER_THICKNESS_PX);
  ctx.strokeRect(0.5, 0.5, RULER_THICKNESS_PX, RULER_THICKNESS_PX);

  ctx.restore();
}
