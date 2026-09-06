import { useEffect, useRef } from 'react';
import { COLORS } from '../config/constants';
import { drawGrid } from '../core/grid';
import { drawRulers } from '../core/ruler';
import { drawDemoScene } from '../core/demoScene';
import { drawSnapIndicator, drawWallPreview, drawWalls } from '../core/renderWalls';
import { drawFurniture } from '../core/renderFurniture';
import { drawDoors, drawOutlets, drawWindows } from '../core/renderOpenings';
import { drawPathPreview, drawPaths } from '../core/renderPath';
import { drawLabels } from '../core/renderLabel';
import { drawPolygonPreview, drawPolygons } from '../core/renderPolygon';
import { drawDimensionPreview, drawDimensions } from '../core/renderDimension';
import { polygonBounds } from '../core/polygonGeometry';
import { computeSelectionBounds } from '../core/multiSelectGeometry';
import { drawSelectionBounds, drawSelectionMarquee } from '../core/renderSelection';
import { screenToWorld, worldToScreen } from '../core/viewport';
import type { UseViewportResult } from '../hooks/useViewport';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';
import type { UsePlanInteractionResult } from '../hooks/usePlanInteraction';
import type { UseCommandSystemResult } from '../hooks/useCommandSystem';
import { useElementSize } from '../hooks/useElementSize';

interface PlanCanvasProps {
  viewportApi: UseViewportResult;
  floorPlan: UseFloorPlanResult;
  interaction: UsePlanInteractionResult;
  commandSystem: UseCommandSystemResult;
  showDemo: boolean;
  onSizeChange: (size: { width: number; height: number }) => void;
}

