import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture } from '../types/furniture';
import type { Door, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import type { Path } from '../types/path';
import type { TextLabel } from '../types/label';
import type { Polygon } from '../types/polygon';
import type { DimensionLine } from '../types/dimension';
import type { SnapCategoryFlags } from '../config/constants';
import { openingEndpoints } from './openingGeometry';
import { furnitureEdgeMidpoints, toWorldPolygon } from './furnitureGeometry';
import { pathKeyPoints } from './pathGeometry';
import { wallKeyPoints } from './wallGeometry';
import { polygonKeyPoints } from './polygonGeometry';
import { dimensionKeyPoints } from './dimensionGeometry';

export interface SnapSourceEntities {
  walls: Wall[];
  furniture: Furniture[];
  doors: Door[];
  windows: WindowOpening[];
  outlets: Outlet[];
  paths: Path[];
  labels?: TextLabel[];
  polygons?: Polygon[];
  dimensions?: DimensionLine[];
}

export interface SnapExclude {
  wallId?: string;
  furnitureId?: string;
  pathId?: string;
  labelId?: string;
  polygonId?: string;
  dimensionId?: string;
  /** 다중 선택 이동/회전 중 그룹 전체를 후보에서 뺄 때 쓴다(단수 필드와 함께 적용됨). */
  furnitureIds?: string[];
  pathIds?: string[];
  labelIds?: string[];
  polygonIds?: string[];
  dimensionIds?: string[];
  wallIds?: string[];
}

/**
 * 스냅 후보점을 모은다 — CAD처럼 "끝점 / 중심점 / 모서리" 세 카테고리를 각각 켜고 끌 수 있다.
 * - 끝점: 벽 시작·끝·중간점, 문/창문 구간 끝점, 콘센트 위치, 동선 시작·끝·중간점(곡선은 조절점·
 *   곡선 중간 대표점도 포함), 라벨 위치, 다각형 꼭짓점·변 중간점
 * - 중심점: 가구 중심, 다각형 중심
 * - 모서리: 가구(사각형/ㄱ자)의 회전된 바운딩 도형 꼭짓점 + 각 변의 중간점 (원은 모서리가 없어 제외)
 * exclude로 지금 드래그 중인 객체 자신은 후보에서 뺄 수 있다(자기 자신에게 들러붙는 것 방지).
 */
export function collectSnapCandidates(
  { walls, furniture, doors, windows, outlets, paths, labels = [], polygons = [], dimensions = [] }: SnapSourceEntities,
  categories: SnapCategoryFlags,
  exclude: SnapExclude = {},
): Point[] {
  const points: Point[] = [];

  if (categories.endpoint) {
    for (const wall of walls) {
      if (wall.id === exclude.wallId || exclude.wallIds?.includes(wall.id)) continue;
      points.push(...wallKeyPoints(wall));
    }
    for (const door of doors) {
      const wall = walls.find((w) => w.id === door.wallId);
      if (!wall) continue;
      const { start, end } = openingEndpoints(wall, door.offsetMm, door.widthMm);
      points.push(start, end);
    }
    for (const win of windows) {
      const wall = walls.find((w) => w.id === win.wallId);
      if (!wall) continue;
      const { start, end } = openingEndpoints(wall, win.offsetMm, win.widthMm);
      points.push(start, end);
    }
    for (const outlet of outlets) points.push({ x: outlet.x, y: outlet.y });
    for (const path of paths) {
      if (path.id === exclude.pathId || exclude.pathIds?.includes(path.id)) continue;
      points.push(...pathKeyPoints(path));
    }
    for (const label of labels) {
      if (label.id === exclude.labelId || exclude.labelIds?.includes(label.id)) continue;
      points.push({ x: label.x, y: label.y });
    }
    for (const polygon of polygons) {
      if (polygon.id === exclude.polygonId || exclude.polygonIds?.includes(polygon.id)) continue;
      points.push(...polygonKeyPoints(polygon));
    }
    for (const dim of dimensions) {
      if (dim.id === exclude.dimensionId || exclude.dimensionIds?.includes(dim.id)) continue;
      points.push(...dimensionKeyPoints(dim));
    }
  }

  if (categories.center) {
    for (const item of furniture) {
      if (item.id === exclude.furnitureId || exclude.furnitureIds?.includes(item.id)) continue;
      points.push({ x: item.x, y: item.y });
    }
  }

  if (categories.corner) {
    for (const item of furniture) {
      if (item.id === exclude.furnitureId || exclude.furnitureIds?.includes(item.id)) continue;
      const polygon = toWorldPolygon(item);
      if (polygon) points.push(...polygon, ...furnitureEdgeMidpoints(item));
    }
  }

  return points;
}
