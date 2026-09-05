import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture } from '../types/furniture';
import type { Door, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import type { Path } from '../types/path';
import type { SnapCategoryFlags } from '../config/constants';
import { openingEndpoints } from './openingGeometry';
import { toWorldPolygon } from './furnitureGeometry';

export interface SnapSourceEntities {
  walls: Wall[];
  furniture: Furniture[];
  doors: Door[];
  windows: WindowOpening[];
  outlets: Outlet[];
  paths: Path[];
}

export interface SnapExclude {
  wallId?: string;
  furnitureId?: string;
  pathId?: string;
  /** 다중 선택 이동/회전 중 그룹 전체를 후보에서 뺄 때 쓴다(furnitureId/pathId와 함께 적용됨). */
  furnitureIds?: string[];
  pathIds?: string[];
}

/**
 * 스냅 후보점을 모은다 — CAD처럼 "끝점 / 중심점 / 모서리" 세 카테고리를 각각 켜고 끌 수 있다.
 * - 끝점: 벽 끝점, 문/창문 구간 끝점, 콘센트 위치, 동선 시작·끝점
 * - 중심점: 가구 중심
 * - 모서리: 가구(사각형/ㄱ자)의 회전된 바운딩 도형 꼭짓점 (원은 모서리가 없어 제외)
 * exclude로 지금 드래그 중인 객체 자신은 후보에서 뺄 수 있다(자기 자신에게 들러붙는 것 방지).
 */
export function collectSnapCandidates(
  { walls, furniture, doors, windows, outlets, paths }: SnapSourceEntities,
  categories: SnapCategoryFlags,
  exclude: SnapExclude = {},
): Point[] {
  const points: Point[] = [];

  if (categories.endpoint) {
    for (const wall of walls) {
      if (wall.id === exclude.wallId) continue;
      points.push(wall.start, wall.end);
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
      points.push(path.start, path.end);
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
      if (polygon) points.push(...polygon);
    }
  }

  return points;
}
