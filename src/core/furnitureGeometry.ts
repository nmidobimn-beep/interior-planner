import type { Bounds, Point } from '../types/geometry';
import type { Furniture } from '../types/furniture';
import { DEFAULT_ARM_THICKNESS_MM, ROTATION_HANDLE_OFFSET_MM } from '../config/constants';

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rotate(point: Point, angleDeg: number): Point {
  const rad = toRad(angleDeg);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return { x: point.x * cos - point.y * sin, y: point.x * sin + point.y * cos };
}

/**
 * 도형 중심을 원점으로 하는 회전 전(local) 좌표계의 꼭짓점.
 * 'circle'은 다각형이 아니므로 null.
 */
export function localPolygon(furniture: Pick<Furniture, 'shape' | 'width' | 'height' | 'armThicknessMm'>): Point[] | null {
  const { width, height } = furniture;
  const hw = width / 2;
  const hh = height / 2;

  if (furniture.shape === 'rectangle') {
    return [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: hh },
      { x: -hw, y: hh },
    ];
  }

  if (furniture.shape === 'lshape') {
    const t = Math.min(furniture.armThicknessMm ?? DEFAULT_ARM_THICKNESS_MM, width, height);
    return [
      { x: -hw, y: -hh },
      { x: hw, y: -hh },
      { x: hw, y: -hh + t },
      { x: -hw + t, y: -hh + t },
      { x: -hw + t, y: hh },
      { x: -hw, y: hh },
    ];
  }

  return null; // circle
}

/** local 다각형을 회전·이동해 world(mm) 좌표로 바꾼다. */
export function toWorldPolygon(furniture: Furniture): Point[] | null {
  const local = localPolygon(furniture);
  if (!local) return null;
  return local.map((p) => {
    const r = rotate(p, furniture.rotationDeg);
    return { x: r.x + furniture.x, y: r.y + furniture.y };
  });
}

/** world 좌표의 점을 도형의 회전 전 local 좌표계로 되돌린다 (히트테스트용). */
export function toLocalPoint(point: Point, furniture: Furniture): Point {
  const dx = point.x - furniture.x;
  const dy = point.y - furniture.y;
  return rotate({ x: dx, y: dy }, -furniture.rotationDeg);
}

function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i];
    const b = polygon[j];
    const intersects = a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function isPointInFurniture(point: Point, furniture: Furniture): boolean {
  const local = toLocalPoint(point, furniture);

  if (furniture.shape === 'circle') {
    return Math.hypot(local.x, local.y) <= furniture.width / 2;
  }

  const polygon = localPolygon(furniture);
  return polygon ? pointInPolygon(local, polygon) : false;
}

/** 여러 가구 중 point(mm)를 포함하는 가구를 찾는다 (나중에 추가된 것을 위로 간주). */
export function hitTestFurnitureList(point: Point, furnitureList: Furniture[]): Furniture | null {
  for (let i = furnitureList.length - 1; i >= 0; i--) {
    if (isPointInFurniture(point, furnitureList[i])) return furnitureList[i];
  }
  return null;
}

/** 회전 손잡이의 world 좌표 (도형 위쪽으로 ROTATION_HANDLE_OFFSET_MM만큼 떨어진 지점). */
export function rotationHandleWorldPoint(furniture: Furniture): Point {
  const local = { x: 0, y: -furniture.height / 2 - ROTATION_HANDLE_OFFSET_MM };
  const r = rotate(local, furniture.rotationDeg);
  return { x: r.x + furniture.x, y: r.y + furniture.y };
}

/** 가구의 world 기준 경계 상자 (전체보기 계산용). */
export function furnitureBounds(furniture: Furniture): Bounds {
  if (furniture.shape === 'circle') {
    const r = furniture.width / 2;
    return { minX: furniture.x - r, minY: furniture.y - r, maxX: furniture.x + r, maxY: furniture.y + r };
  }

  const points = toWorldPolygon(furniture) ?? [{ x: furniture.x, y: furniture.y }];
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}
