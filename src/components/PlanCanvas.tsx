import { useEffect, useRef } from 'react';
import { COLORS } from '../config/constants';
import { drawGrid } from '../core/grid';
import { drawRulers } from '../core/ruler';
import { drawDemoScene } from '../core/demoScene';
import { drawSnapIndicator, drawWallPreview, drawWalls } from '../core/renderWalls';
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
  const { walls, selectedWallId } = floorPlan;
  const {
    activeTool,
    defaultWallThicknessMm,
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

    drawWalls(ctx, viewport, walls, selectedWallId);
    if (chainStart && previewPoint) {
      drawWallPreview(ctx, viewport, chainStart, previewPoint, defaultWallThicknessMm);
    }
    if (previewPoint) {
      drawSnapIndicator(ctx, viewport, previewPoint, previewSnapKind);
    }

    drawRulers(ctx, viewport, size);
  }, [viewport, size, showDemo, walls, selectedWallId, chainStart, previewPoint, previewSnapKind, defaultWallThicknessMm]);

  return (
    <div ref={containerRef} className="plan-canvas-container">
      <canvas
        ref={canvasRef}
        className={`plan-canvas plan-canvas--${activeTool}`}
        tabIndex={0}
        onWheel={onWheel}
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
