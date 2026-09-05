import type { Bounds, Size } from '../types/geometry';
import type { UseViewportResult } from '../hooks/useViewport';

interface ToolbarProps {
  viewportApi: UseViewportResult;
  canvasSize: Size;
  fitBounds: Bounds;
  showDemo: boolean;
  onToggleDemo: (value: boolean) => void;
}

/** 상단 툴바. 1단계에서는 확대/축소/전체보기만 제공하고, 이후 단계에서 저장/실행취소 등을 추가한다. */
export function Toolbar({ viewportApi, canvasSize, fitBounds, showDemo, onToggleDemo }: ToolbarProps) {
  const { viewport, zoomIn, zoomOut, fitToView } = viewportApi;
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

      <label className="toolbar-demo-toggle">
        <input type="checkbox" checked={showDemo} onChange={(e) => onToggleDemo(e.target.checked)} />
        예시 표시 (4000×3000mm 방 + 2000×1000mm 침대)
      </label>
    </header>
  );
}
