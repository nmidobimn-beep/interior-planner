import { useCallback, useRef, useState } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Path } from '../types/path';
import type { FurnitureShape } from '../types/furniture';
import {
  DEFAULT_ARM_THICKNESS_MM,
  DEFAULT_DOOR_WIDTH_MM,
  DEFAULT_FURNITURE_SIZE,
  DEFAULT_LABEL_TEXT,
  DEFAULT_OUTLET_COUNT,
  DEFAULT_SNAP_CATEGORIES,
  DEFAULT_WALL_LENGTH_SNAP_MM,
  DEFAULT_WALL_THICKNESS_MM,
  DEFAULT_WINDOW_WIDTH_MM,
  CURVE_CONTROL_HANDLE_RADIUS_PX,
  FURNITURE_HANDLE_RADIUS_PX,
  LABEL_HIT_RADIUS_PX,
  MIN_PATH_LENGTH_MM,
  MIN_WALL_LENGTH_MM,
  OPENING_WALL_HIT_TOLERANCE_PX,
  PATH_ENDPOINT_HANDLE_RADIUS_PX,
  PATH_HIT_TOLERANCE_PX,
  WALL_ENDPOINT_HANDLE_RADIUS_PX,
  WALL_HIT_TOLERANCE_PX,
  type SnapCategoryFlags,
} from '../config/constants';
import { screenToWorld, worldToScreen, type Viewport } from '../core/viewport';
import { snapAngleDeg, snapPoint, type SnapKind } from '../core/snap';
import { nextDisplayUnit, type DisplayUnit } from '../core/units';
import {
  distance,
  findWallAtPoint,
  hitTestWalls,
  projectPointOntoWall,
  wallLengthMm,
  type WallEndpointKey,
} from '../core/wallGeometry';
import { hitTestFurnitureList, rotationHandleWorldPoint } from '../core/furnitureGeometry';
import { clampOpeningOffset, hitTestDoors, hitTestOutlets, hitTestWindows } from '../core/openingGeometry';
import { defaultControlPoint, hitTestPaths } from '../core/pathGeometry';
import { hitTestLabels } from '../core/labelGeometry';
import { collectSnapCandidates } from '../core/snapPoints';
import type { UseFloorPlanResult } from './useFloorPlan';

export type ToolId = 'select' | 'wall' | FurnitureShape | 'door' | 'window' | 'outlet' | 'path' | 'label';
export type PathShape = 'straight' | 'curve';

type PathEndpointKey = 'start' | 'end';

type DragState =
  | { type: 'pan'; lastClient: Point }
  | { type: 'moveWall'; wallId: string; original: Wall; grabWorld: Point }
  | { type: 'endpointDrag'; wallId: string; key: WallEndpointKey; original: Wall }
  | { type: 'moveFurniture'; furnitureId: string; original: Point; grabWorld: Point }
  | { type: 'rotateFurniture'; furnitureId: string; originalRotationDeg: number }
  | { type: 'moveDoor'; doorId: string; originalOffsetMm: number }
  | { type: 'moveWindow'; windowId: string; originalOffsetMm: number }
  | { type: 'moveOutlet'; outletId: string; original: Point; grabWorld: Point }
  | { type: 'movePath'; pathId: string; original: { start: Point; end: Point }; grabWorld: Point }
  | { type: 'pathEndpointDrag'; pathId: string; key: PathEndpointKey; original: Point }
  | { type: 'curveControlDrag'; pathId: string; original: Point }
  | { type: 'moveLabel'; labelId: string; original: Point; grabWorld: Point };

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

