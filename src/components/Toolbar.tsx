import type { Bounds, Size } from '../types/geometry';
import type { UseViewportResult } from '../hooks/useViewport';
import type { UsePlanInteractionResult } from '../hooks/usePlanInteraction';

interface ToolbarProps {
  viewportApi: UseViewportResult;
  interaction: UsePlanInteractionResult;
  canvasSize: Size;
  fitBounds: Bounds;
  showDemo: boolean;
  onToggleDemo: (value: boolean) => void;
}

/** 상단 툴바. 확대/축소/전체보기와, 도구 전체에 영향을 주는 스냅 on/off를 담당한다. */
export function Toolbar({ viewportApi, interaction, canvasSize, fitBounds, showDemo, onToggleDemo }: ToolbarProps) {
  const { viewport, zoomIn, zoomOut, fitToView } = viewportApi;
  const { snapEnabled, setSnapEnabled } = interaction;
  const zoomPercent = Math.round(viewport.scale * 100);

  return (
    <header className="toolbar">
      <div className="toolbar-brand">Interior Planner</div>

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
