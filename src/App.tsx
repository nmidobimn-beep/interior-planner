import { useCallback, useState } from 'react';
import './App.css';
import { Toolbar } from './components/Toolbar';
import { PlanCanvas } from './components/PlanCanvas';
import { StatusBar } from './components/StatusBar';
import { DEMO_BOUNDS } from './core/demoScene';
import { useViewport } from './hooks/useViewport';
import type { Size } from './types/geometry';

function App() {
  const viewportApi = useViewport();
  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 });
  const [showDemo, setShowDemo] = useState(true);

  const handleSizeChange = useCallback((size: Size) => setCanvasSize(size), []);

  return (
    <div className="app-shell">
      <Toolbar
        viewportApi={viewportApi}
        canvasSize={canvasSize}
        fitBounds={DEMO_BOUNDS}
        showDemo={showDemo}
        onToggleDemo={setShowDemo}
      />

      <div className="app-body">
        <aside className="side-panel side-panel-left">
          <div className="side-panel-title">도구</div>
          <div className="side-panel-placeholder">벽 · 문 · 창문 · 콘센트 · 가구 (2~4단계에서 추가 예정)</div>
        </aside>

        <main className="canvas-area">
          <PlanCanvas viewportApi={viewportApi} showDemo={showDemo} onSizeChange={handleSizeChange} />
        </main>

        <aside className="side-panel side-panel-right">
          <div className="side-panel-title">속성</div>
          <div className="side-panel-placeholder">객체를 선택하면 이름 · 크기 · 위치 · 회전을 편집합니다 (3단계~)</div>

          <div className="side-panel-title">레이어</div>
          <div className="side-panel-placeholder">레이어 목록 (6단계에서 추가 예정)</div>
        </aside>
      </div>

      <StatusBar viewportApi={viewportApi} />
    </div>
  );
}

export default App;
