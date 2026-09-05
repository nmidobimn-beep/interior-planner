import type { Furniture } from '../types/furniture';
import type { Wall } from '../types/wall';
import type { Door, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import type { Layer } from '../types/layer';
import { createHistoryReducer } from './history';

export type ObjectKind = 'wall' | 'furniture' | 'door' | 'window' | 'outlet';
export type SelectedObject = { kind: ObjectKind; id: string } | null;

/** 새 프로젝트에 항상 존재하는 첫 레이어의 고정 id (마지막 레이어는 삭제할 수 없어 항상 최소 1개 존재). */
export const DEFAULT_LAYER_ID = 'layer-default';

/**
 * 도면의 모든 객체를 담는 단일 상태.
 * 5단계(Undo/Redo)에서 이 reducer의 액션 로그를 그대로 히스토리로 쓴다.
 */
export interface FloorPlanState {
  walls: Wall[];
  furniture: Furniture[];
  doors: Door[];
  windows: WindowOpening[];
  outlets: Outlet[];
  layers: Layer[];
  activeLayerId: string;
  selectedObject: SelectedObject;
}

export const initialFloorPlanState: FloorPlanState = {
  walls: [],
  furniture: [],
  doors: [],
  windows: [],
  outlets: [],
  layers: [{ id: DEFAULT_LAYER_ID, name: '레이어 1', visible: true }],
  activeLayerId: DEFAULT_LAYER_ID,
  selectedObject: null,
};

export type FloorPlanAction =
  | { type: 'ADD_WALL'; wall: Wall }
  | { type: 'UPDATE_WALL'; id: string; patch: Partial<Omit<Wall, 'id'>> }
  | { type: 'DELETE_WALL'; id: string }
  | { type: 'ADD_FURNITURE'; furniture: Furniture }
  | { type: 'UPDATE_FURNITURE'; id: string; patch: Partial<Omit<Furniture, 'id'>> }
  | { type: 'DELETE_FURNITURE'; id: string }
  | { type: 'ADD_DOOR'; door: Door }
  | { type: 'UPDATE_DOOR'; id: string; patch: Partial<Omit<Door, 'id'>> }
  | { type: 'DELETE_DOOR'; id: string }
  | { type: 'ADD_WINDOW'; window: WindowOpening }
  | { type: 'UPDATE_WINDOW'; id: string; patch: Partial<Omit<WindowOpening, 'id'>> }
  | { type: 'DELETE_WINDOW'; id: string }
  | { type: 'ADD_OUTLET'; outlet: Outlet }
  | { type: 'UPDATE_OUTLET'; id: string; patch: Partial<Omit<Outlet, 'id'>> }
  | { type: 'DELETE_OUTLET'; id: string }
  | { type: 'SELECT_OBJECT'; selection: SelectedObject }
  | { type: 'ADD_LAYER'; layer: Layer }
  | { type: 'RENAME_LAYER'; id: string; name: string }
  | { type: 'TOGGLE_LAYER_VISIBILITY'; id: string }
  | { type: 'DELETE_LAYER'; id: string }
  | { type: 'SET_ACTIVE_LAYER'; id: string }
  | { type: 'MOVE_OBJECT_TO_LAYER'; kind: ObjectKind; id: string; layerId: string };

function clearSelectionIfMatches(state: FloorPlanState, kind: ObjectKind, id: string): SelectedObject {
  return state.selectedObject?.kind === kind && state.selectedObject.id === id ? null : state.selectedObject;
}

export function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  switch (action.type) {
    case 'ADD_WALL':
      return {
        ...state,
        walls: [...state.walls, action.wall],
        selectedObject: { kind: 'wall', id: action.wall.id },
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
        selectedObject: clearSelectionIfMatches(state, 'wall', action.id),
      };

    case 'ADD_FURNITURE':
      return {
        ...state,
        furniture: [...state.furniture, action.furniture],
        selectedObject: { kind: 'furniture', id: action.furniture.id },
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
        selectedObject: clearSelectionIfMatches(state, 'furniture', action.id),
      };

    case 'ADD_DOOR':
      return { ...state, doors: [...state.doors, action.door], selectedObject: { kind: 'door', id: action.door.id } };

    case 'UPDATE_DOOR':
      return { ...state, doors: state.doors.map((door) => (door.id === action.id ? { ...door, ...action.patch } : door)) };

    case 'DELETE_DOOR':
      return {
        ...state,
        doors: state.doors.filter((door) => door.id !== action.id),
        selectedObject: clearSelectionIfMatches(state, 'door', action.id),
      };

    case 'ADD_WINDOW':
      return { ...state, windows: [...state.windows, action.window], selectedObject: { kind: 'window', id: action.window.id } };

    case 'UPDATE_WINDOW':
      return { ...state, windows: state.windows.map((win) => (win.id === action.id ? { ...win, ...action.patch } : win)) };

    case 'DELETE_WINDOW':
      return {
        ...state,
        windows: state.windows.filter((win) => win.id !== action.id),
        selectedObject: clearSelectionIfMatches(state, 'window', action.id),
      };

    case 'ADD_OUTLET':
      return { ...state, outlets: [...state.outlets, action.outlet], selectedObject: { kind: 'outlet', id: action.outlet.id } };

    case 'UPDATE_OUTLET':
      return {
        ...state,
        outlets: state.outlets.map((outlet) => (outlet.id === action.id ? { ...outlet, ...action.patch } : outlet)),
      };

    case 'DELETE_OUTLET':
      return {
        ...state,
        outlets: state.outlets.filter((outlet) => outlet.id !== action.id),
        selectedObject: clearSelectionIfMatches(state, 'outlet', action.id),
      };

    case 'SELECT_OBJECT':
      return { ...state, selectedObject: action.selection };

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
      };
    }

    case 'SET_ACTIVE_LAYER':
      return { ...state, activeLayerId: action.id };

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
        default:
          return state;
      }
    }

    default:
      return state;
  }
}

/** SELECT_OBJECT(선택 변경)만 히스토리에서 제외 — 그 외 데이터 변경 액션은 모두 Undo/Redo 대상. */
export const historyFloorPlanReducer = createHistoryReducer<FloorPlanState, FloorPlanAction>(
  floorPlanReducer,
  (action) => action.type !== 'SELECT_OBJECT',
);
