import type { Bounds, Point } from '../types/geometry';
import type { Furniture } from '../types/furniture';
import type { Outlet } from '../types/outlet';
import type { Path } from '../types/path';
import type { TextLabel } from '../types/label';
import type { Polygon } from '../types/polygon';
import type { ObjectKind, SelectionItem } from '../state/floorPlanReducer';
import { furnitureBounds } from './furnitureGeometry';
import { polygonBounds } from './polygonGeometry';

/**
 * 다중 선택 기능이 지금 단계에서 다루는 객체 종류. 벽/문/창문 같은 구조 객체는
 * (요청에서 언급된 대로) 기존 단일 선택 구조를 그대로 유지하고 이번엔 포함하지 않는다.
 */
export type MultiSelectableKind = 'furniture' | 'outlet' | 'path' | 'label' | 'polygon';

export const MULTI_SELECTABLE_KINDS: ReadonlySet<ObjectKind> = new Set<ObjectKind>(['furniture', 'outlet', 'path', 'label', 'polygon']);

export function isMultiSelectable(kind: ObjectKind): kind is MultiSelectableKind {
  return MULTI_SELECTABLE_KINDS.has(kind);
}

interface SelectableData {
  furniture: Furniture[];
  outlets: Outlet[];
  paths: Path[];
  labels: TextLabel[];
  polygons: Polygon[];
}

function pointBounds(p: Point): Bounds {
  return { minX: p.x, minY: p.y, maxX: p.x, maxY: p.y };
}

function mergeBounds(a: Bounds, b: Bounds): Bounds {
  return { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) };
}

function pathBounds(path: Path): Bounds {
  let b = mergeBounds(pointBounds(path.start), pointBounds(path.end));
  if (path.controlPoint) b = mergeBounds(b, pointBounds(path.controlPoint));
  return b;
}

/** 어떤 종류든 객체 하나의 world 기준 경계 상자. 찾지 못하면 null. */
export function boundsForItem(item: SelectionItem, data: SelectableData): Bounds | null {
  switch (item.kind) {
    case 'furniture': {
      const f = data.furniture.find((x) => x.id === item.id);
      return f ? furnitureBounds(f) : null;
    }
    case 'outlet': {
      const o = data.outlets.find((x) => x.id === item.id);
      return o ? pointBounds(o) : null;
    }
    case 'label': {
      const l = data.labels.find((x) => x.id === item.id);
      return l ? pointBounds(l) : null;
    }
    case 'path': {
      const p = data.paths.find((x) => x.id === item.id);
      return p ? pathBounds(p) : null;
    }
    case 'polygon': {
      const p = data.polygons.find((x) => x.id === item.id);
      return p ? polygonBounds(p) : null;
    }
    default:
      return null;
  }
}

/** 다중 선택된 객체 전체를 감싸는 mm 경계 상자. 선택이 비어있거나(또는 못 찾으면) null. */
export function computeSelectionBounds(selection: SelectionItem[], data: SelectableData): Bounds | null {
  let bounds: Bounds | null = null;
  for (const item of selection) {
    const b = boundsForItem(item, data);
    if (!b) continue;
    bounds = bounds ? mergeBounds(bounds, b) : b;
  }
  return bounds;
}

export function boundsCenter(b: Bounds): Point {
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}

export function boundsCorners(b: Bounds): Point[] {
  return [
    { x: b.minX, y: b.minY },
    { x: b.maxX, y: b.minY },
    { x: b.minX, y: b.maxY },
    { x: b.maxX, y: b.maxY },
  ];
}

/** 그룹 이동 스냅 후보로 쓸, 선택 영역을 대표하는 지점들(모서리 4개 + 중심). */
export function selectionKeyPoints(b: Bounds): Point[] {
  return [...boundsCorners(b), boundsCenter(b)];
}

/** point(mm)를 pivot 기준으로 deg(도)만큼 회전한 새 좌표. */
export function rotatePointAround(point: Point, pivot: Point, deg: number): Point {
  const rad = (deg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;
  return { x: pivot.x + dx * cos - dy * sin, y: pivot.y + dx * sin + dy * cos };
}

function rectFromPoints(a: Point, b: Point): Bounds {
  return { minX: Math.min(a.x, b.x), maxX: Math.max(a.x, b.x), minY: Math.min(a.y, b.y), maxY: Math.max(a.y, b.y) };
}

function fullyInside(inner: Bounds, outer: Bounds): boolean {
  return inner.minX >= outer.minX && inner.maxX <= outer.maxX && inner.minY >= outer.minY && inner.maxY <= outer.maxY;
}

function intersects(a: Bounds, b: Bounds): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/**
 * 영역 드래그 선택. 왼쪽→오른쪽 드래그(start.x <= end.x)는 완전히 포함된 객체만,
 * 오른쪽→왼쪽 드래그는 영역에 닿기만 해도 선택한다(흔한 CAD 프로그램 관례).
 * 벽/문/창문은 이번 단계의 다중 선택 대상에서 제외한다(구조 객체는 별도 검토 필요).
 */
export function hitTestBoxSelection(start: Point, end: Point, data: SelectableData): SelectionItem[] {
  const rect = rectFromPoints(start, end);
  const mode: 'contain' | 'intersect' = end.x >= start.x ? 'contain' : 'intersect';
  const test = mode === 'contain' ? fullyInside : intersects;
  const result: SelectionItem[] = [];

  for (const f of data.furniture) if (test(furnitureBounds(f), rect)) result.push({ kind: 'furniture', id: f.id });
  for (const o of data.outlets) if (test(pointBounds(o), rect)) result.push({ kind: 'outlet', id: o.id });
  for (const l of data.labels) if (test(pointBounds(l), rect)) result.push({ kind: 'label', id: l.id });
  for (const p of data.paths) if (test(pathBounds(p), rect)) result.push({ kind: 'path', id: p.id });
  for (const poly of data.polygons) if (test(polygonBounds(poly), rect)) result.push({ kind: 'polygon', id: poly.id });

  return result;
}
