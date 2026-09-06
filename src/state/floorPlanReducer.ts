import type { Furniture } from '../types/furniture';
import type { Wall } from '../types/wall';
import type { Door, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import type { Layer } from '../types/layer';
import type { Path } from '../types/path';
import type { TextLabel } from '../types/label';
import type { Polygon } from '../types/polygon';
import type { DimensionLine } from '../types/dimension';
import type { WallMergePayload } from '../core/wallMerge';
import { createHistoryReducer } from './history';

export type ObjectKind = 'wall' | 'furniture' | 'door' | 'window' | 'outlet' | 'path' | 'label' | 'polygon' | 'dimension';
export type SelectedObject = { kind: ObjectKind; id: string } | null;
/** 다중 선택 목록의 항목 하나. null을 허용하지 않는 SelectedObject라고 보면 된다. */
export type SelectionItem = { kind: ObjectKind; id: string };

/** CO(복사) 명령 등에서 여러 객체를 한 번에 추가할 때 쓰는 항목 하나. */
export type AddManyEntry =
  | { kind: 'wall'; data: Wall }
  | { kind: 'furniture'; data: Furniture }
  | { kind: 'door'; data: Door }
  | { kind: 'window'; data: WindowOpening }
  | { kind: 'outlet'; data: Outlet }
  | { kind: 'path'; data: Path }
  | { kind: 'label'; data: TextLabel }
  | { kind: 'polygon'; data: Polygon }
  | { kind: 'dimension'; data: DimensionLine };

/** 새 프로젝트에 항상 존재하는 첫 레이어의 고정 id (마지막 레이어는 삭제할 수 없어 항상 최소 1개 존재). */
export const DEFAULT_LAYER_ID = 'layer-default';

/**
 * 도면의 모든 객체를 담는 단일 상태.
 * 5단계(Undo/Redo)에서 이 reducer의 액션 로그를 그대로 히스토리로 쓴다.
 *
 * 선택 상태는 `selection`(배열) 하나로 관리한다 — 0개면 선택 없음, 1개면 기존과 동일한
 * "단일 선택", 2개 이상이면 다중 선택이다. 기존에 selectedObject(단일)를 쓰던 코드는
 * useFloorPlan에서 `selection.length === 1 ? selection[0] : null`로 그대로 파생해 쓰므로
 * 변경 없이 동작한다.
 */
export interface FloorPlanState {
  walls: Wall[];
  furniture: Furniture[];
  doors: Door[];
  windows: WindowOpening[];
  outlets: Outlet[];
  paths: Path[];
  labels: TextLabel[];
  polygons: Polygon[];
  dimensions: DimensionLine[];
  layers: Layer[];
  activeLayerId: string;
  selection: SelectionItem[];
}

export const initialFloorPlanState: FloorPlanState = {
  walls: [],
  furniture: [],
  doors: [],
  windows: [],
  outlets: [],
  paths: [],
  labels: [],
  polygons: [],
  dimensions: [],
  layers: [{ id: DEFAULT_LAYER_ID, name: '레이어 1', visible: true }],
  activeLayerId: DEFAULT_LAYER_ID,
  selection: [],
};

export type FloorPlanAction =
  | { type: 'ADD_WALL'; wall: Wall }
  | { type: 'UPDATE_WALL'; id: string; patch: Partial<Omit<Wall, 'id'>>; transient?: boolean }
  | { type: 'DELETE_WALL'; id: string }
  | { type: 'ADD_FURNITURE'; furniture: Furniture }
  | { type: 'UPDATE_FURNITURE'; id: string; patch: Partial<Omit<Furniture, 'id'>>; transient?: boolean }
  | { type: 'DELETE_FURNITURE'; id: string }
  | { type: 'ADD_DOOR'; door: Door }
  | { type: 'UPDATE_DOOR'; id: string; patch: Partial<Omit<Door, 'id'>>; transient?: boolean }
  | { type: 'DELETE_DOOR'; id: string }
  | { type: 'ADD_WINDOW'; window: WindowOpening }
  | { type: 'UPDATE_WINDOW'; id: string; patch: Partial<Omit<WindowOpening, 'id'>>; transient?: boolean }
  | { type: 'DELETE_WINDOW'; id: string }
  | { type: 'ADD_OUTLET'; outlet: Outlet }
  | { type: 'UPDATE_OUTLET'; id: string; patch: Partial<Omit<Outlet, 'id'>>; transient?: boolean }
  | { type: 'DELETE_OUTLET'; id: string }
  | { type: 'ADD_PATH'; path: Path }
  | { type: 'UPDATE_PATH'; id: string; patch: Partial<Omit<Path, 'id'>>; transient?: boolean }
  | { type: 'DELETE_PATH'; id: string }
  | { type: 'ADD_LABEL'; label: TextLabel }
  | { type: 'UPDATE_LABEL'; id: string; patch: Partial<Omit<TextLabel, 'id'>>; transient?: boolean }
  | { type: 'DELETE_LABEL'; id: string }
  | { type: 'ADD_POLYGON'; polygon: Polygon }
  | { type: 'UPDATE_POLYGON'; id: string; patch: Partial<Omit<Polygon, 'id'>>; transient?: boolean }
  | { type: 'DELETE_POLYGON'; id: string }
  | { type: 'ADD_DIMENSION'; dimension: DimensionLine }
  | { type: 'UPDATE_DIMENSION'; id: string; patch: Partial<Omit<DimensionLine, 'id'>>; transient?: boolean }
  | { type: 'DELETE_DIMENSION'; id: string }
  | { type: 'DELETE_MANY'; items: SelectionItem[] }
  | { type: 'SELECT_OBJECT'; selection: SelectedObject }
  | { type: 'TOGGLE_SELECT_OBJECT'; item: SelectionItem }
  | { type: 'SET_SELECTION'; items: SelectionItem[] }
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'RENAME_LAYER'; id: string; name: string }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; id: string }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'SET_ACTIVE_LAYER'; id: string }
  | { type: 'MOVE_OBJECT_TO_LAYER'; kind: ObjectKind; id: string; layerId: string }
  | { type: 'MERGE_WALLS'; payload: WallMergePayload }
  | { type: 'ADD_MANY'; entries: AddManyEntry[] }
  | { type: 'DUPLICATE_LAYER'; newLayer: Layer; entries: AddManyEntry[] };

