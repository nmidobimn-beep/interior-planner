import type { Point } from '../types/geometry';
import type { DimensionLine } from '../types/dimension';
import { DIMENSION_OFFSET_MM } from '../config/constants';
import { distance, distanceToSegment } from './wallGeometry';

export interface DimensionGeometry {
  /** 실제로 화면에 그려지는 치수선의 두 끝점(mm). 'straight'는 start/end와 같다. */
  lineStart: Point;
  lineEnd: Point;
  /** 측정 대상 점(start/end)에서 치수선까지 이어지는 보조선(연장선). 'straight'는 빈 배열. */
  extensionLines: [Point, Point][];
  /** 라벨에 표시할 실제 거리(mm) — mode에 따라 직선/가로/세로 거리. */
  valueMm: number;
  /** 텍스트 라벨을 놓을 위치(mm) — 치수선 중점에서 살짝 띄운 지점. */
  labelPosition: Point;
}

/**
 * mode에 따라 실제로 그릴 치수선/보조선/라벨 위치와 표시할 거리 값을 계산한다.
 * - straight: 두 점을 그대로 잇는다.
 * - horizontal: 두 점보다 위쪽(작은 y)에 가로 치수선을 그리고, 각 점에서 세로 보조선을 내린다.
 * - vertical: 두 점보다 왼쪽(작은 x)에 세로 치수선을 그리고, 각 점에서 가로 보조선을 낸다.
 */
export function computeDimensionGeometry(dim: Pick<DimensionLine, 'start' | 'end' | 'mode'>): DimensionGeometry {
  const { start, end, mode } = dim;

  if (mode === 'horizontal') {
    const dimY = Math.min(start.y, end.y) - DIMENSION_OFFSET_MM;
    const lineStart = { x: start.x, y: dimY };
    const lineEnd = { x: end.x, y: dimY };
    return {
      lineStart,
      lineEnd,
      extensionLines: [
        [start, { x: start.x, y: dimY }],
        [end, { x: end.x, y: dimY }],
      ],
      valueMm: Math.abs(end.x - start.x),
      labelPosition: { x: (lineStart.x + lineEnd.x) / 2, y: dimY },
    };
  }

  if (mode === 'vertical') {
    const dimX = Math.min(start.x, end.x) - DIMENSION_OFFSET_MM;
    const lineStart = { x: dimX, y: start.y };
    const lineEnd = { x: dimX, y: end.y };
    return {
      lineStart,
      lineEnd,
      extensionLines: [
        [start, { x: dimX, y: start.y }],
        [end, { x: dimX, y: end.y }],
      ],
      valueMm: Math.abs(end.y - start.y),
      labelPosition: { x: dimX, y: (lineStart.y + lineEnd.y) / 2 },
    };
  }

  // straight
  return {
    lineStart: start,
    lineEnd: end,
    extensionLines: [],
    valueMm: distance(start, end),
    labelPosition: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
  };
}

/** 치수선(보조선 포함)을 클릭으로 선택하기 위한 히트테스트. */
export function hitTestDimensions(point: Point, dimensions: DimensionLine[], toleranceMm: number): DimensionLine | null {
  for (let i = dimensions.length - 1; i >= 0; i--) {
    const dim = dimensions[i];
    const geo = computeDimensionGeometry(dim);
    if (distanceToSegment(point, geo.lineStart, geo.lineEnd) <= toleranceMm) return dim;
    for (const [a, b] of geo.extensionLines) {
      if (distanceToSegment(point, a, b) <= toleranceMm) return dim;
    }
  }
  return null;
}

/** 치수선을 이동할 때 스냅 후보로 함께 검사할 주요 기준점 — 측정 대상 시작점·끝점·중간점. */
export function dimensionKeyPoints(dim: Pick<DimensionLine, 'start' | 'end'>): Point[] {
  return [dim.start, dim.end, { x: (dim.start.x + dim.end.x) / 2, y: (dim.start.y + dim.end.y) / 2 }];
}

/**
 * 실제로 화면에 그릴 숫자(거리) 라벨의 위치(mm) — 기본 위치(치수선 중점 등)에 사용자가
 * 드래그로 옮겨둔 labelOffset을 더한 값이다. 측정 대상 점(start/end)과는 무관하다.
 */
export function dimensionLabelPosition(dim: Pick<DimensionLine, 'start' | 'end' | 'mode' | 'labelOffset'>): Point {
  const geo = computeDimensionGeometry(dim);
  const offset = dim.labelOffset ?? { x: 0, y: 0 };
  return { x: geo.labelPosition.x + offset.x, y: geo.labelPosition.y + offset.y };
}
