import { useEffect, useRef } from 'react';
import { COLORS } from '../config/constants';
import { drawGrid } from '../core/grid';
import { drawRulers } from '../core/ruler';
import { drawDemoScene } from '../core/demoScene';
import { drawSnapIndicator, drawWallPreview, drawWalls } from '../core/renderWalls';
import { drawFurniture } from '../core/renderFurniture';
import { drawDoors, drawOutlets, drawWindows } from '../core/renderOpenings';
import { drawPathPreview, drawPaths } from '../core/renderPath';
import type { UseViewportResult } from '../hooks/useViewport';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';
import type { UsePlanInteractionResult } from '../hooks/usePlanInteraction';
import { useElementSize } from '../hooks/useElementSize';

interface PlanCanvasProps {
  viewportApi: UseViewportResult;
  floorPlan: UseFloorPlanResult;
  interaction: UsePlanInteractionResult;
  showDemo: boolean;
  onSizeChange: (size: { width: number; height: number }) => void;
}

/** 평면도 편집 캔버스. 렌더링만 담당하고, 좌표 계산/상태는 core·hooks 쪽에 위임한다. */
export function PlanCanvas({ viewportApi, floorPlan, interaction, showDemo, onSizeChange }: PlanCanvasProps) {
  const { ref: containerRef, size } = useElementSize<HTMLDivElement>();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { viewport, onWheel } = viewportApi;
  const {
    visibleWalls: walls,
    visibleFurniture: furniture,
    visibleDoors: doors,
    visibleWindows: windows,
    visibleOutlets: outlets,
    visiblePaths: paths,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
  } = floorPlan;
  const {
    activeTool,
    defaultWallThicknessMm,
    displayUnit,
    chainStart,
    previewPoint,
    previewSnapKind,
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
    drawFurniture(ctx, viewport, furniture, selectedFurniture?.id ?? null);
    drawOutlets(ctx, viewport, outlets, selectedOutlet?.id ?? null);
    drawPaths(ctx, viewport, paths, selectedPath?.id ?? null);

    if (chainStart && previewPoint) {
      if (activeTool === 'path') drawPathPreview(ctx, viewport, chainStart, previewPoint);
      else drawWallPreview(ctx, viewport, chainStart, previewPoint, defaultWallThicknessMm, displayUnit);
    }
    if (previewPoint) {
      drawSnapIndicator(ctx, viewport, previewPoint, previewSnapKind);
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
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
    activeTool,
    chainStart,
    previewPoint,
    previewSnapKind,
    defaultWallThicknessMm,
    displayUnit,
  ]);

  return (
    <div ref={containerRef} className="plan-canvas-container">
      <canvas
        ref={canvasRef}
        className={`plan-canvas plan-canvas--${activeTool}`}
        tabIndex={0}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerLeave}
        onContextMenu={onContextMenu}
        onKeyDown={onKeyDown}
      />
    </div>
  );
}
