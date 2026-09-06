import { useCallback, useMemo, useState } from 'react';
import './App.css';
import { Toolbar } from './components/Toolbar';
import { PlanCanvas } from './components/PlanCanvas';
import { StatusBar } from './components/StatusBar';
import { ToolPanel } from './components/ToolPanel';
import { PropertiesPanel } from './components/PropertiesPanel';
import { LayerPanel } from './components/LayerPanel';
import { FurnitureLibraryPanel } from './components/FurnitureLibraryPanel';
import { CloudFurnitureLibraryPanel } from './components/CloudFurnitureLibraryPanel';
import { ProjectPanel } from './components/ProjectPanel';
import { CommandWindow } from './components/CommandWindow';
import { CommandHelpModal } from './components/CommandHelpModal';
import { computePlanBounds } from './core/bounds';
import { DEMO_BOUNDS } from './core/demoScene';
import { screenToWorld } from './core/viewport';
import { DEFAULT_FURNITURE_COLOR, DEFAULT_POLYGON_COLOR } from './config/constants';
import { useFloorPlan } from './hooks/useFloorPlan';
import { usePlanInteraction } from './hooks/usePlanInteraction';
import { useViewport } from './hooks/useViewport';
import { useFurnitureLibrary } from './hooks/useFurnitureLibrary';
import { useCloudFurnitureLibrary } from './hooks/useCloudFurnitureLibrary';
import { useProjects } from './hooks/useProjects';
import { useCommandSystem } from './hooks/useCommandSystem';
import type { Size } from './types/geometry';
import type { FurnitureLibraryItem } from './types/furnitureLibrary';
import type { CloudFurnitureItem } from './types/cloudFurniture';

/** 라이브러리에서 불러온 객체를 놓을 기본 화면 위치(px) — 캔버스 왼쪽 위 근처, 항상 화면 안에 보인다. */
const LIBRARY_PLACE_ANCHOR_SCREEN = { x: 160, y: 160 };

function App() {
  const viewportApi = useViewport();
  const floorPlan = useFloorPlan();
  const interaction = usePlanInteraction({ viewport: viewportApi.viewport, panBy: viewportApi.panBy, floorPlan });
  const furnitureLibrary = useFurnitureLibrary();
  const cloudFurnitureLibrary = useCloudFurnitureLibrary();
  const projects = useProjects(floorPlan);
  const commandSystem = useCommandSystem({ interaction, floorPlan, viewport: viewportApi.viewport });

  const [canvasSize, setCanvasSize] = useState<Size>({ width: 0, height: 0 });
  const [showDemo, setShowDemo] = useState(true);

  const handleSizeChange = useCallback((size: Size) => setCanvasSize(size), []);

  const fitBounds = useMemo(
    () =>
      computePlanBounds(
        floorPlan.visibleWalls,
        floorPlan.visibleFurniture,
        floorPlan.visibleOutlets,
        floorPlan.visiblePaths,
        floorPlan.visibleLabels,
        floorPlan.visiblePolygons,
        floorPlan.visibleDimensions,
      ) ?? DEMO_BOUNDS,
    [
      floorPlan.visibleWalls,
      floorPlan.visibleFurniture,
      floorPlan.visibleOutlets,
      floorPlan.visiblePaths,
      floorPlan.visibleLabels,
      floorPlan.visiblePolygons,
      floorPlan.visibleDimensions,
    ],
  );

  // 라이브러리에서 불러온 항목은 원본과 연결되지 않은 새 독립 객체로 생성한다 —
  // 평면도에서 나중에 크기/이름을 바꿔도 라이브러리에 저장된 원본은 그대로 남는다.
  const handlePlaceLibraryItem = useCallback(
    (item: FurnitureLibraryItem) => {
      const position = screenToWorld(viewportApi.viewport, LIBRARY_PLACE_ANCHOR_SCREEN);

      if (item.kind === 'furniture' && item.shape) {
        const created = floorPlan.addFurniture(
          item.shape,
          position,
          { width: item.width ?? 800, height: item.height ?? 400 },
          { armThicknessMm: item.armThicknessMm },
        );
        floorPlan.updateFurniture(created.id, {
          name: item.name,
          rotationDeg: item.defaultRotationDeg,
          color: item.color ?? DEFAULT_FURNITURE_COLOR,
          memo: item.memo,
        });
      } else if (item.kind === 'polygon' && item.points) {
        const points = item.points.map((p) => ({ x: p.x + position.x, y: p.y + position.y }));
        const created = floorPlan.addPolygon(points);
        floorPlan.updatePolygon(created.id, { name: item.name, color: item.color ?? DEFAULT_POLYGON_COLOR, memo: item.memo });
      }
    },
    [floorPlan, viewportApi.viewport],
  );

  // 공용 가구 라이브러리(Cloudflare D1)에서 배치 — 새 객체를 만들 뿐 라이브러리 원본은 절대
  // 옮기거나 바꾸지 않는다. libraryId로만 원본과 연결해둬서, 나중에 위치/회전을 바꿔도
  // 라이브러리의 가로/세로/색상은 자동으로 바뀌지 않는다(요구사항 그대로).
  const handlePlaceCloudFurniture = useCallback(
    (item: CloudFurnitureItem) => {
      const position = screenToWorld(viewportApi.viewport, LIBRARY_PLACE_ANCHOR_SCREEN);
      const shape = item.shape_type === 'circle' || item.shape_type === 'lshape' ? item.shape_type : 'rectangle';
      const created = floorPlan.addFurniture(shape, position, { width: item.width, height: item.height });
      floorPlan.updateFurniture(created.id, {
        name: item.name,
        color: item.color ?? DEFAULT_FURNITURE_COLOR,
        memo: item.memo ?? undefined,
        libraryId: item.id,
      });
    },
    [floorPlan, viewportApi.viewport],
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
          <ProjectPanel projects={projects} />
          <CloudFurnitureLibraryPanel library={cloudFurnitureLibrary} onPlace={handlePlaceCloudFurniture} />
          <FurnitureLibraryPanel furnitureLibrary={furnitureLibrary} onPlace={handlePlaceLibraryItem} />
        </aside>

        <main className="canvas-area">
          <PlanCanvas
            viewportApi={viewportApi}
            floorPlan={floorPlan}
            interaction={interaction}
            commandSystem={commandSystem}
            showDemo={showDemo}
            onSizeChange={handleSizeChange}
          />
        </main>

        <aside className="side-panel side-panel-right">
          <PropertiesPanel floorPlan={floorPlan} interaction={interaction} furnitureLibrary={furnitureLibrary} />
          <LayerPanel floorPlan={floorPlan} />
        </aside>
      </div>

      <CommandWindow commandSystem={commandSystem} />
      <CommandHelpModal commandSystem={commandSystem} />

      <StatusBar viewport={viewportApi.viewport} cursorWorld={interaction.cursorWorld} unit={interaction.displayUnit} />
    </div>
  );
}

export default App;
