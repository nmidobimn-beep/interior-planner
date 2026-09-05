import { useCallback, useRef, useState } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { FurnitureShape } from '../types/furniture';
import {
  DEFAULT_ARM_THICKNESS_MM,
  DEFAULT_FURNITURE_SIZE,
  DEFAULT_WALL_THICKNESS_MM,
  FURNITURE_HANDLE_RADIUS_PX,
  MIN_WALL_LENGTH_MM,
  WALL_ENDPOINT_HANDLE_RADIUS_PX,
  WALL_HIT_TOLERANCE_PX,
} from '../config/constants';
import { screenToWorld, worldToScreen, type Viewport } from '../core/viewport';
import { snapAngleDeg, snapPoint, type SnapKind } from '../core/snap';
import { collectEndpoints, distance, hitTestWalls, type WallEndpointKey } from '../core/wallGeometry';
import { hitTestFurnitureList, rotationHandleWorldPoint } from '../core/furnitureGeometry';
import type { UseFloorPlanResult } from './useFloorPlan';

export type ToolId = 'select' | 'wall' | FurnitureShape;

type DragState =
  | { type: 'pan'; lastClient: Point }
  | { type: 'moveWall'; wallId: string; original: Wall; grabWorld: Point }
  | { type: 'endpointDrag'; wallId: string; key: WallEndpointKey }
  | { type: 'moveFurniture'; furnitureId: string; original: Point; grabWorld: Point }
  | { type: 'rotateFurniture'; furnitureId: string };

interface UsePlanInteractionArgs {
  viewport: Viewport;
  panBy: (dx: number, dy: number) => void;
  floorPlan: UseFloorPlanResult;
}

const isFurnitureTool = (tool: ToolId): tool is FurnitureShape =>
  tool === 'rectangle' || tool === 'circle' || tool === 'lshape';

/**
 * 캔버스 위 마우스/키보드 조작을 총괄하는 훅.
 * "빈 캔버스 드래그 = 화면 이동, 객체 클릭 = 선택/이동" 처럼 도구(activeTool)에 따라
 * 같은 왼쪽 버튼 드래그를 다르게 해석하는 판단을 여기서 전담하고, 실제 카메라 이동은
 * useViewport에, 실제 데이터 변경은 useFloorPlan에 위임한다.
 */
export function usePlanInteraction({ viewport, panBy, floorPlan }: UsePlanInteractionArgs) {
  const { walls, furniture, selectedWall, selectedFurniture, addWall, updateWall, addFurniture, updateFurniture, selectWall, selectFurniture, deselect, deleteSelected } = floorPlan;

  const [activeTool, setActiveToolState] = useState<ToolId>('select');
  const [defaultWallThicknessMm, setDefaultWallThicknessMm] = useState(DEFAULT_WALL_THICKNESS_MM);
  const [snapEnabled, setSnapEnabled] = useState(true);

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
        const candidatePoints = collectEndpoints(walls);
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
          if (distance(chainStart, snapped.point) >= MIN_WALL_LENGTH_MM) {
            addWall(chainStart, snapped.point, defaultWallThicknessMm);
            setChainStart(snapped.point);
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

      // --- 선택 도구 ---
      if (selectedFurniture) {
        const handleScreen = worldToScreen(viewport, rotationHandleWorldPoint(selectedFurniture));
        if (distance(screen, handleScreen) <= FURNITURE_HANDLE_RADIUS_PX * 1.5) {
          dragState.current = { type: 'rotateFurniture', furnitureId: selectedFurniture.id };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      if (selectedWall) {
        const startScreen = worldToScreen(viewport, selectedWall.start);
        const endScreen = worldToScreen(viewport, selectedWall.end);
        const handleTolerance = WALL_ENDPOINT_HANDLE_RADIUS_PX * 1.5;
        if (distance(screen, startScreen) <= handleTolerance) {
          dragState.current = { type: 'endpointDrag', wallId: selectedWall.id, key: 'start' };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
        if (distance(screen, endScreen) <= handleTolerance) {
          dragState.current = { type: 'endpointDrag', wallId: selectedWall.id, key: 'end' };
          e.currentTarget.setPointerCapture(e.pointerId);
          return;
        }
      }

      const hitFurniture = hitTestFurnitureList(worldRaw, furniture);
      if (hitFurniture) {
        selectFurniture(hitFurniture.id);
        dragState.current = {
          type: 'moveFurniture',
          furnitureId: hitFurniture.id,
          original: { x: hitFurniture.x, y: hitFurniture.y },
          grabWorld: worldRaw,
        };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      const hitWall = hitTestWalls(worldRaw, walls, WALL_HIT_TOLERANCE_PX / viewport.scale);
      if (hitWall) {
        selectWall(hitWall.id);
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
      addFurniture,
      addWall,
      chainStart,
      defaultWallThicknessMm,
      deselect,
      furniture,
      getScreenPoint,
      selectFurniture,
      selectWall,
      selectedFurniture,
      selectedWall,
      setActiveTool,
      snapEnabled,
      viewport,
      walls,
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
        const candidatePoints = collectEndpoints(walls, drag.wallId);
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const rawNewStart = { x: drag.original.start.x + rawDelta.x, y: drag.original.start.y + rawDelta.y };
        const snapped = snapPoint(rawNewStart, { candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        const actualDelta = { x: snapped.point.x - drag.original.start.x, y: snapped.point.y - drag.original.start.y };
        updateWall(drag.wallId, {
          start: snapped.point,
          end: { x: drag.original.end.x + actualDelta.x, y: drag.original.end.y + actualDelta.y },
        });
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'endpointDrag') {
        const wall = walls.find((w) => w.id === drag.wallId);
        if (!wall) return;
        const other = drag.key === 'start' ? wall.end : wall.start;
        const candidatePoints = collectEndpoints(walls, drag.wallId);
        const snapped = snapPoint(worldRaw, { origin: other, candidatePoints, scale: viewport.scale, enabled: snapEnabled });
        updateWall(drag.wallId, { [drag.key]: snapped.point } as Partial<Wall>);
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
        return;
      }

      if (drag?.type === 'moveFurniture') {
        const rawDelta = { x: worldRaw.x - drag.grabWorld.x, y: worldRaw.y - drag.grabWorld.y };
        const rawCenter = { x: drag.original.x + rawDelta.x, y: drag.original.y + rawDelta.y };
        const snapped = snapPoint(rawCenter, { scale: viewport.scale, enabled: snapEnabled });
        updateFurniture(drag.furnitureId, { x: snapped.point.x, y: snapped.point.y });
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
        updateFurniture(drag.furnitureId, { rotationDeg: finalDeg });
        setPreviewSnapKind(snappedDeg !== null ? 'angle' : null);
        return;
      }

      if (activeTool === 'wall' && chainStart) {
        const candidatePoints = collectEndpoints(walls);
        const snapped = snapPoint(worldRaw, {
          origin: chainStart,
          candidatePoints,
          scale: viewport.scale,
          enabled: snapEnabled,
        });
        setPreviewPoint(snapped.point);
        setPreviewSnapKind(snapped.kind);
      }
    },
    [activeTool, chainStart, furniture, getScreenPoint, panBy, snapEnabled, updateFurniture, updateWall, viewport, walls],
  );

  const endDrag = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragState.current) {
      dragState.current = null;
      setPreviewSnapKind(null);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    }
  }, []);

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
      }
    },
    [deleteSelected, endChain],
  );

  return {
    activeTool,
    setActiveTool,
    defaultWallThicknessMm,
    setDefaultWallThicknessMm,
    snapEnabled,
    setSnapEnabled,
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
