import type { Bounds, Point, ScreenPoint, Size } from '../types/geometry';
import { FIT_PADDING_PX, MAX_SCALE, MIN_SCALE } from '../config/constants';

/**
 * 뷰포트(카메라) 상태.
 * - scale: 화면 px / 실제 mm
 * - pan: 월드 원점(0mm, 0mm)이 찍히는 화면 좌표(px)
 *
 * 확대/축소·화면 이동은 이 값만 바꾼다. 객체의 실제 mm 크기 데이터는 절대 변경하지 않는다.
 */
export interface Viewport {
  scale: number;
  pan: ScreenPoint;
}

export function worldToScreen(viewport: Viewport, world: Point): ScreenPoint {
  return {
    x: world.x * viewport.scale + viewport.pan.x,
    y: world.y * viewport.scale + viewport.pan.y,
  };
}

export function screenToWorld(viewport: Viewport, screen: ScreenPoint): Point {
  return {
    x: (screen.x - viewport.pan.x) / viewport.scale,
    y: (screen.y - viewport.pan.y) / viewport.scale,
  };
}

export function clampScale(scale: number): number {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, scale));
}

/** cursor(화면 좌표) 아래의 월드 좌표를 고정한 채 확대/축소한다. */
export function zoomAt(viewport: Viewport, cursor: ScreenPoint, factor: number): Viewport {
  const newScale = clampScale(viewport.scale * factor);
  if (newScale === viewport.scale) return viewport;

  const worldAtCursor = screenToWorld(viewport, cursor);
  return {
    scale: newScale,
    pan: {
      x: cursor.x - worldAtCursor.x * newScale,
      y: cursor.y - worldAtCursor.y * newScale,
    },
  };
}

export function panBy(viewport: Viewport, dx: number, dy: number): Viewport {
  return {
    scale: viewport.scale,
    pan: { x: viewport.pan.x + dx, y: viewport.pan.y + dy },
  };
}

/** 주어진 실제 영역(mm)이 캔버스 안에 여백을 두고 꽉 차도록 뷰포트를 계산한다. */
export function fitBounds(bounds: Bounds, canvasSize: Size, paddingPx: number = FIT_PADDING_PX): Viewport {
  const worldWidth = Math.max(1, bounds.maxX - bounds.minX);
  const worldHeight = Math.max(1, bounds.maxY - bounds.minY);

  const availableWidth = Math.max(1, canvasSize.width - paddingPx * 2);
  const availableHeight = Math.max(1, canvasSize.height - paddingPx * 2);

  const scale = clampScale(Math.min(availableWidth / worldWidth, availableHeight / worldHeight));

  const worldCenter: Point = {
    x: (bounds.minX + bounds.maxX) / 2,
    y: (bounds.minY + bounds.maxY) / 2,
  };

  return {
    scale,
    pan: {
      x: canvasSize.width / 2 - worldCenter.x * scale,
      y: canvasSize.height / 2 - worldCenter.y * scale,
    },
  };
}
