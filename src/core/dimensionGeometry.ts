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

/**
 * 사용자가 라벨을 드래그해 labelOffset을 옮겨두면, 숫자만 옮겨지는 게 아니라 치수선(눈금 포함)
 * 과 라벨이 하나의 단위로 함께 옮겨진다 — 측정 대상 점(start/end)은 그대로 두고, 보조선
 * (연장선)이 그 고정된 측정점에서 옮겨진 치수선까지 새로 이어진다. 'straight' 모드는 원래
 * 보조선이 없었지만(치수선이 측정선 그 자체), 치수선이 옮겨지면 측정점과 분리되므로 이때는
 * 보조선을 새로 만들어 이어준다.
 */
export function computeDisplacedDimensionGeometry(
  dim: Pick<DimensionLine, 'start' | 'end' | 'mode' | 'labelOffset'>,
): DimensionGeometry {
  const base = computeDimensionGeometry(dim);
  const offset = dim.labelOffset;
  if (!offset || (offset.x === 0 && offset.y === 0)) return base;

  const shift = (p: Point): Point => ({ x: p.x + offset.x, y: p.y + offset.y });
  const lineStart = shift(base.lineStart);
  const lineEnd = shift(base.lineEnd);

  const extensionLines: [Point, Point][] =
    dim.mode === 'straight'
      ? [
          [dim.start, lineStart],
          [dim.end, lineEnd],
        ]
      : base.extensionLines.map(([measurePoint, lineSidePoint]) => [measurePoint, shift(lineSidePoint)]);

  return {
    lineStart,
    lineEnd,
    extensionLines,
    valueMm: base.valueMm, // 측정값은 옮겨져도 그대로 — 실제 거리는 항상 start/end 기준
    labelPosition: shift(base.labelPosition),
  };
}

/** 치수선(보조선 포함, 라벨과 함께 옮겨진 상태 반영)을 클릭으로 선택하기 위한 히트테스트. */
export function hitTestDimensions(point: Point, dimensions: DimensionLine[], toleranceMm: number): DimensionLine | null {
  for (let i = dimensions.length - 1; i >= 0; i--) {
    const dim = dimensions[i];
    const geo = computeDisplacedDimensionGeometry(dim);
    if (distanceToSegment(point, geo.lineStart, geo.lineEnd) <= toleranceMm) return dim;
    for (const [a, b] of geo.extensionLines) {
      if (distanceToSegment(point, a, b) <= toleranceMm) return dim;
    }
  }
  return null;
}

/** 치수선을 이동할 때 스냅 후보로 함께 검사할 주요 기준점 — 측정 대상 시작점·끝점·중간점.
 * (라벨/치수선의 표시 위치가 옮겨져 있어도 실제 측정점은 그대로이므로 이 값은 영향받지 않는다.) */
export function dimensionKeyPoints(dim: Pick<DimensionLine, 'start' | 'end'>): Point[] {
  return [dim.start, dim.end, { x: (dim.start.x + dim.end.x) / 2, y: (dim.start.y + dim.end.y) / 2 }];
}

/**
 * 실제로 화면에 그릴 숫자(거리) 라벨의 위치(mm) — 치수선과 함께 옮겨진 위치를 그대로 쓴다.
 * 측정 대상 점(start/end)과는 무관하다.
 */
export function dimensionLabelPosition(dim: Pick<DimensionLine, 'start' | 'end' | 'mode' | 'labelOffset'>): Point {
  return computeDisplacedDimensionGeometry(dim).labelPosition;
}
