import { useCallback, useRef, useState } from 'react';
import type { Bounds, Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Path } from '../types/path';
import type { Furniture, FurnitureShape } from '../types/furniture';
import type { Polygon } from '../types/polygon';
import type { DimensionLine, DimensionMode } from '../types/dimension';
import type { ObjectKind, SelectionItem } from '../state/floorPlanReducer';
import {
  DEFAULT_ARM_THICKNESS_MM,
  DEFAULT_DIMENSION_MODE,
  DEFAULT_DOOR_WIDTH_MM,
  DEFAULT_FURNITURE_SIZE,
  DEFAULT_LABEL_TEXT,
  DEFAULT_OUTLET_COUNT,
  DEFAULT_SNAP_CATEGORIES,
  DEFAULT_WALL_LENGTH_SNAP_MM,
  DEFAULT_WALL_THICKNESS_MM,
  DEFAULT_WINDOW_WIDTH_MM,
  BOX_SELECT_MIN_DRAG_PX,
  CURVE_CONTROL_HANDLE_RADIUS_PX,
  DIMENSION_ENDPOINT_HANDLE_RADIUS_PX,
  DIMENSION_HIT_TOLERANCE_PX,
  FURNITURE_HANDLE_RADIUS_PX,
  LABEL_HIT_RADIUS_PX,
  MIN_PATH_LENGTH_MM,
  MIN_POLYGON_VERTICES,
  MIN_WALL_LENGTH_MM,
  OPENING_WALL_HIT_TOLERANCE_PX,
  PATH_ENDPOINT_HANDLE_RADIUS_PX,
  PATH_HIT_TOLERANCE_PX,
  POLYGON_CLOSE_HIT_RADIUS_PX,
  POLYGON_EDGE_HIT_TOLERANCE_PX,
  POLYGON_VERTEX_HANDLE_RADIUS_PX,
  WALL_ENDPOINT_HANDLE_RADIUS_PX,
  WALL_HIT_TOLERANCE_PX,
  type SnapCategoryFlags,
} from '../config/constants';
import { screenToWorld, worldToScreen, type Viewport } from '../core/viewport';
import { snapAngleDeg, snapGroupDelta, snapObjectDelta, snapPoint, type SnapKind } from '../core/snap';
import { nextDisplayUnit, type DisplayUnit } from '../core/units';
import {
  distance,
  findWallAtPoint,
  hitTestWalls,
  projectPointOntoWall,
  wallKeyPoints,
  wallLengthMm,
  type WallEndpointKey,
} from '../core/wallGeometry';
import { furnitureKeyPoints, hitTestFurnitureList, rotationHandleWorldPoint } from '../core/furnitureGeometry';
import { clampOpeningOffset, hitTestDoors, hitTestOutlets, hitTestWindows } from '../core/openingGeometry';
import { defaultControlPoint, hitTestPaths, pathKeyPoints } from '../core/pathGeometry';
import { hitTestLabels } from '../core/labelGeometry';
import { hitTestPolygonVertex, hitTestPolygons, polygonBounds, polygonCentroid, polygonKeyPoints } from '../core/polygonGeometry';
import { dimensionKeyPoints, hitTestDimensions } from '../core/dimensionGeometry';
import { collectSnapCandidates, type SnapExclude } from '../core/snapPoints';
import { computeSelectionBounds, hitTestBoxSelection, rotatePointAround, selectionKeyPoints } from '../core/multiSelectGeometry';
import { groupRotationHandleWorldPoint } from '../core/renderSelection';
import type { UseFloorPlanResult } from './useFloorPlan';

export type ToolId =
  | 'select'
  | 'wall'
  | FurnitureShape
  | 'door'
  | 'window'
  | 'outlet'
  | 'path'
  | 'label'
  | 'polygon'
  | 'dimension';
export type PathShape = 'straight' | 'curve';

type PathEndpointKey = 'start' | 'end';

/** 다중 선택 그룹 이동/회전을 시작할 때, 각 객체의 "시작 상태"를 담아두는 스냅샷. */
type SelectionMemberSnapshot =
  | { kind: 'furniture'; id: string; x: number; y: number; rotationDeg: number }
  | { kind: 'outlet'; id: string; x: number; y: number }
  | { kind: 'label'; id: string; x: number; y: number }
  | { kind: 'path'; id: string; start: Point; end: Point; controlPoint?: Point }
  | { kind: 'polygon'; id: string; points: Point[] }
  | { kind: 'dimension'; id: string; start: Point; end: Point };

type DragState =
  | { type: 'pan'; lastClient: Point }
  | { type: 'boxSelect'; startWorld: Point; additive: boolean }
  | { type: 'moveWall'; wallId: string; original: Wall; grabWorld: Point }
  | { type: 'endpointDrag'; wallId: string; key: WallEndpointKey; original: Wall }
  | { type: 'moveFurniture'; furnitureId: string; original: Furniture; grabWorld: Point }
  | { type: 'rotateFurniture'; furnitureId: string; originalRotationDeg: number }
  | { type: 'moveDoor'; doorId: string; originalOffsetMm: number }
  | { type: 'moveWindow'; windowId: string; originalOffsetMm: number }
  | { type: 'moveOutlet'; outletId: string; original: Point; grabWorld: Point }
  | { type: 'movePath'; pathId: string; original: Path; grabWorld: Point }
  | { type: 'pathEndpointDrag'; pathId: string; key: PathEndpointKey; original: Point }
  | { type: 'curveControlDrag'; pathId: string; original: Point }
  | { type: 'moveLabel'; labelId: string; original: Point; grabWorld: Point }
  | { type: 'movePolygon'; polygonId: string; original: Polygon; grabWorld: Point }
  | { type: 'rotatePolygon'; polygonId: string; original: Point[]; pivot: Point; startAngleDeg: number }
  | { type: 'polygonVertexDrag'; polygonId: string; vertexIndex: number; original: Point }
  | { type: 'moveDimension'; dimensionId: string; original: DimensionLine; grabWorld: Point }
  | { type: 'dimensionEndpointDrag'; dimensionId: string; key: PathEndpointKey; original: Point }
  | { type: 'moveSelection'; members: SelectionMemberSnapshot[]; initialBounds: Bounds | null; grabWorld: Point; clickedItem: SelectionItem }
  | { type: 'rotateSelection'; members: SelectionMemberSnapshot[]; pivot: Point; startAngleDeg: number };

interface UsePlanInteractionArgs {
  viewport: Viewport;
  panBy: (dx: number, dy: number) => void;
  floorPlan: UseFloorPlanResult;
}

const isFurnitureTool = (tool: ToolId): tool is FurnitureShape =>
  tool === 'rectangle' || tool === 'circle' || tool === 'lshape';

