import { useCallback, useMemo, useState } from 'react';
import './App.css';
import { Toolbar } from './components/Toolbar';
import { PlanCanvas } from './components/PlanCanvas';
import { StatusBar } from './components/StatusBar';
import { ToolPanel } from './components/ToolPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayerPanel } from './components/LayerPanel';
import { computePlanBounds } from './core/bounds';
import { DEMO_BOUNDS } from './core/demoScene';
import { useFloorPlan } from './hooks/useFloorPlan';
import { usePlanInteraction } from './hooks/usePlanInteraction';
import { useViewport } from './hooks/useViewport';
import type { Size } from './types/geometry';

function App() {
  const viewportApi = useViewport();
  const floorPlan = useFloorPlan();
  const interaction = usePlanInteraction({ viewport: viewportApi.viewport, panBy: viewportApi.panBy, floorPlan });

  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 });
  const [showDemo, setShowDemo] = useState(true);

  const handleSizeChange = useCallback((size: Size) => setCanvasSize(size), []);

  const fitBounds = useMemo(
    () =>
      computePlanBounds(floorPlan.visibleWalls, floorPlan.visibleFurniture, floorPlan.visibleOutlets, floorPlan.visiblePaths) ??
      DEMO_BOUNDS,
    [floorPlan.visibleWalls, floorPlan.visibleFurniture, floorPlan.visibleOutlets, floorPlan.visiblePaths],
  );

  return (
    <div className="app-shell">
      <Toolbar
        viewportApi={viewportApi}
        interaction={interaction}
        floorPlan={floorPlan}
        canvasSize={canvasSize}
        fitBounds={fitBounds}
        showDemo={showDemo}
        onToggleDemo={setShowDemo}
      />

      <div className="app-body">
        <aside className="side-panel side-panel-left">
          <ToolPanel interaction={interaction} />
        </aside>

        <main className="canvas-area">
          <PlanCanvas
            viewportApi={viewportApi}
            floorPlan={floorPlan}
            interaction={interaction}
            showDemo={showDemo}
            onSizeChange={handleSizeChange}
          />
        </main>

        <aside className="side-panel side-panel-right">
          <PropertiesPanel floorPlan={floorPlan} />
          <LayerPanel floorPlan={floorPlan} />
        </aside>
      </div>

      <StatusBar viewport={viewportApi.viewport} cursorWorld={interaction.cursorWorld} />
    </div>
  );
}

export default App;