/**
 * 캔버스 위 마우스/키보드 조작을 총괄하는 훅.
 * "빈 캔버스 드래그 = 화면 이동, 객체 클릭 = 선택/이동" 처럼 도구(activeTool)에 따라
 * 같은 왼쪽 버튼 드래그를 다르게 해석하는 판단을 여기서 전담하고, 실제 카메라 이동은
 * useViewport에, 실제 데이터 변경은 useFloorPlan에 위임한다.
 *
 * Undo 기록 방식: 드래그(이동/회전/리사이즈) 도중에는 update*(..., transient=true)로
 * 화면만 갱신하고 History에는 쌓지 않는다. 드래그가 끝나는 순간(endDrag) 실제로 값이
 * 바뀌었는지 확인해, 바뀌었으면 commitTransientEdit()으로 "시작→끝"을 History 한 건으로
 * 기록하고, 바뀐 게 없으면(클릭만 하고 끝난 경우 등) 아무 기록도 남기지 않는다.
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
    selectedWall,
    selectedFurniture,
    selectedPath,
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
    selectWall,
    selectFurniture,
    selectDoor,
    selectWindow,
    selectOutlet,
    selectPath,
    selectLabel,
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

  const dragState = useRef<DragState | null>(null);

  const setActiveTool = useCallback((tool: ToolId) => {
    setActiveToolState(tool);
    setChainStart(null);
    setPreviewPoint(null);
  }, []);

  const endChain = useCallback(() => {
    setChainStart(null);
    setPreviewPoint(null);
  }, []);

  const getScreenPoint = useCallback((e: { clientX: number; clientY: number; currentTarget: HTMLElement }) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const snapCandidates = useCallback(
    (exclude?: { wallId?: string; furnitureId?: string; pathId?: string }) =>
      collectSnapCandidates({ walls, furniture, doors, windows, outlets, paths }, snapCategories, exclude),
    [doors, furniture, outlets, paths, snapCategories, walls, windows],
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

      // --- 선택 도구 ---
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

      const hitLabel = hitTestLabels(worldRaw, labels, LABEL_HIT_RADIUS_PX / viewport.scale);
      if (hitLabel) {
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
        selectFurniture(hitFurniture.id);
        beginTransientEdit();
        dragState.current = {
          type: 'moveFurniture',
          furnitureId: hitFurniture.id,
          original: { x: hitFurniture.x, y: hitFurniture.y },
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
        selectPath(hitPath.id);
        beginTransientEdit();
        dragState.current = {
          type: 'movePath',
          pathId: hitPath.id,
          original: { start: hitPath.start, end: hitPath.end },
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

      deselect();
      dragState.current = { type: 'pan', lastClient: { x: e.clientX, y: e.clientY } };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [
      activeTool,
      addDoor,
      addFurniture,
      addLabel,
      addOutlet,
      addPath,
      addWall,
      addWindow,
      beginTransientEdit,
      chainStart,
      defaultWallThicknessMm,
      deselect,
      doors,
      furniture,
      getScreenPoint,
      labels,
      outlets,
      pathShape,
      paths,
      selectDoor,
      selectFurniture,
      selectLabel,
      selectOutlet,
      selectPath,
      selectWall,
      selectWindow,
      selectedFurniture,
      selectedPath,
      selectedWall,
      setActiveTool,
      snapCandidates,
      snapEnabled,
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

      if (drag?.type === 'moveWall') {
        const candidatePoints = snapCandidates({ wallId: drag.wallId });
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const rawNewStart = { x: drag.original.start.x + rawDelta.x, y: drag.original.start.y + rawDelta.y };
        const snapped = snapPoint(rawNewStart, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        const actualDelta = { x: snapped.point.x - drag.original.start.x, y: snapped.point.y - drag.original.start.y };
        updateWall(
          drag.wallId,
          { start: snapped.point, end: { x: drag.original.end.x + actualDelta.x, y: drag.original.end.y + actualDelta.y } },
          true,
        );
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
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
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const rawCenter = { x: drag.original.x + rawDelta.x, y: drag.original.y + rawDelta.y };
        const candidatePoints = snapCandidates({ furnitureId: drag.furnitureId });
        const snapped = snapPoint(rawCenter, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        updateFurniture(drag.furnitureId, { x: snapped.point.x, y: snapped.point.y }, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
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
        const rawCenter = { x: drag.original.x + rawDelta.x, y: drag.original.y + rawDelta.y };
        const candidatePoints = snapCandidates();
        const snapped = snapPoint(rawCenter, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        updateOutlet(drag.outletId, { x: snapped.point.x, y: snapped.point.y }, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'movePath') {
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const rawStart = { x: drag.original.start.x + rawDelta.x, y: drag.original.start.y + rawDelta.y };
        const candidatePoints = snapCandidates({ pathId: drag.pathId });
        const snapped = snapPoint(rawStart, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        const actualDelta = { x: snapped.point.x - drag.original.start.x, y: snapped.point.y - drag.original.start.y };
        updatePath(
          drag.pathId,
          { start: snapped.point, end: { x: drag.original.end.x + actualDelta.x, y: drag.original.end.y + actualDelta.y } },
          true,
        );
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
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
        const rawPosition = { x: drag.original.x + rawDelta.x, y: drag.original.y + rawDelta.y };
        const candidatePoints = snapCandidates();
        const snapped = snapPoint(rawPosition, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        updateLabel(drag.labelId, { x: snapped.point.x, y: snapped.point.y }, true);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if ((activeTool === 'wall' || activeTool === 'path') && chainStart) {
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
      panBy,
      paths,
      snapCandidates,
      snapEnabled,
      updateDoor,
      updateFurniture,
      updateLabel,
      updateOutlet,
      updatePath,
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
      }
    },
    [doors, furniture, labels, outlets, paths, walls, windows],
  );

  const endDrag = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragState.current;
      if (drag) {
        if (drag.type !== 'pan') {
          if (dragActuallyChanged(drag)) commitTransientEdit();
          else discardTransientEdit();
        }
        dragState.current = null;
        setPreviewSnapKind(null);
        if (e.currentTarget.hasPointerCapture(e.pointerId)) {
          e.currentTarget.releasePointerCapture(e.pointerId);
        }
      }
    },
    [commitTransientEdit, dragActuallyChanged, discardTransientEdit],
  );

  const onPointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => endDrag(e), [endDrag]);

  const onPointerLeave = useCallback(() => {
    setCursorWorld(null);
    if (!dragState.current) setPreviewPoint(null);
  }, []);

  const onContextMenu = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      if (activeTool === 'wall') endChain();
    },
    [activeTool, endChain],
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLCanvasElement>) => {
      if (e.key === 'Escape') {
        endChain();
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
    [copySelected, deleteSelected, endChain, pasteClipboard, redo, undo],
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
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onContextMenu,
    onKeyDown,
  };
}

export type UsePlanInteractionResult = ReturnType<typeof usePlanInteraction>;