function removeFromSelection(selection: SelectionItem[], kind: ObjectKind, id: string): SelectionItem[] {
  return selection.filter((item) => !(item.kind === kind && item.id === id));
}

export function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  switch (action.type) {
    case 'ADD_WALL':
      return {
        ...state,
        walls: [...state.walls, action.wall],
        selection: [{ kind: 'wall', id: action.wall.id }],
      };

    case 'UPDATE_WALL':
      return {
        ...state,
        walls: state.walls.map((wall) => (wall.id === action.id ? { ...wall, ...action.patch } : wall)),
      };

    case 'DELETE_WALL':
      // 벽이 사라지면 그 벽에 달려 있던 문/창문도 함께 삭제한다 (허공에 뜬 문/창문 방지).
      return {
        ...state,
        walls: state.walls.filter((wall) => wall.id !== action.id),
        doors: state.doors.filter((door) => door.wallId !== action.id),
        windows: state.windows.filter((win) => win.wallId !== action.id),
        selection: removeFromSelection(state.selection, 'wall', action.id),
      };

    case 'ADD_FURNITURE':
      return {
        ...state,
        furniture: [...state.furniture, action.furniture],
        selection: [{ kind: 'furniture', id: action.furniture.id }],
      };

    case 'UPDATE_FURNITURE':
      return {
        ...state,
        furniture: state.furniture.map((item) => (item.id === action.id ? { ...item, ...action.patch } : item)),
      };

    case 'DELETE_FURNITURE':
      return {
        ...state,
        furniture: state.furniture.filter((item) => item.id !== action.id),
        selection: removeFromSelection(state.selection, 'furniture', action.id),
      };

    case 'ADD_DOOR':
      return { ...state, doors: [...state.doors, action.door], selection: [{ kind: 'door', id: action.door.id }] };

    case 'UPDATE_DOOR':
      return { ...state, doors: state.doors.map((door) => (door.id === action.id ? { ...door, ...action.patch } : door)) };

    case 'DELETE_DOOR':
      return {
        ...state,
        doors: state.doors.filter((door) => door.id !== action.id),
        selection: removeFromSelection(state.selection, 'door', action.id),
      };

    case 'ADD_WINDOW':
      return { ...state, windows: [...state.windows, action.window], selection: [{ kind: 'window', id: action.window.id }] };

    case 'UPDATE_WINDOW':
      return { ...state, windows: state.windows.map((win) => (win.id === action.id ? { ...win, ...action.patch } : win)) };

    case 'DELETE_WINDOW':
      return {
        ...state,
        windows: state.windows.filter((win) => win.id !== action.id),
        selection: removeFromSelection(state.selection, 'window', action.id),
      };

    case 'ADD_OUTLET':
      return { ...state, outlets: [...state.outlets, action.outlet], selection: [{ kind: 'outlet', id: action.outlet.id }] };

    case 'UPDATE_OUTLET':
      return {
        ...state,
        outlets: state.outlets.map((outlet) => (outlet.id === action.id ? { ...outlet, ...action.patch } : outlet)),
      };

    case 'DELETE_OUTLET':
      return {
        ...state,
        outlets: state.outlets.filter((outlet) => outlet.id !== action.id),
        selection: removeFromSelection(state.selection, 'outlet', action.id),
      };

    case 'ADD_PATH':
      return { ...state, paths: [...state.paths, action.path], selection: [{ kind: 'path', id: action.path.id }] };

    case 'UPDATE_PATH':
      return { ...state, paths: state.paths.map((path) => (path.id === action.id ? { ...path, ...action.patch } : path)) };

    case 'DELETE_PATH':
      return {
        ...state,
        paths: state.paths.filter((path) => path.id !== action.id),
        selection: removeFromSelection(state.selection, 'path', action.id),
      };

    case 'ADD_LABEL':
      return { ...state, labels: [...state.labels, action.label], selection: [{ kind: 'label', id: action.label.id }] };

    case 'UPDATE_LABEL':
      return { ...state, labels: state.labels.map((label) => (label.id === action.id ? { ...label, ...action.patch } : label)) };

    case 'DELETE_LABEL':
      return {
        ...state,
        labels: state.labels.filter((label) => label.id !== action.id),
        selection: removeFromSelection(state.selection, 'label', action.id),
      };

    case 'ADD_POLYGON':
      return { ...state, polygons: [...state.polygons, action.polygon], selection: [{ kind: 'polygon', id: action.polygon.id }] };

    case 'UPDATE_POLYGON':
      return {
        ...state,
        polygons: state.polygons.map((polygon) => (polygon.id === action.id ? { ...polygon, ...action.patch } : polygon)),
      };

    case 'DELETE_POLYGON':
      return {
        ...state,
        polygons: state.polygons.filter((polygon) => polygon.id !== action.id),
        selection: removeFromSelection(state.selection, 'polygon', action.id),
      };

    case 'ADD_DIMENSION':
      return { ...state, dimensions: [...state.dimensions, action.dimension], selection: [{ kind: 'dimension', id: action.dimension.id }] };

    case 'UPDATE_DIMENSION':
      return {
        ...state,
        dimensions: state.dimensions.map((dim) => (dim.id === action.id ? { ...dim, ...action.patch } : dim)),
      };

    case 'DELETE_DIMENSION':
      return {
        ...state,
        dimensions: state.dimensions.filter((dim) => dim.id !== action.id),
        selection: removeFromSelection(state.selection, 'dimension', action.id),
      };

    case 'DELETE_MANY': {
      // 다중 선택 삭제를 한 건의 액션(=한 건의 Undo 기록)으로 처리한다.
      const ids: Record<ObjectKind, Set<string>> = {
        wall: new Set(),
        furniture: new Set(),
        door: new Set(),
        window: new Set(),
        outlet: new Set(),
        path: new Set(),
        label: new Set(),
        polygon: new Set(),
        dimension: new Set(),
      };
      for (const item of action.items) ids[item.kind].add(item.id);

      return {
        ...state,
        // 벽이 삭제 대상이면 그 벽에 달린 문/창문도 함께 사라진다 (DELETE_WALL과 동일한 규칙).
        walls: state.walls.filter((w) => !ids.wall.has(w.id)),
        doors: state.doors.filter((d) => !ids.door.has(d.id) && !ids.wall.has(d.wallId)),
        windows: state.windows.filter((w) => !ids.window.has(w.id) && !ids.wall.has(w.wallId)),
        furniture: state.furniture.filter((f) => !ids.furniture.has(f.id)),
        outlets: state.outlets.filter((o) => !ids.outlet.has(o.id)),
        paths: state.paths.filter((p) => !ids.path.has(p.id)),
        labels: state.labels.filter((l) => !ids.label.has(l.id)),
        polygons: state.polygons.filter((p) => !ids.polygon.has(p.id)),
        dimensions: state.dimensions.filter((d) => !ids.dimension.has(d.id)),
        selection: [],
      };
    }

    case 'SELECT_OBJECT':
      return { ...state, selection: action.selection ? [action.selection] : [] };

    case 'TOGGLE_SELECT_OBJECT': {
      const exists = state.selection.some((s) => s.kind === action.item.kind && s.id === action.item.id);
      return {
        ...state,
        selection: exists ? removeFromSelection(state.selection, action.item.kind, action.item.id) : [...state.selection, action.item],
      };
    }

    case 'SET_SELECTION':
      return { ...state, selection: action.items };

    case 'ADD_LAYER':
      return { ...state, layers: [...state.layers, action.layer], activeLayerId: action.layer.id };

    case 'RENAME_LAYER':
      return { ...state, layers: state.layers.map((l) => (l.id === action.id ? { ...l, name: action.name } : l)) };

    case 'TOGGLE_LAYER_VISIBILITY':
      return { ...state, layers: state.layers.map((l) => (l.id === action.id ? { ...l, visible: !l.visible } : l)) };

    case 'DELETE_LAYER': {
      // 마지막 남은 레이어는 삭제할 수 없다 (모든 객체가 레이어를 잃지 않도록).
      if (state.layers.length <= 1) return state;
      const remaining = state.layers.filter((l) => l.id !== action.id);
      const fallbackId = remaining[0].id;
      const reassign = <T extends { layerId: string }>(items: T[]): T[] =>
        items.map((item) => (item.layerId === action.id ? { ...item, layerId: fallbackId } : item));

      return {
        ...state,
        layers: remaining,
        activeLayerId: state.activeLayerId === action.id ? fallbackId : state.activeLayerId,
        walls: reassign(state.walls),
        furniture: reassign(state.furniture),
        doors: reassign(state.doors),
        windows: reassign(state.windows),
        outlets: reassign(state.outlets),
        paths: reassign(state.paths),
        labels: reassign(state.labels),
        polygons: reassign(state.polygons),
        dimensions: reassign(state.dimensions),
      };
    }

    case 'SET_ACTIVE_LAYER':
      // 활성 레이어가 바뀌면 이전 레이어에서 선택돼 있던 객체는 자동으로 선택 해제한다
      // (편집은 활성 레이어 객체만 가능하므로, 다른 레이어의 선택 상태를 그대로 두지 않는다).
      return { ...state, activeLayerId: action.id, selection: [] };

    case 'MOVE_OBJECT_TO_LAYER': {
      switch (action.kind) {
        case 'wall':
          return { ...state, walls: state.walls.map((w) => (w.id === action.id ? { ...w, layerId: action.layerId } : w)) };
        case 'furniture':
          return { ...state, furniture: state.furniture.map((f) => (f.id === action.id ? { ...f, layerId: action.layerId } : f)) };
        case 'door':
          return { ...state, doors: state.doors.map((d) => (d.id === action.id ? { ...d, layerId: action.layerId } : d)) };
        case 'window':
          return { ...state, windows: state.windows.map((w) => (w.id === action.id ? { ...w, layerId: action.layerId } : w)) };
        case 'outlet':
          return { ...state, outlets: state.outlets.map((o) => (o.id === action.id ? { ...o, layerId: action.layerId } : o)) };
        case 'path':
          return { ...state, paths: state.paths.map((p) => (p.id === action.id ? { ...p, layerId: action.layerId } : p)) };
        case 'label':
          return { ...state, labels: state.labels.map((l) => (l.id === action.id ? { ...l, layerId: action.layerId } : l)) };
        case 'polygon':
          return { ...state, polygons: state.polygons.map((p) => (p.id === action.id ? { ...p, layerId: action.layerId } : p)) };
        case 'dimension':
          return { ...state, dimensions: state.dimensions.map((d) => (d.id === action.id ? { ...d, layerId: action.layerId } : d)) };
        default:
          return state;
      }
    }

    case 'MERGE_WALLS': {
      // BL 명령: 일직선 구간은 벽 하나로 합치고(newWalls), 꺾이는 지점(모서리)은 벽 개수를
      // 줄이지 않는 대신 (1) 끝점을 정확히 맞추고 (2) 같은 mergeGroupId를 부여해 하나를
      // 클릭·이동해도 그룹 전체가 함께 선택·이동하게 한다(wallPatches). 문/창문은 실제로 다른
      // 벽으로 대체된 경우에만 그 벽으로 옮겨지며 offsetMm도 다시 계산된 값으로 갱신된다(월드
      // 상의 실제 위치는 그대로 유지). 한 번의 액션이라 Undo 한 번으로 전체 복원된다.
      const { removedWallIds, newWalls, wallPatches, doorPatches, windowPatches, resultWallIds } = action.payload;
      const removedSet = new Set(removedWallIds);
      const wallPatchById = new Map(wallPatches.map((p) => [p.id, p]));
      const doorPatchById = new Map(doorPatches.map((p) => [p.id, p]));
      const windowPatchById = new Map(windowPatches.map((p) => [p.id, p]));

      return {
        ...state,
        walls: [
          ...state.walls
            .filter((w) => !removedSet.has(w.id))
            .map((w) => {
              const patch = wallPatchById.get(w.id);
              if (!patch) return w;
              return {
                ...w,
                ...(patch.start ? { start: patch.start } : {}),
                ...(patch.end ? { end: patch.end } : {}),
                ...(patch.mergeGroupId ? { mergeGroupId: patch.mergeGroupId } : {}),
              };
            }),
          ...newWalls,
        ],
        doors: state.doors.map((d) => {
          const patch = doorPatchById.get(d.id);
          return patch ? { ...d, wallId: patch.wallId, offsetMm: patch.offsetMm } : d;
        }),
        windows: state.windows.map((w) => {
          const patch = windowPatchById.get(w.id);
          return patch ? { ...w, wallId: patch.wallId, offsetMm: patch.offsetMm } : w;
        }),
        selection: resultWallIds.map((id) => ({ kind: 'wall' as const, id })),
      };
    }

    case 'ADD_MANY': {
      // CO(복사) 명령 등에서 여러 객체를 한 번에 추가한다 — 몇 개를 추가하든 Undo 한 건이다.
      const next = distributeEntries(state, action.entries);
      const newSelection: SelectionItem[] = action.entries.map((entry) => ({ kind: entry.kind, id: entry.data.id }));
      return { ...next, selection: newSelection };
    }

    case 'DUPLICATE_LAYER': {
      // 레이어 복사: 새 레이어를 만들고 그 레이어의 객체 복제본을 한 번에 추가한다(Undo 한 건).
      // 새 레이어를 활성 레이어로 바로 전환하고(자연스럽게 이어서 편집), 이전 선택은 해제한다
      // (레이어 전환 시 선택 해제하는 기존 규칙과 동일).
      const withLayer = { ...state, layers: [...state.layers, action.newLayer] };
      const next = distributeEntries(withLayer, action.entries);
      return { ...next, activeLayerId: action.newLayer.id, selection: [] };
    }

    default:
      return state;
  }
}

