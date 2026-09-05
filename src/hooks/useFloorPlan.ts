import { useCallback, useMemo, useReducer } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture, FurnitureShape } from '../types/furniture';
import type { Door, HingeSide, SwingDirection, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import { createId } from '../core/id';
import { DEFAULT_FURNITURE_COLOR } from '../config/constants';
import { floorPlanReducer, initialFloorPlanState, type ObjectKind, type SelectedObject } from '../state/floorPlanReducer';

const FURNITURE_LABEL: Record<FurnitureShape, string> = {
  rectangle: '가구',
  circle: '가구',
  lshape: '소파',
};

function findSelected<T extends { id: string }>(selection: SelectedObject, kind: ObjectKind, list: T[]): T | null {
  return selection?.kind === kind ? (list.find((item) => item.id === selection.id) ?? null) : null;
}

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

  const addDoor = useCallback(
    (wallId: string, offsetMm: number, widthMm: number, hingeSide: HingeSide = 'start', swingDirection: SwingDirection = 'in'): Door => {
      const door: Door = { id: createId(), wallId, offsetMm, widthMm, hingeSide, swingDirection };
      dispatch({ type: 'ADD_DOOR', door });
      return door;
    },
    [],
  );

  const updateDoor = useCallback((id: string, patch: Partial<Omit<Door, 'id'>>) => {
    dispatch({ type: 'UPDATE_DOOR', id, patch });
  }, []);

  const deleteDoor = useCallback((id: string) => {
    dispatch({ type: 'DELETE_DOOR', id });
  }, []);

  const addWindow = useCallback((wallId: string, offsetMm: number, widthMm: number): WindowOpening => {
    const window: WindowOpening = { id: createId(), wallId, offsetMm, widthMm };
    dispatch({ type: 'ADD_WINDOW', window });
    return window;
  }, []);

  const updateWindow = useCallback((id: string, patch: Partial<Omit<WindowOpening, 'id'>>) => {
    dispatch({ type: 'UPDATE_WINDOW', id, patch });
  }, []);

  const deleteWindow = useCallback((id: string) => {
    dispatch({ type: 'DELETE_WINDOW', id });
  }, []);

  const addOutlet = useCallback((center: Point, count = 1): Outlet => {
    const outlet: Outlet = { id: createId(), x: center.x, y: center.y, count };
    dispatch({ type: 'ADD_OUTLET', outlet });
    return outlet;
  }, []);

  const updateOutlet = useCallback((id: string, patch: Partial<Omit<Outlet, 'id'>>) => {
    dispatch({ type: 'UPDATE_OUTLET', id, patch });
  }, []);

  const deleteOutlet = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OUTLET', id });
  }, []);

  const selectObject = useCallback((kind: ObjectKind, id: string | null) => {
    dispatch({ type: 'SELECT_OBJECT', selection: id ? { kind, id } : null });
  }, []);
  const selectWall = useCallback((id: string | null) => selectObject('wall', id), [selectObject]);
  const selectFurniture = useCallback((id: string | null) => selectObject('furniture', id), [selectObject]);
  const selectDoor = useCallback((id: string | null) => selectObject('door', id), [selectObject]);
  const selectWindow = useCallback((id: string | null) => selectObject('window', id), [selectObject]);
  const selectOutlet = useCallback((id: string | null) => selectObject('outlet', id), [selectObject]);

  const deselect = useCallback(() => {
    dispatch({ type: 'SELECT_OBJECT', selection: null });
  }, []);

  const deleteSelected = useCallback(() => {
    const selection = state.selectedObject;
    if (!selection) return;
    switch (selection.kind) {
      case 'wall':
        deleteWall(selection.id);
        break;
      case 'furniture':
        deleteFurniture(selection.id);
        break;
      case 'door':
        deleteDoor(selection.id);
        break;
      case 'window':
        deleteWindow(selection.id);
        break;
      case 'outlet':
        deleteOutlet(selection.id);
        break;
    }
  }, [deleteDoor, deleteFurniture, deleteOutlet, deleteWall, deleteWindow, state.selectedObject]);

  const selectedWall = useMemo(
    () => findSelected(state.selectedObject, 'wall', state.walls),
    [state.walls, state.selectedObject],
  );
  const selectedFurniture = useMemo(
    () => findSelected(state.selectedObject, 'furniture', state.furniture),
    [state.furniture, state.selectedObject],
  );
  const selectedDoor = useMemo(
    () => findSelected(state.selectedObject, 'door', state.doors),
    [state.doors, state.selectedObject],
  );
  const selectedWindow = useMemo(
    () => findSelected(state.selectedObject, 'window', state.windows),
    [state.windows, state.selectedObject],
  );
  const selectedOutlet = useMemo(
    () => findSelected(state.selectedObject, 'outlet', state.outlets),
    [state.outlets, state.selectedObject],
  );

  return {
    walls: state.walls,
    furniture: state.furniture,
    doors: state.doors,
    windows: state.windows,
    outlets: state.outlets,
    selectedObject: state.selectedObject,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    addWall,
    updateWall,
    deleteWall,
    addFurniture,
    updateFurniture,
    deleteFurniture,
    addDoor,
    updateDoor,
    deleteDoor,
    addWindow,
    updateWindow,
    deleteWindow,
    addOutlet,
    updateOutlet,
    deleteOutlet,
    selectWall,
    selectFurniture,
    selectDoor,
    selectWindow,
    selectOutlet,
    deselect,
    deleteSelected,
  };
}

export type UseFloorPlanResult = ReturnType<typeof useFloorPlan>;