/** 평면도 편집 캔버스. 렌더링만 담당하고, 좌표 계산/상태는 core·hooks 쪽에 위임한다. */
export function PlanCanvas({ viewportApi, floorPlan, interaction, commandSystem, showDemo, onSizeChange }: PlanCanvasProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, onWheel } = viewportApi;
  const { mergeWallCandidates, tryHandlePointerDown } = commandSystem;
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
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
    selectedLabel,
    selectedPolygon,
    selection,
    selectionCount,
    selectedFurnitureIds,
    selectedOutletIds,
    selectedPathIds,
    selectedLabelIds,
    selectedPolygonIds,
    selectedDimensionIds,
  } = floorPlan;
  const {
    activeTool,
    defaultWallThicknessMm,
    displayUnit,
    dimensionMode,
    chainStart,
    previewPoint,
    previewSnapKind,
    selectionBox,
    polygonDraft,
    cursorWorld,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerLeave,
    onContextMenu,
    onKeyDown,
  } = interaction;

  useEffect(() => {
    onSizeChange(size);
  }, [size, onSizeChange]);

  // 휠 확대/축소는 네이티브 리스너로 직접 붙인다 — React의 onWheel prop은 최신 브라우저/React에서
  // passive로 등록되어 그 안의 preventDefault()가 무시되므로(콘솔 경고 발생), passive:false로
  // 명시해야 스크롤 대신 확대/축소가 확실히 우선한다.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      onWheel(e.clientX, e.clientY, e.deltaY, canvas.getBoundingClientRect());
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [onWheel]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || size.width === 0 || size.height === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size.width * dpr;
    canvas.height = size.height * dpr;
    canvas.style.width = `${size.width}px`;
    canvas.style.height = `${size.height}px`;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, size.width, size.height);

    drawGrid(ctx, viewport, size);
    if (showDemo) drawDemoScene(ctx, viewport);

    drawWalls(ctx, viewport, walls, selectedWall?.id ?? null);
    drawDoors(ctx, viewport, doors, walls, selectedDoor?.id ?? null);
    drawWindows(ctx, viewport, windows, walls, selectedWindow?.id ?? null);
    drawFurniture(ctx, viewport, furniture, selectedFurnitureIds);
    drawOutlets(ctx, viewport, outlets, selectedOutletIds);
    drawPaths(ctx, viewport, paths, selectedPathIds);
    drawLabels(ctx, viewport, labels, selectedLabelIds);
    drawPolygons(ctx, viewport, polygons, selectedPolygonIds);
    drawDimensions(ctx, viewport, dimensions, selectedDimensionIds, displayUnit);

    // 다중 선택(2개 이상)일 때는 개별 손잡이 대신 전체를 감싸는 바운딩 박스 + 그룹 회전 손잡이를 보여준다.
    if (selectionCount > 1) {
      const bounds = computeSelectionBounds(selection, { furniture, outlets, paths, labels, polygons, dimensions });
      if (bounds) drawSelectionBounds(ctx, viewport, bounds);
    } else if (selectedPolygon) {
      // 다각형 하나만 선택된 경우도 같은 방식(바운딩 박스 + 회전 손잡이)으로 회전할 수 있게 해준다.
      drawSelectionBounds(ctx, viewport, polygonBounds(selectedPolygon));
    }

    if (chainStart && previewPoint) {
      if (activeTool === 'path') drawPathPreview(ctx, viewport, chainStart, previewPoint);
      else if (activeTool === 'dimension') drawDimensionPreview(ctx, viewport, chainStart, previewPoint, dimensionMode, displayUnit);
      else drawWallPreview(ctx, viewport, chainStart, previewPoint, defaultWallThicknessMm, displayUnit);
    }
    if (previewPoint) {
      drawSnapIndicator(ctx, viewport, previewPoint, previewSnapKind);
    }

    if (activeTool === 'polygon' && polygonDraft.length > 0) {
      drawPolygonPreview(ctx, viewport, polygonDraft, cursorWorld);
    }

    if (selectionBox) {
      drawSelectionMarquee(ctx, viewport, selectionBox.start, selectionBox.end);
    }

    // BL(벽 합치기) 명령 진행 중 — 지금까지 고른 벽들을 굵은 강조선으로 표시한다.
    if (mergeWallCandidates.size > 0) {
      ctx.strokeStyle = COLORS.multiSelectBounds;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      for (const wall of walls) {
        if (!mergeWallCandidates.has(wall.id)) continue;
        const start = worldToScreen(viewport, wall.start);
        const end = worldToScreen(viewport, wall.end);
        ctx.beginPath();
        ctx.moveTo(start.x, start.y);
        ctx.lineTo(end.x, end.y);
        ctx.stroke();
      }
      ctx.lineCap = 'butt';
    }

    drawRulers(ctx, viewport, size, displayUnit);
  }, [
    viewport,
    size,
    showDemo,
    walls,
    furniture,
    doors,
    windows,
    outlets,
    paths,
    labels,
    polygons,
    dimensions,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
    selectedLabel,
    selectedPolygon,
    selection,
    selectionCount,
    selectedFurnitureIds,
    selectedOutletIds,
    selectedPathIds,
    selectedLabelIds,
    selectedPolygonIds,
    selectedDimensionIds,
    activeTool,
    chainStart,
    previewPoint,
    previewSnapKind,
    selectionBox,
    polygonDraft,
    cursorWorld,
    defaultWallThicknessMm,
    dimensionMode,
    displayUnit,
    mergeWallCandidates,
  ]);

  // CAD 커맨드 시스템(M/R/CO/BL)이 클릭 두 번짜리 진행 중일 때는 그 명령이 먼저 클릭을
  // 처리하고, 그렇지 않으면(그리기 명령 등은 이미 기존 도구 상태로 동작 중이므로) 기존
  // onPointerDown이 그대로 처리한다 — 같은 기능을 중복 구현하지 않기 위한 얇은 위임 층.
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 0) {
      const rect = e.currentTarget.getBoundingClientRect();
      const worldPoint = screenToWorld(viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (tryHandlePointerDown(worldPoint)) return;
    }
    onPointerDown(e);
  };

  return (
    <div ref={containerRef} className="plan-canvas-container">
      <canvas
        ref={canvasRef}
        className={`plan-canvas plan-canvas--${activeTool}`}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
