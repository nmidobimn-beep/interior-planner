import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Furniture, FurnitureShape } from '../types/furniture';
import type { Door, HingeSide, SwingDirection, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import type { Layer } from '../types/layer';
import type { Path } from '../types/path';
import type { TextLabel } from '../types/label';
import { createId } from '../core/id';
import { DEFAULT_FURNITURE_COLOR, DEFAULT_LABEL_TEXT } from '../config/constants';
import { clampOpeningOffset } from '../core/openingGeometry';
import { wallLengthMm } from '../core/wallGeometry';
import {
  historyFloorPlanReducer,
  initialFloorPlanState,
  type FloorPlanState,
  type ObjectKind,
  type SelectedObject,
  type SelectionItem,
} from '../state/floorPlanReducer';
import { commit, REDO, reset, UNDO, type HistoryState } from '../state/history';
import {
  AUTOSAVE_STORAGE_KEY,
  documentToState,
  parseFloorPlanDocument,
  serializeFloorPlan,
  type FloorPlanDocument,
} from '../core/serialization';

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
  | { kind: 'path'; data: Path }
  | { kind: 'label'; data: TextLabel };

const initialHistory: HistoryState<FloorPlanState> = { past: [], present: initialFloorPlanState, future: [] };

/** 마지막으로 작업하던 내용을 localStorage에서 복원한다 (없거나 손상됐으면 빈 도면으로 시작). */
function restoreInitialHistory(): HistoryState<FloorPlanState> {
  try {
    const raw = localStorage.getItem(AUTOSAVE_STORAGE_KEY);
    if (!raw) return initialHistory;
    const doc = parseFloorPlanDocument(JSON.parse(raw));
    if (!doc) return initialHistory;
    return { past: [], present: documentToState(doc), future: [] };
  } catch {
    return initialHistory;
  }
}

const AUTOSAVE_DEBOUNCE_MS = 500;

export function useFloorPlan() {
  const [history, dispatch] = useReducer(historyFloorPlanReducer, undefined, restoreInitialHistory);
  const state = history.present;
  const [clipboard, setClipboard] = useState<ClipboardEntry | null>(null);

  // 자동 저장: 편집이 멈추고 잠시 후 localStorage에 저장해, 새로고침해도 작업 내용이 남아있게 한다.
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(AUTOSAVE_STORAGE_KEY, JSON.stringify(serializeFloorPlan(state)));
      } catch {
        // localStorage를 쓸 수 없는 환경(프라이빗 모드 등)에서는 조용히 무시한다.
      }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  const addWall = useCallback(
    (start: Point, end: Point, thicknessMm: number): Wall => {
      const wall: Wall = { id: createId(), start, end, thicknessMm, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_WALL', wall });
      return wall;
    },
    [state.activeLayerId],
  );

  const updateWall = useCallback((id: string, patch: Partial<Omit<Wall, 'id'>>, transient = false) => {
    dispatch({ type: 'UPDATE_WALL', id, patch, transient });
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

  const updateFurniture = useCallback((id: string, patch: Partial<Omit<Furniture, 'id'>>, transient = false) => {
    dispatch({ type: 'UPDATE_FURNITURE', id, patch, transient });
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

  const updateDoor = useCallback((id: string, patch: Partial<Omit<Door, 'id'>>, transient = false) => {
    dispatch({ type: 'UPDATE_DOOR', id, patch, transient });
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

  const updateWindow = useCallback((id: string, patch: Partial<Omit<WindowOpening, 'id'>>, transient = false) => {
    dispatch({ type: 'UPDATE_WINDOW', id, patch, transient });
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

  const updateOutlet = useCallback((id: string, patch: Partial<Omit<Outlet, 'id'>>, transient = false) => {
    dispatch({ type: 'UPDATE_OUTLET', id, patch, transient });
  }, []);

  const deleteOutlet = useCallback((id: string) => {
    dispatch({ type: 'DELETE_OUTLET', id });
  }, []);

  const addPath = useCallback(
    (start: Point, end: Point, showArrow = true, curve = false, controlPoint?: Point): Path => {
      const path: Path = { id: createId(), start, end, curve, controlPoint, showArrow, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_PATH', path });
      return path;
    },
    [state.activeLayerId],
  );

  const updatePath = useCallback((id: string, patch: Partial<Omit<Path, 'id'>>, transient = false) => {
    dispatch({ type: 'UPDATE_PATH', id, patch, transient });
  }, []);

  const deletePath = useCallback((id: string) => {
    dispatch({ type: 'DELETE_PATH', id });
  }, []);

  const addLabel = useCallback(
    (position: Point, text = DEFAULT_LABEL_TEXT): TextLabel => {
      const label: TextLabel = { id: createId(), x: position.x, y: position.y, text, layerId: state.activeLayerId };
      dispatch({ type: 'ADD_LABEL', label });
      return label;
    },
    [state.activeLayerId],
  );

  const updateLabel = useCallback((id: string, patch: Partial<Omit<TextLabel, 'id'>>, transient = false) => {
    dispatch({ type: 'UPDATE_LABEL', id, patch, transient });
  }, []);

  const deleteLabel = useCallback((id: string) => {
    dispatch({ type: 'DELETE_LABEL', id });
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
  const selectLabel = useCallback((id: string | null) => selectObject('label', id), [selectObject]);

  const deselect = useCallback(() => {
    dispatch({ type: 'SELECT_OBJECT', selection: null });
  }, []);

  /** Shift+클릭 등으로 다중 선택 목록에 객체 하나를 추가/제거한다. */
  const toggleSelectObject = useCallback((kind: ObjectKind, id: string) => {
    dispatch({ type: 'TOGGLE_SELECT_OBJECT', item: { kind, id } });
  }, []);

  /** 영역 드래그 선택 등으로 선택 목록 전체를 한 번에 교체한다. */
  const setSelection = useCallback((items: SelectionItem[]) => {
    dispatch({ type: 'SET_SELECTION', items });
  }, []);

  const isSelected = useCallback(
    (kind: ObjectKind, id: string) => state.selection.some((item) => item.kind === kind && item.id === id),
    [state.selection],
  );

  /** 선택된 객체를 모두 삭제한다 — 여러 개를 선택했어도 Undo 기록은 한 건이다. */
  const deleteSelected = useCallback(() => {
    if (state.selection.length === 0) return;
    dispatch({ type: 'DELETE_MANY', items: state.selection });
  }, [state.selection]);

  // 기존 단일 선택 코드(선택된 벽/가구/문/... 각각의 상세 정보와 속성 패널)가 변경 없이 그대로
  // 동작하도록, "정확히 하나만 선택된 경우"에는 예전과 동일한 단일 selectedObject로 파생해준다.
  // 0개 또는 2개 이상 선택된 경우엔 null이 되어(=단일 상세 패널이 안 보여) 자연스럽게
  // "다중 선택" 상태로 취급된다.
  const selectedObject: SelectedObject = useMemo(
    () => (state.selection.length === 1 ? state.selection[0] : null),
    [state.selection],
  );

  const selectedWall = useMemo(() => findSelected(selectedObject, 'wall', state.walls), [state.walls, selectedObject]);
  const selectedFurniture = useMemo(
    () => findSelected(selectedObject, 'furniture', state.furniture),
    [state.furniture, selectedObject],
  );
  const selectedDoor = useMemo(() => findSelected(selectedObject, 'door', state.doors), [state.doors, selectedObject]);
  const selectedWindow = useMemo(() => findSelected(selectedObject, 'window', state.windows), [state.windows, selectedObject]);
  const selectedOutlet = useMemo(() => findSelected(selectedObject, 'outlet', state.outlets), [state.outlets, selectedObject]);
  const selectedPath = useMemo(() => findSelected(selectedObject, 'path', state.paths), [state.paths, selectedObject]);
  const selectedLabel = useMemo(() => findSelected(selectedObject, 'label', state.labels), [state.labels, selectedObject]);

  const selectedFurnitureIds = useMemo(
    () => new Set(state.selection.filter((s) => s.kind === 'furniture').map((s) => s.id)),
    [state.selection],
  );
  const selectedOutletIds = useMemo(
    () => new Set(state.selection.filter((s) => s.kind === 'outlet').map((s) => s.id)),
    [state.selection],
  );
  const selectedPathIds = useMemo(() => new Set(state.selection.filter((s) => s.kind === 'path').map((s) => s.id)), [state.selection]);
  const selectedLabelIds = useMemo(
    () => new Set(state.selection.filter((s) => s.kind === 'label').map((s) => s.id)),
    [state.selection],
  );

  const copySelected = useCallback(() => {
    if (selectedWall) setClipboard({ kind: 'wall', data: selectedWall });
    else if (selectedFurniture) setClipboard({ kind: 'furniture', data: selectedFurniture });
    else if (selectedDoor) setClipboard({ kind: 'door', data: selectedDoor });
    else if (selectedWindow) setClipboard({ kind: 'window', data: selectedWindow });
    else if (selectedOutlet) setClipboard({ kind: 'outlet', data: selectedOutlet });
    else if (selectedPath) setClipboard({ kind: 'path', data: selectedPath });
    else if (selectedLabel) setClipboard({ kind: 'label', data: selectedLabel });
  }, [selectedDoor, selectedFurniture, selectedLabel, selectedOutlet, selectedPath, selectedWall, selectedWindow]);

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
        const controlPoint = p.controlPoint
          ? { x: p.controlPoint.x + PASTE_OFFSET_MM, y: p.controlPoint.y + PASTE_OFFSET_MM }
          : undefined;
        const created = addPath(start, end, p.showArrow, p.curve, controlPoint);
        if (p.memo) updatePath(created.id, { memo: p.memo });
        setClipboard({ kind: 'path', data: { ...p, start, end, controlPoint } });
        break;
      }
      case 'label': {
        const l = clipboard.data;
        const position = { x: l.x + PASTE_OFFSET_MM, y: l.y + PASTE_OFFSET_MM };
        addLabel(position, l.text);
        setClipboard({ kind: 'label', data: { ...l, x: position.x, y: position.y } });
        break;
      }
    }
  }, [
    addDoor,
    addFurniture,
    addLabel,
    addOutlet,
    addPath,
    addWall,
    addWindow,
    clipboard,
    state.walls,
    updateFurniture,
    updatePath,
    updateWindow,
  ]);

  const undo = useCallback(() => dispatch(UNDO), []);
  const redo = useCallback(() => dispatch(REDO), []);

  // 드래그(이동/회전/리사이즈) 한 제스처를 "시작→끝" 한 건의 History로 묶기 위한 트랜잭션.
  // 드래그 시작 시 beginTransientEdit로 지금 상태를 캡처해두고, 드래그 도중에는
  // update*(..., true)로 transient 갱신만 하다가(History에 안 쌓임), 드래그가 끝나면
  // 실제로 값이 바뀐 경우에만 commitTransientEdit을 호출해 캡처해둔 시작 상태를
  // History 한 건으로 기록한다. 아무 것도 안 바뀌었으면 discardTransientEdit으로 흘려보낸다.
  const pendingSnapshotRef = useRef<FloorPlanState | null>(null);

  const beginTransientEdit = useCallback(() => {
    pendingSnapshotRef.current = state;
  }, [state]);

  const commitTransientEdit = useCallback(() => {
    const before = pendingSnapshotRef.current;
    pendingSnapshotRef.current = null;
    if (before) dispatch(commit(before));
  }, []);

  const discardTransientEdit = useCallback(() => {
    pendingSnapshotRef.current = null;
  }, []);

  const exportDocument = useCallback((): FloorPlanDocument => serializeFloorPlan(state), [state]);

  const loadDocument = useCallback((input: unknown): boolean => {
    const doc = parseFloorPlanDocument(input);
    if (!doc) return false;
    dispatch(reset(documentToState(doc)));
    setClipboard(null);
    return true;
  }, []);

  const newDocument = useCallback(() => {
    dispatch(reset(initialFloorPlanState));
    setClipboard(null);
    try {
      localStorage.removeItem(AUTOSAVE_STORAGE_KEY);
    } catch {
      // 무시 — 다음 자동 저장 때 새 빈 도면으로 다시 덮어써진다.
    }
  }, []);

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
  const visibleLabels = useMemo(() => byVisibleLayer(state.labels, visibleLayerIds), [state.labels, visibleLayerIds]);

  return {
    walls: state.walls,
    furniture: state.furniture,
    doors: state.doors,
    windows: state.windows,
    outlets: state.outlets,
    paths: state.paths,
    labels: state.labels,
    visibleWalls,
    visibleFurniture,
    visibleDoors,
    visibleWindows,
    visibleOutlets,
    visiblePaths,
    visibleLabels,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
    selectedObject,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
    selectedLabel,
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
    addLabel,
    updateLabel,
    deleteLabel,
    selectWall,
    selectFurniture,
    selectDoor,
    selectWindow,
    selectOutlet,
    selectPath,
    selectLabel,
    deselect,
    deleteSelected,
    selection: state.selection,
    selectionCount: state.selection.length,
    toggleSelectObject,
    setSelection,
    isSelected,
    selectedFurnitureIds,
    selectedOutletIds,
    selectedPathIds,
    selectedLabelIds,
    canCopy: selectedObject !== null,
    canPaste: clipboard !== null,
    copySelected,
    pasteClipboard,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    undo,
    redo,
    beginTransientEdit,
    commitTransientEdit,
    discardTransientEdit,
    exportDocument,
    loadDocument,
    newDocument,
    addLayer,
    renameLayer,
    toggleLayerVisibility,
    deleteLayer,
    setActiveLayer,
    moveObjectToLayer,
  };
}

export type UseFloorPlanResult = ReturnType<typeof useFloorPlan>;
