import { useCallback, useMemo, useReducer } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture, FurnitureShape } from '../types/furniture';
import { createId } from '../core/id';
import { DEFAULT_FURNITURE_COLOR } from '../config/constants';
import { floorPlanReducer, initialFloorPlanState } from '../state/floorPlanReducer';

const FURNITURE_LABEL: Record<FurnitureShape, string> = {
  rectangle: '가구',
  circle: '가구',
  lshape: '소파',
};

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

  const addFurniture = useCallback(
    (
      shape: FurnitureShape,
      center: Point,
      size: { width: number; height: number },
      extra?: Partial<Pick<Furniture, 'armThicknessMm'>>,
    ): Furniture => {
      const furniture: Furniture = {
        id: createId(),
        shape,
        name: FURNITURE_LABEL[shape],
        x: center.x,
        y: center.y,
        width: size.width,
        height: size.height,
        rotationDeg: 0,
        color: DEFAULT_FURNITURE_COLOR,
        ...extra,
      };
      dispatch({ type: 'ADD_FURNITURE', furniture });
      return furniture;
    },
    [],
  );

  const updateFurniture = useCallback((id: string, patch: Partial<Omit<Furniture, 'id'>>) => {
    dispatch({ type: 'UPDATE_FURNITURE', id, patch });
  }, []);

  const deleteFurniture = useCallback((id: string) => {
    dispatch({ type: 'DELETE_FURNITURE', id });
  }, []);

  const selectWall = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_OBJECT', selection: id ? { kind: 'wall', id } : null });
  }, []);

  const selectFurniture = useCallback((id: string | null) => {
    dispatch({ type: 'SELECT_OBJECT', selection: id ? { kind: 'furniture', id } : null });
  }, []);

  const deselect = useCallback(() => {
    dispatch({ type: 'SELECT_OBJECT', selection: null });
  }, []);

  const deleteSelected = useCallback(() => {
    if (state.selectedObject?.kind === 'wall') deleteWall(state.selectedObject.id);
    else if (state.selectedObject?.kind === 'furniture') deleteFurniture(state.selectedObject.id);
  }, [deleteFurniture, deleteWall, state.selectedObject]);

  const selectedWall = useMemo(
    () =>
      state.selectedObject?.kind === 'wall'
        ? (state.walls.find((wall) => wall.id === state.selectedObject!.id) ?? null)
        : null,
    [state.walls, state.selectedObject],
  );

  const selectedFurniture = useMemo(
    () =>
      state.selectedObject?.kind === 'furniture'
        ? (state.furniture.find((item) => item.id === state.selectedObject!.id) ?? null)
        : null,
    [state.furniture, state.selectedObject],
  );

  return {
    walls: state.walls,
    furniture: state.furniture,
    selectedObject: state.selectedObject,
    selectedWall,
    selectedFurniture,
    addWall,
    updateWall,
    deleteWall,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    selectWall,
    selectFurniture,
    deselect,
    deleteSelected,
  };
}

export type UseFloorPlanResult = ReturnType<typeof useFloorPlan>;
