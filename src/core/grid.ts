import type { Size } from '../types/geometry';
import { COLORS, GRID_NICE_STEPS_MM, MIN_GRID_PIXEL_SPACING } from '../config/constants';
import { screenToWorld, type Viewport } from './viewport';

/** 화면상 최소 간격(MIN_GRID_PIXEL_SPACING)을 만족하는 가장 촘촘한 "보기 좋은" mm 간격을 고른다. */
export function pickGridStepMm(scale: number, minPixelSpacing: number = MIN_GRID_PIXEL_SPACING): number {
  for (const step of GRID_NICE_STEPS_MM) {
    if (step * scale >= minPixelSpacing) return step;
  }
  return GRID_NICE_STEPS_MM[GRID_NICE_STEPS_MM.length - 1];
}

function drawGridLines(
  ctx: CanvasRenderingContext2D,
  viewport: Viewport,
  canvasSize: Size,
  stepMm: number,
  color: string,
) {
  const topLeft = screenToWorld(viewport, { x: 0, y: 0 });
  const bottomRight = screenToWorld(viewport, { x: canvasSize.width, y: canvasSize.height });

  const startX = Math.floor(topLeft.x / stepMm) * stepMm;
  const startY = Math.floor(topLeft.y / stepMm) * stepMm;

  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.beginPath();

  for (let worldX = startX; worldX <= bottomRight.x; worldX += stepMm) {
    const screenX = Math.round(worldX * viewport.scale + viewport.pan.x) + 0.5;
    ctx.moveTo(screenX, 0);
    ctx.lineTo(screenX, canvasSize.height);
  }
  for (let worldY = startY; worldY <= bottomRight.y; worldY += stepMm) {
    const screenY = Math.round(worldY * viewport.scale + viewport.pan.y) + 0.5;
    ctx.moveTo(0, screenY);
    ctx.lineTo(canvasSize.width, screenY);
  }
  ctx.stroke();
}

/** mm 격자(보조선 + 주선)와 원점을 지나는 축선을 그린다. */
export function drawGrid(ctx: CanvasRenderingContext2D, viewport: Viewport, canvasSize: Size) {
  const majorStep = pickGridStepMm(viewport.scale);
  const minorStep = majorStep / 5;

  if (minorStep * viewport.scale >= MIN_GRID_PIXEL_SPACING / 3) {
    drawGridLines(ctx, viewport, canvasSize, minorStep, COLORS.gridMinor);
  }
  drawGridLines(ctx, viewport, canvasSize, majorStep, COLORS.gridMajor);
  drawAxes(ctx, viewport, canvasSize);
}

/** 월드 원점(0,0)을 지나는 X/Y 축을 강조 표시한다 (좌표계 방향 확인용). */
function drawAxes(ctx: CanvasRenderingContext2D, viewport: Viewport, canvasSize: Size) {
  const origin = {
    x: viewport.pan.x,
    y: viewport.pan.y,
  };

  ctx.lineWidth = 1.5;

  if (origin.y >= 0 && origin.y <= canvasSize.height) {
    ctx.strokeStyle = COLORS.axisX;
    ctx.beginPath();
    ctx.moveTo(0, Math.round(origin.y) + 0.5);
    ctx.lineTo(canvasSize.width, Math.round(origin.y) + 0.5);
    ctx.stroke();
  }
  if (origin.x >= 0 && origin.x <= canvasSize.width) {
    ctx.strokeStyle = COLORS.axisY;
    ctx.beginPath();
    ctx.moveTo(Math.round(origin.x) + 0.5, 0);
    ctx.lineTo(Math.round(origin.x) + 0.5, canvasSize.height);
    ctx.stroke();
  }
}
