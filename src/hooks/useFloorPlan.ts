import { useCallback, useMemo, useReducer, useState } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture, FurnitureShape } from '../types/furniture';
import type { Door, HingeSide, SwingDirection, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import type { Layer } from '../types/layer';
import type { Path } from '../types/path';
import { createId } from '../core/id';
import { DEFAULT_FURNITURE_COLOR } from '../config/constants';
import { clampOpeningOffset } from '../core/openingGeometry';
import { wallLengthMm } from '../core/wallGeometry';
import {
  historyFloorPlanReducer,
  initialFloorPlanState,
  type FloorPlanState,
  type ObjectKind,
  type SelectedObject,
} from '../state/floorPlanReducer';
import { REDO, UNDO, type HistoryState } from '../state/history';

const FURNITURE_LABEL: Record<FurnitureShape, string> = {
  rectangle: '가구',
  circle: '가구',
  lshape: '소파',
};

function findSelected<T extends { id: string }>(selection: SelectedObject, kind: ObjectKind, list: T[]): T | null {
  return selection?.kind === kind ? (list.find((item) => item.id === selection.id) ?? null) : null;
}

function byVisibleLayer<T extends { layerId: string }>(items: T[], visibleLayerIds: Set<string>): T[] {
  return items.filter((item) => visibleLayerIds.has(item.layerId));
}

/** 붙여넣기 시 원본과 겹치지 않도록 살짝 어긋나게 놓는 오프셋(mm) */
const PASTE_OFFSET_MM = 200;

type ClipboardEntry =
  | { kind: 'wall'; data: Wall }
  | { kind: 'furniture'; data: Furniture }
  | { kind: 'door'; data: Door }
  | { kind: 'window'; data: WindowOpening }
  | { kind: 'outlet'; data: Outlet }
  | { kind: 'path'; data: Path };

const initialHistory: HistoryState<FloorPlanState> = { past: [], present: initialFloorPlanState, future: [] };

export function useFloorPlan() {
  const [history, dispatch] = useReducer(historyFloorPlanReducer, initialHistory);
  const state = history.present;
  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(null);

  const addWall = useCallback(
    (start: Point, end: Point, thicknessMm: number): Wall => {
      const wall: Wall = { id: createId(), start, end, thicknessMm, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_WALL', wall });
      return wall;
    },
    [state.activeLayerId],
  );

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
        layerId: state.activeLayerId,
        ...extra,
      };
      dispatch({ type: 'ADD_FURNITURE', furniture });
      return furniture;
    },
    [state.activeLayerId],
  );

  const updateFurniture = useCallback((id: string, patch: Partial<Omit<Furniture, 'id'>>) => {
    dispatch({ type: 'UPDATE_FURNITURE', id, patch });
  }, []);

  const deleteFurniture = useCallback((id: string) => {
    dispatch({ type: 'DELETE_FURNITURE', id });
  }, []);

  const addDoor = useCallback(
    (wallId: string, offsetMm: number, widthMm: number, hingeSide: HingeSide = 'start', swingDirection: SwingDirection = 'in'): Door => {
      const door: Door = { id: createId(), wallId, offsetMm, widthMm, hingeSide, swingDirection, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_DOOR', door });
      return door;
    },
    [state.activeLayerId],
  );

  const updateDoor = useCallback((id: string, patch: Partial<Omit<Door, 'id'>>) => {
    dispatch({ type: 'UPDATE_DOOR', id, patch });
  }, []);

  const deleteDoor = useCallback((id: string) => {
    dispatch({ type: 'DELETE_DOOR', id });
  }, []);

  const addWindow = useCallback(
    (wallId: string, offsetMm: number, widthMm: number): WindowOpening => {
      const window: WindowOpening = { id: createId(), wallId, offsetMm, widthMm, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_WINDOW', window });
      return window;
    },
    [state.activeLayerId],
  );

  const updateWindow = useCallback((id: string, patch: Partial<Omit<WindowOpening, 'id'>>) => {
    dispatch({ type: 'UPDATE_WINDOW', id, patch });
  }, []);

  const deleteWindow = useCallback((id: string) => {
    dispatch({ type: 'DELETE_WINDOW', id });
  }, []);

  const addOutlet = useCallback(
    (center: Point, count = 1): Outlet => {
      const outlet: Outlet = { id: createId(), x: center.x, y: center.y, count, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_OUTLET', outlet });
      return outlet;
    },
    [state.activeLayerId],
  );

  const updateOutlet = useCallback((id: string, patch: Partial<Omit<Outlet, 'id'>>) => {
    dispatch({ type: 'UPDATE_OUTLET', id, patch });
  }, []);

  const deleteOutlet = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OUTLET', id });
  }, []);

  const addPath = useCallback(
    (start: Point, end: Point, showArrow = true): Path => {
      const path: Path = { id: createId(), start, end, showArrow, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_PATH', path });
      return path;
    },
    [state.activeLayerId],
  );

  const updatePath = useCallback((id: string, patch: Partial<Omit<Path, 'id'>>) => {
    dispatch({ type: 'UPDATE_PATH', id, patch });
  }, []);

  const deletePath = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PATH', id });
  }, []);

  const selectObject = useCallback((kind: ObjectKind, id: string | null) => {
    dispatch({ type: 'SELECT_OBJECT', selection: id ? { kind, id } : null });
  }, []);
  const selectWall = useCallback((id: string | null) => selectObject('wall', id), [selectObject]);
  const selectFurniture = useCallback((id: string | null) => selectObject('furniture', id), [selectObject]);
  const selectDoor = useCallback((id: string | null) => selectObject('door', id), [selectObject]);
  const selectWindow = useCallback((id: string | null) => selectObject('window', id), [selectObject]);
  const selectOutlet = useCallback((id: string | null) => selectObject('outlet', id), [selectObject]);
  const selectPath = useCallback((id: string | null) => selectObject('path', id), [selectObject]);

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
      case 'path':
        deletePath(selection.id);
        break;
    }
  }, [deleteDoor, deleteFurniture, deleteOutlet, deletePath, deleteWall, deleteWindow, state.selectedObject]);

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
  const selectedPath = useMemo(
    () => findSelected(state.selectedObject, 'path', state.paths),
    [state.paths, state.selectedObject],
  );

  const copySelected = useCallback(() => {
    if (selectedWall) setClipboard({ kind: 'wall', data: selectedWall });
    else if (selectedFurniture) setClipboard({ kind: 'furniture', data: selectedFurniture });
    else if (selectedDoor) setClipboard({ kind: 'door', data: selectedDoor });
    else if (selectedWindow) setClipboard({ kind: 'window', data: selectedWindow });
    else if (selectedOutlet) setClipboard({ kind: 'outlet', data: selectedOutlet });
    else if (selectedPath) setClipboard({ kind: 'path', data: selectedPath });
  }, [selectedDoor, selectedFurniture, selectedOutlet, selectedPath, selectedWall, selectedWindow]);

  const pasteClipboard = useCallback(() => {
    if (!clipboard) return;

    // 붙여넣기를 연속으로 누르면 원본 위치가 아니라 방금 붙여넣은 위치를 기준으로 다시 어긋나게 놓는다
    // (겹쳐 쌓이지 않고 대각선으로 흩어지는 통상적인 붙여넣기 동작).
    switch (clipboard.kind) {
      case 'wall': {
        const w = clipboard.data;
        const start = { x: w.start.x + PASTE_OFFSET_MM, y: w.start.y + PASTE_OFFSET_MM };
        const end = { x: w.end.x + PASTE_OFFSET_MM, y: w.end.y + PASTE_OFFSET_MM };
        addWall(start, end, w.thicknessMm);
        setClipboard({ kind: 'wall', data: { ...w, start, end } });
        break;
      }
      case 'furniture': {
        const f = clipboard.data;
        const center = { x: f.x + PASTE_OFFSET_MM, y: f.y + PASTE_OFFSET_MM };
        const created = addFurniture(f.shape, center, { width: f.width, height: f.height }, { armThicknessMm: f.armThicknessMm });
        updateFurniture(created.id, { name: f.name, rotationDeg: f.rotationDeg, color: f.color, memo: f.memo });
        setClipboard({ kind: 'furniture', data: { ...f, x: center.x, y: center.y } });
        break;
      }
      case 'door': {
        const d = clipboard.data;
        const wall = state.walls.find((w) => w.id === d.wallId);
        if (!wall) break;
        const offset = clampOpeningOffset(d.offsetMm + PASTE_OFFSET_MM, d.widthMm, wallLengthMm(wall));
        addDoor(d.wallId, offset, d.widthMm, d.hingeSide, d.swingDirection);
        setClipboard({ kind: 'door', data: { ...d, offsetMm: offset } });
        break;
      }
      case 'window': {
        const win = clipboard.data;
        const wall = state.walls.find((w) => w.id === win.wallId);
        if (!wall) break;
        const offset = clampOpeningOffset(win.offsetMm + PASTE_OFFSET_MM, win.widthMm, wallLengthMm(wall));
        const created = addWindow(win.wallId, offset, win.widthMm);
        if (win.memo) updateWindow(created.id, { memo: win.memo });
        setClipboard({ kind: 'window', data: { ...win, offsetMm: offset } });
        break;
      }
      case 'outlet': {
        const o = clipboard.data;
        const center = { x: o.x + PASTE_OFFSET_MM, y: o.y + PASTE_OFFSET_MM };
        addOutlet(center, o.count);
        setClipboard({ kind: 'outlet', data: { ...o, x: center.x, y: center.y } });
        break;
      }
      case 'path': {
        const p = clipboard.data;
        const start = { x: p.start.x + PASTE_OFFSET_MM, y: p.start.y + PASTE_OFFSET_MM };
        const end = { x: p.end.x + PASTE_OFFSET_MM, y: p.end.y + PASTE_OFFSET_MM };
        const created = addPath(start, end, p.showArrow);
        if (p.memo) updatePath(created.id, { memo: p.memo });
        setClipboard({ kind: 'path', data: { ...p, start, end } });
        break;
      }
    }
  }, [addDoor, addFurniture, addOutlet, addPath, addWall, addWindow, clipboard, state.walls, updateFurniture, updatePath, updateWindow]);

  const undo = useCallback(() => dispatch(UNDO), []);
  const redo = useCallback(() => dispatch(REDO), []);

  const addLayer = useCallback(
    (name?: string) => {
      const layer: Layer = { id: createId(), name: name?.trim() || `레이어 ${state.layers.length + 1}`, visible: true };
      dispatch({ type: 'ADD_LAYER', layer });
      return layer;
    },
    [state.layers.length],
  );
  const renameLayer = useCallback((id: string, name: string) => dispatch({ type: 'RENAME_LAYER', id, name }), []);
  const toggleLayerVisibility = useCallback((id: string) => dispatch({ type: 'TOGGLE_LAYER_VISIBILITY', id }), []);
  const deleteLayer = useCallback((id: string) => dispatch({ type: 'DELETE_LAYER', id }), []);
  const setActiveLayer = useCallback((id: string) => dispatch({ type: 'SET_ACTIVE_LAYER', id }), []);
  const moveObjectToLayer = useCallback(
    (kind: ObjectKind, id: string, layerId: string) => dispatch({ type: 'MOVE_OBJECT_TO_LAYER', kind, id, layerId }),
    [],
  );

  const visibleLayerIds = useMemo(() => new Set(state.layers.filter((l) => l.visible).map((l) => l.id)), [state.layers]);
  const visibleWalls = useMemo(() => byVisibleLayer(state.walls, visibleLayerIds), [state.walls, visibleLayerIds]);
  const visibleFurniture = useMemo(() => byVisibleLayer(state.furniture, visibleLayerIds), [state.furniture, visibleLayerIds]);
  const visibleDoors = useMemo(() => byVisibleLayer(state.doors, visibleLayerIds), [state.doors, visibleLayerIds]);
  const visibleWindows = useMemo(() => byVisibleLayer(state.windows, visibleLayerIds), [state.windows, visibleLayerIds]);
  const visibleOutlets = useMemo(() => byVisibleLayer(state.outlets, visibleLayerIds), [state.outlets, visibleLayerIds]);
  const visiblePaths = useMemo(() => byVisibleLayer(state.paths, visibleLayerIds), [state.paths, visibleLayerIds]);

  return {
    walls: state.walls,
    furniture: state.furniture,
    doors: state.doors,
    windows: state.windows,
    outlets: state.outlets,
    paths: state.paths,
    visibleWalls,
    visibleFurniture,
    visibleDoors,
    visibleWindows,
    visibleOutlets,
    visiblePaths,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    selectedObject: state.selectedObject,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
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
    addPath,
    updatePath,
    deletePath,
    selectWall,
    selectFurniture,
    selectDoor,
    selectWindow,
    selectOutlet,
    selectPath,
    deselect,
    deleteSelected,
    canCopy: state.selectedObject !== null,
    canPaste: clipboard !== null,
    copySelected,
    pasteClipboard,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    addLayer,
    renameLayer,
    toggleLayerVisibility,
    deleteLayer,
    setActiveLayer,
    moveObjectToLayer,
  };
}

export type UseFloorPlanResult = ReturnType<typeof useFloorPlan>;
