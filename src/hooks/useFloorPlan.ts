import { useCallback, useMemo, useReducer } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import { createId } from '../core/id';
import { floorPlanReducer, initialFloorPlanState } from '../state/floorPlanReducer';

export function useFloorPlan() {
  const [state, dispatch] = useReducer(floorPlanReducer, initialFloorPlanState);

  const addWall = useCallback((start: Point, end: Point, thicknessMm: number): Wall => {
    const wall: Wall = { id: createId(), start, end, thicknessMm };
    dispatch({ type: 'ADD_WALL', wall });
    return wall;
  }, []);

  const updateWall = useCallback((id: string, patch: Partial<Omit<Wall, 'id'>>) => {
    dispatch({ type: 'UPDATE_WALL', id, patch });
  }, []);

  const deleteWall = useCallback((id: string) => {
    dispatch({ type: 'DELETE_WALL', id });
  }, []);

  const selectWall = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_WALL', id });
  }, []);

  const selectedWall = useMemo(
    () => state.walls.find((wall) => wall.id === state.selectedWallId) ?? null,
    [state.walls, state.selectedWallId],
  );

  return {
    walls: state.walls,
    selectedWallId: state.selectedWallId,
    selectedWall,
    addWall,
    updateWall,
    deleteWall,
    selectWall,
  };
}

export type UseFloorPlanResult = ReturnType<typeof useFloorPlan>;