/** origin 기준 point의 각도는 그대로 두고, 거리만 unitMm의 배수로 반올림한다. */
function snapLengthAlong(origin: Point, point: Point, unitMm: number): Point {
  const dx = point.x - origin.x;
  const dy = point.y - origin.y;
  const dist = Math.hypot(dx, dy);
  if (dist === 0) return point;

  const snappedDist = Math.round(dist / unitMm) * unitMm;
  const scale = snappedDist / dist;
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

function pointArraysEqual(a: Point[], b: Point[]): boolean {
  return a.length === b.length && a.every((p, i) => pointsEqual(p, b[i]));
}

function selectionKey(item: SelectionItem): string {
  return `${item.kind}:${item.id}`;
}

/** 기존 선택에 새 항목들을 합친다(이미 있는 항목은 중복 추가하지 않음) — 영역 선택에 Shift를 누른 경우. */
function mergeSelections(existing: SelectionItem[], additions: SelectionItem[]): SelectionItem[] {
  const seen = new Set(existing.map(selectionKey));
  const merged = [...existing];
  for (const item of additions) {
    if (!seen.has(selectionKey(item))) {
      merged.push(item);
      seen.add(selectionKey(item));
    }
  }
  return merged;
}

/**
 * 캔버스 위 마우스/키보드 조작을 총괄하는 훅.
 * "빈 캔버스 드래그 = 영역 선택, 객체 클릭 = 선택/이동" 처럼 도구(activeTool)에 따라
 * 같은 왼쪽 버튼 드래그를 다르게 해석하는 판단을 여기서 전담하고, 실제 카메라 이동은
 * useViewport에, 실제 데이터 변경은 useFloorPlan에 위임한다.
 *
 * Undo 기록 방식: 드래그(이동/회전/리사이즈) 도중에는 update*(..., transient=true)로
 * 화면만 갱신하고 History에는 쌓지 않는다. 드래그가 끝나는 순간(endDrag) 실제로 값이
 * 바뀌었는지 확인해, 바뀌었으면 commitTransientEdit()으로 "시작→끝"을 History 한 건으로
 * 기록하고, 바뀐 게 없으면(클릭만 하고 끝난 경우 등) 아무 기록도 남기지 않는다. 다중 선택
 * 이동/회전도 beginTransientEdit()이 도면 전체 상태를 한 번에 캡처해두므로, 객체 개수와
 * 무관하게 동일한 방식으로 "한 건"으로 기록된다.
 *
 * 다중 선택(Shift+클릭 / 영역 드래그)은 가구·콘센트·동선·라벨만 대상으로 한다 — 벽/문/창문
 * 같은 구조 객체는 기존 단일 선택 흐름을 그대로 유지한다(요청에서도 구조 객체는 안전한
 * 경우에만 포함하라고 명시).
 */
export function usePlanInteraction({ viewport, panBy, floorPlan }: UsePlanInteractionArgs) {
  const {
    visibleWalls: walls,
    visibleFurniture: furniture,
    visibleDoors: doors,
    visibleWindows: windows,
    visibleOutlets: outlets,
    visiblePaths: paths,
    visibleLabels: labels,
    visiblePolygons: polygons,
    visibleDimensions: dimensions,
    selectedWall,
    selectedFurniture,
    selectedPath,
    selectedPolygon,
    selectedDimension,
    selection,
    selectionCount,
    isSelected,
    toggleSelectObject,
    setSelection,
    addWall,
    updateWall,
    addFurniture,
    updateFurniture,
    addDoor,
    updateDoor,
    addWindow,
    updateWindow,
    addOutlet,
    updateOutlet,
    addPath,
    updatePath,
    addLabel,
    updateLabel,
    addPolygon,
    updatePolygon,
    addDimension,
    updateDimension,
    selectWall,
    selectFurniture,
    selectDoor,
    selectWindow,
    selectOutlet,
    selectPath,
    selectLabel,
    selectPolygon,
    selectDimension,
    deselect,
    deleteSelected,
    copySelected,
    pasteClipboard,
    undo,
    redo,
    beginTransientEdit,
    commitTransientEdit,
    discardTransientEdit,
  } = floorPlan;

  const [activeTool, setActiveToolState] = useState<ToolId>('select');
  const [defaultWallThicknessMm, setDefaultWallThicknessMm] = useState(DEFAULT_WALL_THICKNESS_MM);
  const [wallLengthSnapMm, setWallLengthSnapMm] = useState(DEFAULT_WALL_LENGTH_SNAP_MM);
  const [pathShape, setPathShape] = useState<PathShape>('straight');
  const [dimensionMode, setDimensionMode] = useState<DimensionMode>(DEFAULT_DIMENSION_MODE);
  const [snapEnabled, setSnapEnabled] = useState(true);
  const [snapCategories, setSnapCategories] = useState<SnapCategoryFlags>(DEFAULT_SNAP_CATEGORIES);
  const toggleSnapCategory = useCallback((key: keyof SnapCategoryFlags) => {
    setSnapCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const [displayUnit, setDisplayUnit] = useState<DisplayUnit>('mm');
  const cycleDisplayUnit = useCallback(() => setDisplayUnit((unit) => nextDisplayUnit(unit)), []);

  const [cursorWorld, setCursorWorld] = useState<Point | null>(null);
  const [chainStart, setChainStart] = useState<Point | null>(null);
  const [previewPoint, setPreviewPoint] = useState<Point | null>(null);
  const [previewSnapKind, setPreviewSnapKind] = useState<SnapKind>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: Point; end: Point } | null>(null);
  const [polygonDraft, setPolygonDraft] = useState<Point[]>([]);

  const dragState = useRef<DragState | null>(null);

  const setActiveTool = useCallback((tool: ToolId) => {
    setActiveToolState(tool);
    setChainStart(null);
    setPreviewPoint(null);
    setPolygonDraft([]);
  }, []);

  const endChain = useCallback(() => {
    setChainStart(null);
    setPreviewPoint(null);
    setPolygonDraft([]);
  }, []);

  const getScreenPoint = useCallback((e: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const snapCandidates = useCallback(
    (exclude?: SnapExclude) =>
      collectSnapCandidates({ walls, furniture, doors, windows, outlets, paths, labels, polygons, dimensions }, snapCategories, exclude),
    [doors, furniture, labels, outlets, paths, polygons, dimensions, snapCategories, walls, windows],
  );

  /** 다중 선택 이동/회전 시작 시, 선택된 각 객체의 현재 상태를 스냅샷으로 캡처한다. */
  const buildSelectionSnapshot = useCallback(
    (items: SelectionItem[]): SelectionMemberSnapshot[] => {
      const result: SelectionMemberSnapshot[] = [];
      for (const item of items) {
        if (item.kind === 'furniture') {
          const f = furniture.find((x) => x.id === item.id);
          if (f) result.push({ kind: 'furniture', id: f.id, x: f.x, y: f.y, rotationDeg: f.rotationDeg });
        } else if (item.kind === 'outlet') {
          const o = outlets.find((x) => x.id === item.id);
          if (o) result.push({ kind: 'outlet', id: o.id, x: o.x, y: o.y });
        } else if (item.kind === 'label') {
          const l = labels.find((x) => x.id === item.id);
          if (l) result.push({ kind: 'label', id: l.id, x: l.x, y: l.y });
        } else if (item.kind === 'path') {
          const p = paths.find((x) => x.id === item.id);
          if (p) result.push({ kind: 'path', id: p.id, start: p.start, end: p.end, controlPoint: p.controlPoint });
        } else if (item.kind === 'polygon') {
          const p = polygons.find((x) => x.id === item.id);
          if (p) result.push({ kind: 'polygon', id: p.id, points: p.points });
        } else if (item.kind === 'dimension') {
          const d = dimensions.find((x) => x.id === item.id);
          if (d) result.push({ kind: 'dimension', id: d.id, start: d.start, end: d.end });
        }
      }
      return result;
    },
    [furniture, outlets, labels, paths, polygons, dimensions],
  );

  const memberIdsByKind = useCallback((members: SelectionMemberSnapshot[], kind: ObjectKind) => {
    return members.filter((m) => m.kind === kind).map((m) => m.id);
  }, []);

  const selectSingleItem = useCallback(
    (item: SelectionItem) => {
      if (item.kind === 'furniture') selectFurniture(item.id);
      else if (item.kind === 'outlet') selectOutlet(item.id);
      else if (item.kind === 'path') selectPath(item.id);
      else if (item.kind === 'label') selectLabel(item.id);
      else if (item.kind === 'polygon') selectPolygon(item.id);
      else if (item.kind === 'dimension') selectDimension(item.id);
    },
    [selectFurniture, selectLabel, selectOutlet, selectPath, selectPolygon, selectDimension],
  );

  const startMoveSelection = useCallback(
    (worldRaw: Point, currentTarget: HTMLCanvasElement, pointerId: number, clickedItem: SelectionItem) => {
      const members = buildSelectionSnapshot(selection);
      if (members.length === 0) return false;
      // 실제(회전 반영) 바운딩 박스를 드래그 시작 시점에 한 번만 계산해둔다 — 평행 이동이므로
      // 드래그 도중에는 이 박스를 delta만큼 그대로 옮기면 된다(재계산 불필요).
      const initialBounds = computeSelectionBounds(selection, { furniture, outlets, paths, labels, polygons, dimensions });
      beginTransientEdit();
      dragState.current = { type: 'moveSelection', members, initialBounds, grabWorld: worldRaw, clickedItem };
      currentTarget.setPointerCapture(pointerId);
      return true;
    },
    [beginTransientEdit, buildSelectionSnapshot, furniture, labels, outlets, paths, polygons, dimensions, selection],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const screen = getScreenPoint(e);
      const worldRaw = screenToWorld(viewport, screen);

      // 가운데 버튼은 도구와 무관하게 항상 화면 이동
      if (e.button === 1) {
        dragState.current = { type: 'pan', lastClient: { x: e.clientX, y: e.clientY } };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }
      if (e.button !== 0) return;

      if (activeTool === 'wall') {
        const candidatePoints = snapCandidates();
        if (!chainStart) {
          const snapped = snapPoint(worldRaw, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
          setChainStart(snapped.point);
        } else {
          const snapped = snapPoint(worldRaw, {
            origin: chainStart,
            candidatePoints,
            scale: viewport.scale,
            enabled: snapEnabled,
          });
          // 다른 벽 끝점 등에 붙는 경우(우선순위 1위)가 아닐 때만 길이를 설정 단위로 반올림한다 —
          // 안 그러면 정확히 이어붙인 지점이 다시 어긋나 버린다.
          const finalPoint =
            snapEnabled && snapped.kind !== 'endpoint' ? snapLengthAlong(chainStart, snapped.point, wallLengthSnapMm) : snapped.point;
          if (distance(chainStart, finalPoint) >= MIN_WALL_LENGTH_MM) {
            addWall(chainStart, finalPoint, defaultWallThicknessMm);
            setChainStart(finalPoint);
          }
        }
        return;
      }

      if (isFurnitureTool(activeTool)) {
        const snapped = snapPoint(worldRaw, { scale: viewport.scale, enabled: snapEnabled });
        const size = DEFAULT_FURNITURE_SIZE[activeTool];
        const extra = activeTool === 'lshape' ? { armThicknessMm: DEFAULT_ARM_THICKNESS_MM } : undefined;
        addFurniture(activeTool, snapped.point, size, extra);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'door' || activeTool === 'window') {
        const hit = findWallAtPoint(worldRaw, walls, OPENING_WALL_HIT_TOLERANCE_PX / viewport.scale);
        if (hit) {
          const width = Math.min(activeTool === 'door' ? DEFAULT_DOOR_WIDTH_MM : DEFAULT_WINDOW_WIDTH_MM, wallLengthMm(hit.wall));
          const offset = clampOpeningOffset(hit.offsetMm - width / 2, width, wallLengthMm(hit.wall));
          if (activeTool === 'door') addDoor(hit.wall.id, offset, width);
          else addWindow(hit.wall.id, offset, width);
          setActiveTool('select');
        }
        return;
      }

      if (activeTool === 'outlet') {
        const snapped = snapPoint(worldRaw, { candidatePoints: snapCandidates(), scale: viewport.scale, enabled: snapEnabled });
        addOutlet(snapped.point, DEFAULT_OUTLET_COUNT);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'label') {
        const snapped = snapPoint(worldRaw, { candidatePoints: snapCandidates(), scale: viewport.scale, enabled: snapEnabled });
        addLabel(snapped.point, DEFAULT_LABEL_TEXT);
        setActiveTool('select');
        return;
      }

      if (activeTool === 'path') {
        const candidatePoints = snapCandidates();
        if (!chainStart) {
          const snapped = snapPoint(worldRaw, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
          setChainStart(snapped.point);
        } else {
          const snapped = snapPoint(worldRaw, {
            origin: chainStart,
            candidatePoints,
            scale: viewport.scale,
            enabled: snapEnabled,
          });
          if (distance(chainStart, snapped.point) >= MIN_PATH_LENGTH_MM) {
            const isCurve = pathShape === 'curve';
            const controlPoint = isCurve ? defaultControlPoint(chainStart, snapped.point) : undefined;
            addPath(chainStart, snapped.point, true, isCurve, controlPoint);
            setActiveTool('select');
          }
        }
        return;
      }

      if (activeTool === 'polygon') {
        const candidatePoints = snapCandidates();
        const snapped = snapPoint(worldRaw, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });

        // 꼭짓점이 3개 이상일 때 첫 꼭짓점 근처를 다시 클릭하면 도형을 닫아 완성한다.
        if (polygonDraft.length >= MIN_POLYGON_VERTICES) {
          const firstScreen = worldToScreen(viewport, polygonDraft[0]);
          if (distance(screen, firstScreen) <= POLYGON_CLOSE_HIT_RADIUS_PX) {
            addPolygon(polygonDraft);
            setPolygonDraft([]);
            setActiveTool('select');
            return;
          }
        }
        setPolygonDraft((prev) => [...prev, snapped.point]);
        return;
      }

      if (activeTool === 'dimension') {
        const candidatePoints = snapCandidates();
        if (!chainStart) {
          const snapped = snapPoint(worldRaw, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
          setChainStart(snapped.point);
        } else {
          const snapped = snapPoint(worldRaw, {
            origin: chainStart,
            candidatePoints,
            scale: viewport.scale,
            enabled: snapEnabled,
          });
          if (distance(chainStart, snapped.point) >= MIN_PATH_LENGTH_MM) {
            addDimension(chainStart, snapped.point, dimensionMode);
            setActiveTool('select');
          }
        }
        return;
      }

      // --- 선택 도구 ---

      // 다중 선택(2개 이상) 중 그룹 회전 손잡이를 눌렀는지 먼저 확인한다.
      if (selectionCount > 1) {
        const bounds = computeSelectionBounds(selection, { furniture, outlets, paths, labels, polygons, dimensions });
        if (bounds) {
          const handleScreen = worldToScreen(viewport, groupRotationHandleWorldPoint(bounds));
          if (distance(screen, handleScreen) <= FURNITURE_HANDLE_RADIUS_PX * 1.5) {
            const members = buildSelectionSnapshot(selection);
            const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
            const startAngleDeg = (Math.atan2(worldRaw.y - center.y, worldRaw.x - center.x) * 180) / Math.PI;
            beginTransientEdit();
            dragState.current = { type: 'rotateSelection', members, pivot: center, startAngleDeg };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
      }

      if (selectedFurniture) {
        const handleScreen = worldToScreen(viewport, rotationHandleWorldPoint(selectedFurniture));
        if (distance(screen, handleScreen) <= FURNITURE_HANDLE_RADIUS_PX * 1.5) {
          beginTransientEdit();
          dragState.current = {
            type: 'rotateFurniture',
            furnitureId: selectedFurniture.id,
            originalRotationDeg: selectedFurniture.rotationDeg,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      if (selectedWall) {
        const startScreen = worldToScreen(viewport, selectedWall.start);
        const endScreen = worldToScreen(viewport, selectedWall.end);
        const handleTolerance = WALL_ENDPOINT_HANDLE_RADIUS_PX * 1.5;
        if (distance(screen, startScreen) <= handleTolerance) {
          beginTransientEdit();
          dragState.current = { type: 'endpointDrag', wallId: selectedWall.id, key: 'start', original: selectedWall };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
        if (distance(screen, endScreen) <= handleTolerance) {
          beginTransientEdit();
          dragState.current = { type: 'endpointDrag', wallId: selectedWall.id, key: 'end', original: selectedWall };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      if (selectedPath) {
        if (selectedPath.curve && selectedPath.controlPoint) {
          const controlScreen = worldToScreen(viewport, selectedPath.controlPoint);
          if (distance(screen, controlScreen) <= CURVE_CONTROL_HANDLE_RADIUS_PX * 1.5) {
            beginTransientEdit();
            dragState.current = { type: 'curveControlDrag', pathId: selectedPath.id, original: selectedPath.controlPoint };
            e.currentTarget.setPointerCapture(e.pointerId);
            return;
          }
        }
        const startScreen = worldToScreen(viewport, selectedPath.start);
        const endScreen = worldToScreen(viewport, selectedPath.end);
        const handleTolerance = PATH_ENDPOINT_HANDLE_RADIUS_PX * 1.5;
        if (distance(screen, startScreen) <= handleTolerance) {
          beginTransientEdit();
          dragState.current = { type: 'pathEndpointDrag', pathId: selectedPath.id, key: 'start', original: selectedPath.start };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
        if (distance(screen, endScreen) <= handleTolerance) {
          beginTransientEdit();
          dragState.current = { type: 'pathEndpointDrag', pathId: selectedPath.id, key: 'end', original: selectedPath.end };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      if (selectedDimension) {
        const startScreen = worldToScreen(viewport, selectedDimension.start);
        const endScreen = worldToScreen(viewport, selectedDimension.end);
        const handleTolerance = DIMENSION_ENDPOINT_HANDLE_RADIUS_PX * 1.5;
        if (distance(screen, startScreen) <= handleTolerance) {
          beginTransientEdit();
          dragState.current = { type: 'dimensionEndpointDrag', dimensionId: selectedDimension.id, key: 'start', original: selectedDimension.start };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
        if (distance(screen, endScreen) <= handleTolerance) {
          beginTransientEdit();
          dragState.current = { type: 'dimensionEndpointDrag', dimensionId: selectedDimension.id, key: 'end', original: selectedDimension.end };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      // 다각형 하나만 선택된 경우: 회전 손잡이(바운딩 박스 위, 그룹 회전과 동일한 손잡이) 또는
      // 꼭짓점 손잡이를 눌렀는지 먼저 확인한다(둘 다 본체 드래그보다 우선).
      if (selectedPolygon) {
        const bounds = polygonBounds(selectedPolygon);
        const handleScreen = worldToScreen(viewport, groupRotationHandleWorldPoint(bounds));
        if (distance(screen, handleScreen) <= FURNITURE_HANDLE_RADIUS_PX * 1.5) {
          const centroid = polygonCentroid(selectedPolygon);
          const startAngleDeg = (Math.atan2(worldRaw.y - centroid.y, worldRaw.x - centroid.x) * 180) / Math.PI;
          beginTransientEdit();
          dragState.current = {
            type: 'rotatePolygon',
            polygonId: selectedPolygon.id,
            original: selectedPolygon.points,
            pivot: centroid,
            startAngleDeg,
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }

        const vertexIndex = hitTestPolygonVertex(worldRaw, selectedPolygon, POLYGON_VERTEX_HANDLE_RADIUS_PX * 1.5 / viewport.scale);
        if (vertexIndex !== null) {
          beginTransientEdit();
          dragState.current = {
            type: 'polygonVertexDrag',
            polygonId: selectedPolygon.id,
            vertexIndex,
            original: selectedPolygon.points[vertexIndex],
          };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      const hitLabel = hitTestLabels(worldRaw, labels, LABEL_HIT_RADIUS_PX / viewport.scale);
      if (hitLabel) {
        if (e.shiftKey) {
          toggleSelectObject('label', hitLabel.id);
          return;
        }
        if (isSelected('label', hitLabel.id) && selectionCount > 1) {
          if (startMoveSelection(worldRaw, e.currentTarget, e.pointerId, { kind: 'label', id: hitLabel.id })) return;
        }
        selectLabel(hitLabel.id);
        beginTransientEdit();
        dragState.current = {
          type: 'moveLabel',
          labelId: hitLabel.id,
          original: { x: hitLabel.x, y: hitLabel.y },
          grabWorld: worldRaw,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitFurniture = hitTestFurnitureList(worldRaw, furniture);
      if (hitFurniture) {
        if (e.shiftKey) {
          toggleSelectObject('furniture', hitFurniture.id);
          return;
        }
        if (isSelected('furniture', hitFurniture.id) && selectionCount > 1) {
          if (startMoveSelection(worldRaw, e.currentTarget, e.pointerId, { kind: 'furniture', id: hitFurniture.id })) return;
        }
        selectFurniture(hitFurniture.id);
        beginTransientEdit();
        dragState.current = {
          type: 'moveFurniture',
          furnitureId: hitFurniture.id,
          original: hitFurniture,
          grabWorld: worldRaw,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const openingTolerance = OPENING_WALL_HIT_TOLERANCE_PX / viewport.scale;
      const hitDoor = hitTestDoors(worldRaw, doors, walls, openingTolerance);
      if (hitDoor) {
        selectDoor(hitDoor.id);
        beginTransientEdit();
        dragState.current = { type: 'moveDoor', doorId: hitDoor.id, originalOffsetMm: hitDoor.offsetMm };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitWindow = hitTestWindows(worldRaw, windows, walls, openingTolerance);
      if (hitWindow) {
        selectWindow(hitWindow.id);
        beginTransientEdit();
        dragState.current = { type: 'moveWindow', windowId: hitWindow.id, originalOffsetMm: hitWindow.offsetMm };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitOutlet = hitTestOutlets(worldRaw, outlets, openingTolerance);
      if (hitOutlet) {
        if (e.shiftKey) {
          toggleSelectObject('outlet', hitOutlet.id);
          return;
        }
        if (isSelected('outlet', hitOutlet.id) && selectionCount > 1) {
          if (startMoveSelection(worldRaw, e.currentTarget, e.pointerId, { kind: 'outlet', id: hitOutlet.id })) return;
        }
        selectOutlet(hitOutlet.id);
        beginTransientEdit();
        dragState.current = {
          type: 'moveOutlet',
          outletId: hitOutlet.id,
          original: { x: hitOutlet.x, y: hitOutlet.y },
          grabWorld: worldRaw,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitPath = hitTestPaths(worldRaw, paths, PATH_HIT_TOLERANCE_PX / viewport.scale);
      if (hitPath) {
        if (e.shiftKey) {
          toggleSelectObject('path', hitPath.id);
          return;
        }
        if (isSelected('path', hitPath.id) && selectionCount > 1) {
          if (startMoveSelection(worldRaw, e.currentTarget, e.pointerId, { kind: 'path', id: hitPath.id })) return;
        }
        selectPath(hitPath.id);
        beginTransientEdit();
        dragState.current = {
          type: 'movePath',
          pathId: hitPath.id,
          original: hitPath,
          grabWorld: worldRaw,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitPolygon = hitTestPolygons(worldRaw, polygons, POLYGON_EDGE_HIT_TOLERANCE_PX / viewport.scale);
      if (hitPolygon) {
        if (e.shiftKey) {
          toggleSelectObject('polygon', hitPolygon.id);
          return;
        }
        if (isSelected('polygon', hitPolygon.id) && selectionCount > 1) {
          if (startMoveSelection(worldRaw, e.currentTarget, e.pointerId, { kind: 'polygon', id: hitPolygon.id })) return;
        }
        selectPolygon(hitPolygon.id);
        beginTransientEdit();
        dragState.current = {
          type: 'movePolygon',
          polygonId: hitPolygon.id,
          original: hitPolygon,
          grabWorld: worldRaw,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitDimension = hitTestDimensions(worldRaw, dimensions, DIMENSION_HIT_TOLERANCE_PX / viewport.scale);
      if (hitDimension) {
        if (e.shiftKey) {
          toggleSelectObject('dimension', hitDimension.id);
          return;
        }
        if (isSelected('dimension', hitDimension.id) && selectionCount > 1) {
          if (startMoveSelection(worldRaw, e.currentTarget, e.pointerId, { kind: 'dimension', id: hitDimension.id })) return;
        }
        selectDimension(hitDimension.id);
        beginTransientEdit();
        dragState.current = {
          type: 'moveDimension',
          dimensionId: hitDimension.id,
          original: hitDimension,
          grabWorld: worldRaw,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitWall = hitTestWalls(worldRaw, walls, WALL_HIT_TOLERANCE_PX / viewport.scale);
      if (hitWall) {
        selectWall(hitWall.id);
        beginTransientEdit();
        dragState.current = { type: 'moveWall', wallId: hitWall.id, original: hitWall, grabWorld: worldRaw };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      // 빈 캔버스 클릭/드래그: 영역 선택을 시작한다(Shift를 누르면 기존 선택에 더한다).
      // 화면 이동은 가운데 버튼 드래그로 한다.
      setSelectionBox({ start: worldRaw, end: worldRaw });
      dragState.current = { type: 'boxSelect', startWorld: worldRaw, additive: e.shiftKey };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [
      activeTool,
      addDimension,
      addDoor,
      addFurniture,
      addLabel,
      addOutlet,
      addPath,
      addPolygon,
      addWall,
      addWindow,
      beginTransientEdit,
      buildSelectionSnapshot,
      chainStart,
      defaultWallThicknessMm,
      dimensionMode,
      dimensions,
      doors,
      furniture,
      getScreenPoint,
      isSelected,
      labels,
      outlets,
      pathShape,
      paths,
      polygonDraft,
      polygons,
      selectDimension,
      selectDoor,
      selectFurniture,
      selectLabel,
      selectOutlet,
      selectPath,
      selectPolygon,
      selectWall,
      selectWindow,
      selectedDimension,
      selectedFurniture,
      selectedPath,
      selectedPolygon,
      selectedWall,
      selection,
      selectionCount,
      setActiveTool,
      snapCandidates,
      snapEnabled,
      startMoveSelection,
      toggleSelectObject,
      viewport,
      walls,
      wallLengthSnapMm,
      windows,
    ],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const screen = getScreenPoint(e);
      const worldRaw = screenToWorld(viewport, screen);
      setCursorWorld(worldRaw);

      const drag = dragState.current;
      if (drag?.type === 'pan') {
        const dx = e.clientX - drag.lastClient.x;
        const dy = e.clientY - drag.lastClient.y;
        drag.lastClient = { x: e.clientX, y: e.clientY };
        panBy(dx, dy);
        return;
      }

      if (drag?.type === 'boxSelect') {
        setSelectionBox({ start: drag.startWorld, end: worldRaw });
        return;
      }

      if (drag?.type === 'moveWall') {
        // 벽 전체를 옮길 때는 시작점 하나가 아니라 시작·끝·중간점을 모두 스냅 후보로 검사한다.
        const candidatePoints = snapCandidates({ wallId: drag.wallId });
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const snap = snapObjectDelta(wallKeyPoints(drag.original), drag.original.start, rawDelta, candidatePoints, viewport.scale, snapEnabled);
        const finalDelta = { x: rawDelta.x + snap.delta.x, y: rawDelta.y + snap.delta.y };
        const newStart = { x: drag.original.start.x + finalDelta.x, y: drag.original.start.y + finalDelta.y };
        const newEnd = { x: drag.original.end.x + finalDelta.x, y: drag.original.end.y + finalDelta.y };
        updateWall(drag.wallId, { start: newStart, end: newEnd }, true);
        setPreviewPoint(newStart);
        setPreviewSnapKind(snap.kind);
        return;
      }

      if (drag?.type === 'endpointDrag') {
        const wall = walls.find((w) => w.id === drag.wallId);
        if (!wall) return;
        const other = drag.key === 'start' ? wall.end : wall.start;
        const candidatePoints = snapCandidates({ wallId: drag.wallId });
        const snapped = snapPoint(worldRaw, { origin: other, candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        updateWall(drag.wallId, { [drag.key]: snapped.point } as Partial<Wall>, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'moveFurniture') {
        // 가구를 옮길 때는 중심점 하나가 아니라 모서리 4개+변 중앙 4개+중심(원은 상하좌우+중심)을
        // 모두 스냅 후보로 검사한다 — 마우스로 잡은 위치가 아니라 가구 자체의 기준점 기준.
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const candidatePoints = snapCandidates({ furnitureId: drag.furnitureId });
        const original = { x: drag.original.x, y: drag.original.y };
        const snap = snapObjectDelta(furnitureKeyPoints(drag.original), original, rawDelta, candidatePoints, viewport.scale, snapEnabled);
        const finalDelta = { x: rawDelta.x + snap.delta.x, y: rawDelta.y + snap.delta.y };
        const newCenter = { x: original.x + finalDelta.x, y: original.y + finalDelta.y };
        updateFurniture(drag.furnitureId, { x: newCenter.x, y: newCenter.y }, true);
        setPreviewPoint(newCenter);
        setPreviewSnapKind(snap.kind);
        return;
      }

      if (drag?.type === 'rotateFurniture') {
        const item = furniture.find((f) => f.id === drag.furnitureId);
        if (!item) return;
        const dx = worldRaw.x - item.x;
        const dy = worldRaw.y - item.y;
        const rawDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        const snappedDeg = snapEnabled ? snapAngleDeg(rawDeg) : null;
        const finalDeg = ((snappedDeg ?? rawDeg) + 360) % 360;
        updateFurniture(drag.furnitureId, { rotationDeg: finalDeg }, true);
        setPreviewSnapKind(snappedDeg !== null ? 'angle' : null);
        return;
      }

      if (drag?.type === 'moveDoor' || drag?.type === 'moveWindow') {
        const isDoor = drag.type === 'moveDoor';
        const id = isDoor ? drag.doorId : drag.windowId;
        const opening = isDoor ? doors.find((d) => d.id === id) : windows.find((w) => w.id === id);
        const wall = opening ? walls.find((w) => w.id === opening.wallId) : undefined;
        if (!opening || !wall) return;
        const { offsetMm } = projectPointOntoWall(worldRaw, wall);
        const newOffset = clampOpeningOffset(offsetMm - opening.widthMm / 2, opening.widthMm, wallLengthMm(wall));
        if (isDoor) updateDoor(id, { offsetMm: newOffset }, true);
        else updateWindow(id, { offsetMm: newOffset }, true);
        return;
      }

      if (drag?.type === 'moveOutlet') {
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const candidatePoints = snapCandidates();
        const snap = snapObjectDelta([drag.original], drag.original, rawDelta, candidatePoints, viewport.scale, snapEnabled);
        const finalDelta = { x: rawDelta.x + snap.delta.x, y: rawDelta.y + snap.delta.y };
        const newPoint = { x: drag.original.x + finalDelta.x, y: drag.original.y + finalDelta.y };
        updateOutlet(drag.outletId, { x: newPoint.x, y: newPoint.y }, true);
        setPreviewPoint(newPoint);
        setPreviewSnapKind(snap.kind);
        return;
      }

      if (drag?.type === 'movePath') {
        // 동선 전체를 옮길 때는 시작·끝·중간점(곡선이면 조절점·곡선 중간점도)을 모두 스냅 후보로 검사한다.
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const candidatePoints = snapCandidates({ pathId: drag.pathId });
        const snap = snapObjectDelta(pathKeyPoints(drag.original), drag.original.start, rawDelta, candidatePoints, viewport.scale, snapEnabled);
        const finalDelta = { x: rawDelta.x + snap.delta.x, y: rawDelta.y + snap.delta.y };
        const newStart = { x: drag.original.start.x + finalDelta.x, y: drag.original.start.y + finalDelta.y };
        const newEnd = { x: drag.original.end.x + finalDelta.x, y: drag.original.end.y + finalDelta.y };
        const newControlPoint = drag.original.controlPoint
          ? { x: drag.original.controlPoint.x + finalDelta.x, y: drag.original.controlPoint.y + finalDelta.y }
          : undefined;
        updatePath(drag.pathId, { start: newStart, end: newEnd, controlPoint: newControlPoint }, true);
        setPreviewPoint(newStart);
        setPreviewSnapKind(snap.kind);
        return;
      }

      if (drag?.type === 'pathEndpointDrag') {
        const path = paths.find((p) => p.id === drag.pathId);
        if (!path) return;
        const other = drag.key === 'start' ? path.end : path.start;
        const candidatePoints = snapCandidates({ pathId: drag.pathId });
        const snapped = snapPoint(worldRaw, { origin: other, candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        updatePath(drag.pathId, { [drag.key]: snapped.point } as Partial<Path>, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'curveControlDrag') {
        // 곡선 조절점은 "연결점"이 아니라 모양을 다듬는 손잡이라 격자 스냅만 적용한다.
        const snapped = snapPoint(worldRaw, { scale: viewport.scale, enabled: snapEnabled });
        updatePath(drag.pathId, { controlPoint: snapped.point }, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'moveLabel') {
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const candidatePoints = snapCandidates({ labelId: drag.labelId });
        const snap = snapObjectDelta([drag.original], drag.original, rawDelta, candidatePoints, viewport.scale, snapEnabled);
        const finalDelta = { x: rawDelta.x + snap.delta.x, y: rawDelta.y + snap.delta.y };
        const newPoint = { x: drag.original.x + finalDelta.x, y: drag.original.y + finalDelta.y };
        updateLabel(drag.labelId, { x: newPoint.x, y: newPoint.y }, true);
        setPreviewPoint(newPoint);
        setPreviewSnapKind(snap.kind);
        return;
      }

      if (drag?.type === 'movePolygon') {
        // 다각형 전체를 옮길 때는 모든 꼭짓점 + 각 변 중간점 + 중심을 스냅 후보로 검사한다.
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const candidatePoints = snapCandidates({ polygonId: drag.polygonId });
        const snap = snapObjectDelta(
          polygonKeyPoints(drag.original),
          drag.original.points[0],
          rawDelta,
          candidatePoints,
          viewport.scale,
          snapEnabled,
        );
        const finalDelta = { x: rawDelta.x + snap.delta.x, y: rawDelta.y + snap.delta.y };
        const newPoints = drag.original.points.map((p) => ({ x: p.x + finalDelta.x, y: p.y + finalDelta.y }));
        updatePolygon(drag.polygonId, { points: newPoints }, true);
        setPreviewPoint(newPoints[0]);
        setPreviewSnapKind(snap.kind);
        return;
      }

      if (drag?.type === 'rotatePolygon') {
        const currentAngleDeg = (Math.atan2(worldRaw.y - drag.pivot.y, worldRaw.x - drag.pivot.x) * 180) / Math.PI;
        let deltaDeg = currentAngleDeg - drag.startAngleDeg;
        if (snapEnabled) {
          const normalized = ((deltaDeg % 360) + 360) % 360;
          const snappedAbs = snapAngleDeg(normalized);
          if (snappedAbs !== null) deltaDeg = snappedAbs;
        }
        const newPoints = drag.original.map((p) => rotatePointAround(p, drag.pivot, deltaDeg));
        updatePolygon(drag.polygonId, { points: newPoints }, true);
        setPreviewSnapKind(null);
        return;
      }

      if (drag?.type === 'polygonVertexDrag') {
        const candidatePoints = snapCandidates({ polygonId: drag.polygonId });
        const snapped = snapPoint(worldRaw, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        const polygon = polygons.find((p) => p.id === drag.polygonId);
        if (!polygon) return;
        const newPoints = polygon.points.map((p, i) => (i === drag.vertexIndex ? snapped.point : p));
        updatePolygon(drag.polygonId, { points: newPoints }, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'moveDimension') {
        // 치수선 전체를 옮길 때는 측정 대상 시작·끝·중간점을 모두 스냅 후보로 검사한다.
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const candidatePoints = snapCandidates({ dimensionId: drag.dimensionId });
        const snap = snapObjectDelta(
          dimensionKeyPoints(drag.original),
          drag.original.start,
          rawDelta,
          candidatePoints,
          viewport.scale,
          snapEnabled,
        );
        const finalDelta = { x: rawDelta.x + snap.delta.x, y: rawDelta.y + snap.delta.y };
        const newStart = { x: drag.original.start.x + finalDelta.x, y: drag.original.start.y + finalDelta.y };
        const newEnd = { x: drag.original.end.x + finalDelta.x, y: drag.original.end.y + finalDelta.y };
        updateDimension(drag.dimensionId, { start: newStart, end: newEnd }, true);
        setPreviewPoint(newStart);
        setPreviewSnapKind(snap.kind);
        return;
      }

      if (drag?.type === 'dimensionEndpointDrag') {
        const candidatePoints = snapCandidates({ dimensionId: drag.dimensionId });
        const snapped = snapPoint(worldRaw, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        updateDimension(drag.dimensionId, { [drag.key]: snapped.point } as Partial<DimensionLine>, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'moveSelection') {
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };

        // 그룹 전체를 감싸는(회전 반영) 바운딩 박스의 모서리 4개 + 중심을 스냅 후보 지점으로 써서,
        // 그룹 안 어느 한 지점이라도 다른 객체에 붙을 수 있게 한다(요청 23번: 성능을 위해
        // 우선 바운딩 박스 기준점만 사용).
        const candidatePoints = snapCandidates({
          furnitureIds: memberIdsByKind(drag.members, 'furniture'),
          pathIds: memberIdsByKind(drag.members, 'path'),
          labelIds: memberIdsByKind(drag.members, 'label'),
          polygonIds: memberIdsByKind(drag.members, 'polygon'),
          dimensionIds: memberIdsByKind(drag.members, 'dimension'),
        });
        let finalDelta = rawDelta;
        let snapKind: SnapKind = null;
        if (drag.initialBounds) {
          const movingKeyPoints = selectionKeyPoints(drag.initialBounds).map((p) => ({ x: p.x + rawDelta.x, y: p.y + rawDelta.y }));
          const groupSnap = snapGroupDelta(movingKeyPoints, candidatePoints, viewport.scale, snapEnabled);
          if (groupSnap.kind) {
            finalDelta = { x: rawDelta.x + groupSnap.delta.x, y: rawDelta.y + groupSnap.delta.y };
            snapKind = groupSnap.kind;
          }
        }

        for (const member of drag.members) {
          if (member.kind === 'furniture') {
            updateFurniture(member.id, { x: member.x + finalDelta.x, y: member.y + finalDelta.y }, true);
          } else if (member.kind === 'outlet') {
            updateOutlet(member.id, { x: member.x + finalDelta.x, y: member.y + finalDelta.y }, true);
          } else if (member.kind === 'label') {
            updateLabel(member.id, { x: member.x + finalDelta.x, y: member.y + finalDelta.y }, true);
          } else if (member.kind === 'path') {
            updatePath(
              member.id,
              {
                start: { x: member.start.x + finalDelta.x, y: member.start.y + finalDelta.y },
                end: { x: member.end.x + finalDelta.x, y: member.end.y + finalDelta.y },
                controlPoint: member.controlPoint
                  ? { x: member.controlPoint.x + finalDelta.x, y: member.controlPoint.y + finalDelta.y }
                  : undefined,
              },
              true,
            );
          } else if (member.kind === 'polygon') {
            updatePolygon(member.id, { points: member.points.map((p) => ({ x: p.x + finalDelta.x, y: p.y + finalDelta.y })) }, true);
          } else if (member.kind === 'dimension') {
            updateDimension(
              member.id,
              {
                start: { x: member.start.x + finalDelta.x, y: member.start.y + finalDelta.y },
                end: { x: member.end.x + finalDelta.x, y: member.end.y + finalDelta.y },
              },
              true,
            );
          }
        }
        setPreviewSnapKind(snapKind);
        return;
      }

      if (drag?.type === 'rotateSelection') {
        const currentAngleDeg = (Math.atan2(worldRaw.y - drag.pivot.y, worldRaw.x - drag.pivot.x) * 180) / Math.PI;
        let deltaDeg = currentAngleDeg - drag.startAngleDeg;
        if (snapEnabled) {
          const normalized = ((deltaDeg % 360) + 360) % 360;
          const snappedAbs = snapAngleDeg(normalized);
          if (snappedAbs !== null) deltaDeg = snappedAbs;
        }

        for (const member of drag.members) {
          if (member.kind === 'furniture') {
            const rotated = rotatePointAround({ x: member.x, y: member.y }, drag.pivot, deltaDeg);
            const newRotation = ((member.rotationDeg + deltaDeg) % 360 + 360) % 360;
            updateFurniture(member.id, { x: rotated.x, y: rotated.y, rotationDeg: newRotation }, true);
          } else if (member.kind === 'outlet') {
            const rotated = rotatePointAround({ x: member.x, y: member.y }, drag.pivot, deltaDeg);
            updateOutlet(member.id, { x: rotated.x, y: rotated.y }, true);
          } else if (member.kind === 'label') {
            const rotated = rotatePointAround({ x: member.x, y: member.y }, drag.pivot, deltaDeg);
            updateLabel(member.id, { x: rotated.x, y: rotated.y }, true);
          } else if (member.kind === 'path') {
            const start = rotatePointAround(member.start, drag.pivot, deltaDeg);
            const end = rotatePointAround(member.end, drag.pivot, deltaDeg);
            const controlPoint = member.controlPoint ? rotatePointAround(member.controlPoint, drag.pivot, deltaDeg) : undefined;
            updatePath(member.id, { start, end, controlPoint }, true);
          } else if (member.kind === 'polygon') {
            updatePolygon(member.id, { points: member.points.map((p) => rotatePointAround(p, drag.pivot, deltaDeg)) }, true);
          } else if (member.kind === 'dimension') {
            updateDimension(
              member.id,
              {
                start: rotatePointAround(member.start, drag.pivot, deltaDeg),
                end: rotatePointAround(member.end, drag.pivot, deltaDeg),
              },
              true,
            );
          }
        }
        setPreviewSnapKind(null);
        return;
      }

      if ((activeTool === 'wall' || activeTool === 'path' || activeTool === 'dimension') && chainStart) {
        const candidatePoints = snapCandidates();
        const snapped = snapPoint(worldRaw, {
          origin: chainStart,
          candidatePoints,
          scale: viewport.scale,
          enabled: snapEnabled,
        });
        const finalPoint =
          activeTool === 'wall' && snapEnabled && snapped.kind !== 'endpoint'
            ? snapLengthAlong(chainStart, snapped.point, wallLengthSnapMm)
            : snapped.point;
        setPreviewPoint(finalPoint);
        setPreviewSnapKind(snapped.kind);
      }
    },
    [
      activeTool,
      chainStart,
      doors,
      furniture,
      getScreenPoint,
      memberIdsByKind,
      panBy,
      paths,
      polygons,
      snapCandidates,
      snapEnabled,
      updateDimension,
      updateDoor,
      updateFurniture,
      updateLabel,
      updateOutlet,
      updatePath,
      updatePolygon,
      updateWall,
      updateWindow,
      viewport,
      walls,
      wallLengthSnapMm,
      windows,
    ],
  );

  /** 드래그 종료 시 실제로 값이 바뀌었는지 확인한다 — 바뀐 게 없으면 History를 남기지 않는다. */
  const dragActuallyChanged = useCallback(
    (drag: DragState): boolean => {
      switch (drag.type) {
        case 'pan':
        case 'boxSelect':
          return false;
        case 'moveWall': {
          const current = walls.find((w) => w.id === drag.wallId);
          return !!current && (!pointsEqual(current.start, drag.original.start) || !pointsEqual(current.end, drag.original.end));
        }
        case 'endpointDrag': {
          const current = walls.find((w) => w.id === drag.wallId);
          return !!current && !pointsEqual(current[drag.key], drag.original[drag.key]);
        }
        case 'moveFurniture': {
          const current = furniture.find((f) => f.id === drag.furnitureId);
          return !!current && !pointsEqual({ x: current.x, y: current.y }, drag.original);
        }
        case 'rotateFurniture': {
          const current = furniture.find((f) => f.id === drag.furnitureId);
          return !!current && current.rotationDeg !== drag.originalRotationDeg;
        }
        case 'moveDoor': {
          const current = doors.find((d) => d.id === drag.doorId);
          return !!current && current.offsetMm !== drag.originalOffsetMm;
        }
        case 'moveWindow': {
          const current = windows.find((w) => w.id === drag.windowId);
          return !!current && current.offsetMm !== drag.originalOffsetMm;
        }
        case 'moveOutlet': {
          const current = outlets.find((o) => o.id === drag.outletId);
          return !!current && !pointsEqual({ x: current.x, y: current.y }, drag.original);
        }
        case 'movePath': {
          const current = paths.find((p) => p.id === drag.pathId);
          return !!current && (!pointsEqual(current.start, drag.original.start) || !pointsEqual(current.end, drag.original.end));
        }
        case 'pathEndpointDrag': {
          const current = paths.find((p) => p.id === drag.pathId);
          return !!current && !pointsEqual(current[drag.key], drag.original);
        }
        case 'curveControlDrag': {
          const current = paths.find((p) => p.id === drag.pathId);
          return !!current && !!current.controlPoint && !pointsEqual(current.controlPoint, drag.original);
        }
        case 'moveLabel': {
          const current = labels.find((l) => l.id === drag.labelId);
          return !!current && !pointsEqual({ x: current.x, y: current.y }, drag.original);
        }
        case 'movePolygon': {
          const current = polygons.find((p) => p.id === drag.polygonId);
          return !!current && !pointArraysEqual(current.points, drag.original.points);
        }
        case 'rotatePolygon': {
          const current = polygons.find((p) => p.id === drag.polygonId);
          return !!current && !pointArraysEqual(current.points, drag.original);
        }
        case 'polygonVertexDrag': {
          const current = polygons.find((p) => p.id === drag.polygonId);
          return !!current && !pointsEqual(current.points[drag.vertexIndex], drag.original);
        }
        case 'moveDimension': {
          const current = dimensions.find((d) => d.id === drag.dimensionId);
          return !!current && (!pointsEqual(current.start, drag.original.start) || !pointsEqual(current.end, drag.original.end));
        }
        case 'dimensionEndpointDrag': {
          const current = dimensions.find((d) => d.id === drag.dimensionId);
          return !!current && !pointsEqual(current[drag.key], drag.original);
        }
        case 'moveSelection':
        case 'rotateSelection': {
          for (const member of drag.members) {
            if (member.kind === 'furniture') {
              const current = furniture.find((f) => f.id === member.id);
              if (current && (!pointsEqual({ x: current.x, y: current.y }, member) || current.rotationDeg !== member.rotationDeg)) {
                return true;
              }
            } else if (member.kind === 'outlet') {
              const current = outlets.find((o) => o.id === member.id);
              if (current && !pointsEqual({ x: current.x, y: current.y }, member)) return true;
            } else if (member.kind === 'label') {
              const current = labels.find((l) => l.id === member.id);
              if (current && !pointsEqual({ x: current.x, y: current.y }, member)) return true;
            } else if (member.kind === 'path') {
              const current = paths.find((p) => p.id === member.id);
              if (current && (!pointsEqual(current.start, member.start) || !pointsEqual(current.end, member.end))) return true;
            } else if (member.kind === 'polygon') {
              const current = polygons.find((p) => p.id === member.id);
              if (current && !pointArraysEqual(current.points, member.points)) return true;
            } else if (member.kind === 'dimension') {
              const current = dimensions.find((d) => d.id === member.id);
              if (current && (!pointsEqual(current.start, member.start) || !pointsEqual(current.end, member.end))) return true;
            }
          }
          return false;
        }
      }
    },
    [dimensions, doors, furniture, labels, outlets, paths, polygons, walls, windows],
  );

  const finishBoxSelect = useCallback(
    (drag: Extract<DragState, { type: 'boxSelect' }>, endWorld: Point) => {
      const dragDistanceMm = distance(drag.startWorld, endWorld);
      const isRealDrag = dragDistanceMm * viewport.scale >= BOX_SELECT_MIN_DRAG_PX;

      if (!isRealDrag) {
        // 클릭에 가까운 아주 작은 드래그는 "빈 곳 클릭"으로 취급한다. Shift가 눌려있으면
        // 기존 다중 선택을 실수로 날리지 않도록 아무 것도 하지 않는다.
        if (!drag.additive) deselect();
        return;
      }

      const hits = hitTestBoxSelection(drag.startWorld, endWorld, { furniture, outlets, paths, labels, polygons, dimensions });
      setSelection(drag.additive ? mergeSelections(selection, hits) : hits);
    },
    [deselect, dimensions, furniture, labels, outlets, paths, polygons, selection, setSelection, viewport.scale],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragState.current;
      if (drag) {
        if (drag.type === 'boxSelect') {
          const screen = getScreenPoint(e);
          finishBoxSelect(drag, screenToWorld(viewport, screen));
          setSelectionBox(null);
        } else if (drag.type !== 'pan') {
          if (dragActuallyChanged(drag)) {
            commitTransientEdit();
          } else {
            discardTransientEdit();
            // moveSelection이 실제로는 움직이지 않은(=드래그가 아니라 그냥 클릭이었던) 경우,
            // 흔한 관례대로 클릭한 객체 하나만 선택되도록 되돌린다(그룹 선택 유지 안 함).
            if (drag.type === 'moveSelection') selectSingleItem(drag.clickedItem);
          }
        }
        dragState.current = null;
        setPreviewSnapKind(null);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }
    },
    [commitTransientEdit, dragActuallyChanged, discardTransientEdit, finishBoxSelect, getScreenPoint, selectSingleItem, viewport],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => endDrag(e), [endDrag]);

  const onPointerLeave = useCallback(() => {
    setCursorWorld(null);
    if (!dragState.current) setPreviewPoint(null);
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (activeTool === 'wall' || activeTool === 'polygon') endChain();
    },
    [activeTool, endChain],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.key === 'Escape') {
        endChain();
        return;
      }
      if (e.key === 'Enter' && activeTool === 'polygon' && polygonDraft.length >= MIN_POLYGON_VERTICES) {
        e.preventDefault();
        addPolygon(polygonDraft);
        setPolygonDraft([]);
        setActiveTool('select');
        return;
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        deleteSelected();
        return;
      }

      const ctrl = e.ctrlKey || e.metaKey;
      if (!ctrl) return;

      switch (e.key.toLowerCase()) {
        case 'c':
          e.preventDefault();
          copySelected();
          break;
        case 'v':
          e.preventDefault();
          pasteClipboard();
          break;
        case 'z':
          e.preventDefault();
          undo();
          break;
        case 'y':
          e.preventDefault();
          redo();
          break;
      }
    },
    [activeTool, addPolygon, copySelected, deleteSelected, endChain, pasteClipboard, polygonDraft, redo, setActiveTool, undo],
  );

  return {
    activeTool,
    setActiveTool,
    defaultWallThicknessMm,
    setDefaultWallThicknessMm,
    wallLengthSnapMm,
    setWallLengthSnapMm,
    pathShape,
    setPathShape,
    dimensionMode,
    setDimensionMode,
    snapEnabled,
    setSnapEnabled,
    snapCategories,
    toggleSnapCategory,
    displayUnit,
    setDisplayUnit,
    cycleDisplayUnit,
    cursorWorld,
    chainStart,
    previewPoint,
    previewSnapKind,
    selectionBox,
    polygonDraft,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onContextMenu,
    onKeyDown,
  };
}

export type UsePlanInteractionResult = ReturnType<typeof usePlanInteraction>;