/** ADD_MANY/DUPLICATE_LAYER가 공유하는 항목 분배 로직 — 객체 종류별로 알맞은 배열에 추가한다. */
function distributeEntries(state: FloorPlanState, entries: AddManyEntry[]): FloorPlanState {
  let next = state;
  for (const entry of entries) {
    switch (entry.kind) {
      case 'wall':
        next = { ...next, walls: [...next.walls, entry.data] };
        break;
      case 'furniture':
        next = { ...next, furniture: [...next.furniture, entry.data] };
        break;
      case 'door':
        next = { ...next, doors: [...next.doors, entry.data] };
        break;
      case 'window':
        next = { ...next, windows: [...next.windows, entry.data] };
        break;
      case 'outlet':
        next = { ...next, outlets: [...next.outlets, entry.data] };
        break;
      case 'path':
        next = { ...next, paths: [...next.paths, entry.data] };
        break;
      case 'label':
        next = { ...next, labels: [...next.labels, entry.data] };
        break;
      case 'polygon':
        next = { ...next, polygons: [...next.polygons, entry.data] };
        break;
      case 'dimension':
        next = { ...next, dimensions: [...next.dimensions, entry.data] };
        break;
    }
  }
  return next;
}

/**
 * SELECT_OBJECT/TOGGLE_SELECT_OBJECT/SET_SELECTION(선택 변경)과 transient:true로 표시된
 * 액션(드래그 도중의 중간 갱신)만 히스토리에서 제외한다. 드래그가 끝나면 usePlanInteraction이
 * commit()으로 "시작→끝"을 한 건만 기록하므로, 그 외 데이터 변경 액션은 모두 그대로
 * Undo/Redo 대상이다. DELETE_MANY(다중 선택 삭제)는 다른 삭제 액션과 마찬가지로 그대로 기록된다.
 */
const SELECTION_ONLY_ACTIONS = new Set<FloorPlanAction['type']>(['SELECT_OBJECT', 'TOGGLE_SELECT_OBJECT', 'SET_SELECTION']);

export const historyFloorPlanReducer = createHistoryReducer<FloorPlanState, FloorPlanAction>(
  floorPlanReducer,
  (action) => !SELECTION_ONLY_ACTIONS.has(action.type) && !('transient' in action && action.transient),
);
