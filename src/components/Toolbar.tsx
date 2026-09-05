import type { Bounds, Size } from '../types/geometry';
import type { UseViewportResult } from '../hooks/useViewport';
import type { UsePlanInteractionResult } from '../hooks/usePlanInteraction';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';

interface ToolbarProps {
  viewportApi: UseViewportResult;
  interaction: UsePlanInteractionResult;
  floorPlan: UseFloorPlanResult;
  canvasSize: Size;
  fitBounds: Bounds;
  showDemo: boolean;
  onToggleDemo: (value: boolean) => void;
}

/** 상단 툴바. 확대/축소/전체보기, 실행취소/다시실행/복사/붙여넣기, 스냅 on/off를 담당한다. */
export function Toolbar({ viewportApi, interaction, floorPlan, canvasSize, fitBounds, showDemo, onToggleDemo }: ToolbarProps) {
  const { viewport, zoomIn, zoomOut, fitToView } = viewportApi;
  const { snapEnabled, setSnapEnabled } = interaction;
  const { canUndo, canRedo, undo, redo, canCopy, canPaste, copySelected, pasteClipboard } = floorPlan;
  const zoomPercent = Math.round(viewport.scale * 100);

  return (
    <header className="toolbar">
      <div className="toolbar-brand">Interior Planner</div>

      <div className="toolbar-group">
        <button type="button" onClick={undo} disabled={!canUndo} title="실행 취소 (Ctrl+Z)">
          ↺
        </button>
        <button type="button" onClick={redo} disabled={!canRedo} title="다시 실행 (Ctrl+Y)">
          ↻
        </button>
        <button type="button" onClick={copySelected} disabled={!canCopy} title="복사 (Ctrl+C)">
          복사
        </button>
        <button type="button" onClick={pasteClipboard} disabled={!canPaste} title="붙여넣기 (Ctrl+V)">
          붙여넣기
        </button>
      </div>

      <div className="toolbar-group">
        <button type="button" onClick={() => zoomOut(canvasSize)} title="축소">
          −
        </button>
        <span className="toolbar-zoom-readout">{zoomPercent}%</span>
        <button type="button" onClick={() => zoomIn(canvasSize)} title="확대">
          +
        </button>
        <button type="button" onClick={() => fitToView(fitBounds, canvasSize)} title="전체보기">
          전체보기
        </button>
      </div>

      <div className="toolbar-toggles">
        <label className="toolbar-toggle">
          <input type="checkbox" checked={snapEnabled} onChange={(e) => setSnapEnabled(e.target.checked)} />
          스냅
        </label>

        <label className="toolbar-toggle">
          <input type="checkbox" checked={showDemo} onChange={(e) => onToggleDemo(e.target.checked)} />
          예시 표시
        </label>
      </div>
    </header>
  );
}
