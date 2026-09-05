import type { Furniture } from '../types/furniture';
import type { Wall } from '../types/wall';

export type SelectedObject = { kind: 'wall'; id: string } | { kind: 'furniture'; id: string } | null;

/**
 * 도면의 모든 객체를 담는 단일 상태. 4단계(문/창문/콘센트) 이후 그 배열들이
 * 이 옆에 추가될 예정이며, 5단계(Undo/Redo)에서 이 reducer의 액션 로그를 그대로 히스토리로 쓴다.
 */
export interface FloorPlanState {
  walls: Wall[];
  furniture: Furniture[];
  selectedObject: SelectedObject;
}

export const initialFloorPlanState: FloorPlanState = {
  walls: [],
  furniture: [],
  selectedObject: null,
};

export type FloorPlanAction =
  | { type: 'ADD_WALL'; wall: Wall }
  | { type: 'UPDATE_WALL'; id: string; patch: Partial<Omit<Wall, 'id'>> }
  | { type: 'DELETE_WALL'; id: string }
  | { type: 'ADD_FURNITURE'; furniture: Furniture }
  | { type: 'UPDATE_FURNITURE'; id: string; patch: Partial<Omit<Furniture, 'id'>> }
  | { type: 'DELETE_FURNITURE'; id: string }
  | { type: 'SELECT_OBJECT'; selection: SelectedObject };

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
      return {
        ...state,
        walls: state.walls.filter((wall) => wall.id !== action.id),
        selectedObject:
          state.selectedObject?.kind === 'wall' && state.selectedObject.id === action.id
            ? null
            : state.selectedObject,
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
        selectedObject:
          state.selectedObject?.kind === 'furniture' && state.selectedObject.id === action.id
            ? null
            : state.selectedObject,
      };

    case 'SELECT_OBJECT':
      return { ...state, selectedObject: action.selection };

    default:
      return state;
  }
}
