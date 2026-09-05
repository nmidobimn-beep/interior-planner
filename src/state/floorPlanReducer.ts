import type { Wall } from '../types/wall';

/**
 * 도면의 모든 객체를 담는 단일 상태. 3단계(가구) 이후 furniture/doors/windows/outlets 배열이
 * 이 옆에 추가될 예정이며, 5단계(Undo/Redo)에서 이 reducer의 액션 로그를 그대로 히스토리로 쓴다.
 */
export interface FloorPlanState {
  walls: Wall[];
  selectedWallId: string | null;
}

export const initialFloorPlanState: FloorPlanState = {
  walls: [],
  selectedWallId: null,
};

export type FloorPlanAction =
  | { type: 'ADD_WALL'; wall: Wall }
  | { type: 'UPDATE_WALL'; id: string; patch: Partial<Omit<Wall, 'id'>> }
  | { type: 'DELETE_WALL'; id: string }
  | { type: 'SELECT_WALL'; id: string | null };

export function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  switch (action.type) {
    case 'ADD_WALL':
      return { ...state, walls: [...state.walls, action.wall], selectedWallId: action.wall.id };

    case 'UPDATE_WALL':
      return {
        ...state,
        walls: state.walls.map((wall) => (wall.id === action.id ? { ...wall, ...action.patch } : wall)),
      };

    case 'DELETE_WALL':
      return {
        ...state,
        walls: state.walls.filter((wall) => wall.id !== action.id),
        selectedWallId: state.selectedWallId === action.id ? null : state.selectedWallId,
      };

    case 'SELECT_WALL':
      return { ...state, selectedWallId: action.id };

    default:
      return state;
  }
}
