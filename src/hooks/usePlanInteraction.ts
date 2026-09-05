import { useCallback, useRef, useState } from 'react';
import type { Point } from '../types/geometry';
import type { Wall } from '../types/wall';
import {
  DEFAULT_WALL_THICKNESS_MM,
  MIN_WALL_LENGTH_MM,
  WALL_ENDPOINT_HANDLE_RADIUS_PX,
  WALL_HIT_TOLERANCE_PX,
} from '../config/constants';
import { screenToWorld, worldToScreen, type Viewport } from '../core/viewport';
import { snapPoint, type SnapKind } from '../core/snap';
import { collectEndpoints, distance, hitTestWalls, type WallEndpointKey } from '../core/wallGeometry';
import type { UseFloorPlanResult } from './useFloorPlan';

export type ToolId = 'select' | 'wall';

type DragState =
  | { type: 'pan'; lastClient: Point }
  | { type: 'moveWall'; wallId: string; original: Wall; grabWorld: Point }
  | { type: 'endpointDrag'; wallId: string; key: WallEndpointKey };

interface UsePlanInteractionArgs {
  viewport: Viewport;
  panBy: (dx: number, dy: number) => void;
  floorPlan: UseFloorPlanResult;
}

/**
 * 캔버스 위 마우스/키보드 조작을 총괄하는 훅.
 * "빈 캔버스 드래그 = 화면 이동, 벽 클릭 = 선택/이동" 처럼 도구(activeTool)에 따라
 * 같은 왼쪽 버튼 드래그를 다르게 해석하는 판단을 여기서 전담하고, 실제 카메라 이동은
 * useViewport에, 실제 데이터 변경은 useFloorPlan에 위임한다.
 */
export function usePlanInteraction({ viewport, panBy, floorPlan }: UsePlanInteractionArgs) {
  const { walls, selectedWall, addWall, updateWall, deleteWall, selectWall } = floorPlan;

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

      // --- 선택 도구 ---
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

      const hitWall = hitTestWalls(worldRaw, walls, WALL_HIT_TOLERANCE_PX / viewport.scale);
      if (hitWall) {
        selectWall(hitWall.id);
        dragState.current = { type: 'moveWall', wallId: hitWall.id, original: hitWall, grabWorld: worldRaw };
        e.currentTarget.setPointerCapture(e.pointerId);
        return;
      }

      selectWall(null);
      dragState.current = { type: 'pan', lastClient: { x: e.clientX, y: e.clientY } };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [activeTool, addWall, chainStart, defaultWallThicknessMm, getScreenPoint, selectWall, selectedWall, snapEnabled, viewport, walls],
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
    [activeTool, chainStart, getScreenPoint, panBy, snapEnabled, updateWall, viewport, walls],
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
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedWall) {
        e.preventDefault();
        deleteWall(selectedWall.id);
      }
    },
    [deleteWall, endChain, selectedWall],
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
