import { MAX_WALL_LENGTH_SNAP_MM, MAX_WALL_THICKNESS_MM, MIN_WALL_LENGTH_SNAP_MM, MIN_WALL_THICKNESS_MM } from '../config/constants';
import type { ToolId, UsePlanInteractionResult } from '../hooks/usePlanInteraction';
import { LengthInput } from './LengthInput';

interface ToolPanelProps {
  interaction: UsePlanInteractionResult;
}

const STRUCTURE_TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'select', label: '선택', hint: '클릭해서 선택 · 드래그로 이동' },
  { id: 'wall', label: '벽', hint: '클릭-클릭으로 연결해 그리기 (Esc/우클릭: 종료)' },
];

const OPENING_TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'door', label: '문', hint: '벽을 클릭하면 그 자리에 문을 놓습니다' },
  { id: 'window', label: '창문', hint: '벽을 클릭하면 그 자리에 창문을 놓습니다' },
  { id: 'outlet', label: '콘센트', hint: '클릭한 위치에 콘센트를 놓습니다 (벽 위/무관 모두 가능)' },
];

const FURNITURE_TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'rectangle', label: '사각형', hint: '클릭한 위치에 사각형 가구를 놓습니다' },
  { id: 'circle', label: '원형', hint: '클릭한 위치에 원형 가구를 놓습니다' },
  { id: 'lshape', label: 'ㄱ자', hint: '클릭한 위치에 ㄱ자(코너) 가구를 놓습니다' },
];

const PATH_TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'path', label: '동선', hint: '클릭-클릭으로 이동 경로를 그립니다 (예: 현관 → 거실)' },
];

const LABEL_TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'label', label: '텍스트', hint: '클릭한 위치에 텍스트 라벨을 놓습니다 (예: 방 이름)' },
];

const POLYGON_TOOLS: { id: ToolId; label: string; hint: string }[] = [
  {
    id: 'polygon',
    label: '다각형',
    hint: '클릭으로 꼭짓점 추가, 첫 점을 다시 클릭하거나 Enter로 완성 (Esc/우클릭: 취소)',
  },
];

const DIMENSION_TOOLS: { id: ToolId; label: string; hint: string }[] = [
  { id: 'dimension', label: '치수선', hint: '점을 클릭하고 다음 점을 클릭하면 거리를 표시하는 치수선을 그립니다' },
];

/** 왼쪽 도구 패널. 도구 전환과, 새로 그릴 벽의 기본 두께·길이 스냅 단위를 설정한다. */
export function ToolPanel({ interaction }: ToolPanelProps) {
  const {
    activeTool,
    setActiveTool,
    defaultWallThicknessMm,
    setDefaultWallThicknessMm,
    wallLengthSnapMm,
    setWallLengthSnapMm,
    pathShape,
    setPathShape,
    dimensionMode,
    setDimensionMode,
    displayUnit,
    polygonDraft,
  } = interaction;

  const renderToolGroup = (tools: { id: ToolId; label: string; hint: string }[]) => (
    <div className="tool-button-list">
      {tools.map((tool) => (
        <button
          key={tool.id}
          type="button"
          className={`tool-button${activeTool === tool.id ? ' is-active' : ''}`}
          onClick={() => setActiveTool(tool.id)}
          title={tool.hint}
        >
          {tool.label}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="side-panel-title">구조</div>
      {renderToolGroup(STRUCTURE_TOOLS)}

      {activeTool === 'wall' && (
        <>
          <div className="field-row">
            <label htmlFor="default-wall-thickness">기본 벽 두께 ({displayUnit})</label>
            <LengthInput
              id="default-wall-thickness"
              valueMm={defaultWallThicknessMm}
              unit={displayUnit}
              minMm={MIN_WALL_THICKNESS_MM}
              maxMm={MAX_WALL_THICKNESS_MM}
              onChangeMm={setDefaultWallThicknessMm}
            />
          </div>

          <div className="field-row">
            <label htmlFor="wall-length-snap">길이 스냅 단위 ({displayUnit})</label>
            <LengthInput
              id="wall-length-snap"
              valueMm={wallLengthSnapMm}
              unit={displayUnit}
              minMm={MIN_WALL_LENGTH_SNAP_MM}
              maxMm={MAX_WALL_LENGTH_SNAP_MM}
              onChangeMm={setWallLengthSnapMm}
            />
          </div>
        </>
      )}

      <div className="side-panel-title">문 · 창문 · 콘센트</div>
      {renderToolGroup(OPENING_TOOLS)}

      <div className="side-panel-title">가구</div>
      {renderToolGroup(FURNITURE_TOOLS)}

      <div className="side-panel-title">동선</div>
      {renderToolGroup(PATH_TOOLS)}

      {activeTool === 'path' && (
        <div className="tool-button-list">
          <button
            type="button"
            className={`tool-button${pathShape === 'straight' ? ' is-active' : ''}`}
            onClick={() => setPathShape('straight')}
            title="직선으로 그립니다"
          >
            직선
          </button>
          <button
            type="button"
            className={`tool-button${pathShape === 'curve' ? ' is-active' : ''}`}
            onClick={() => setPathShape('curve')}
            title="곡선으로 그립니다 (조절점을 드래그해 휘어짐을 조절)"
          >
            곡선
          </button>
        </div>
      )}

      <div className="side-panel-title">텍스트</div>
      {renderToolGroup(LABEL_TOOLS)}

      <div className="side-panel-title">다각형</div>
      {renderToolGroup(POLYGON_TOOLS)}
      {activeTool === 'polygon' && polygonDraft.length > 0 && (
        <div className="side-panel-placeholder">
          꼭짓점 {polygonDraft.length}개 — 첫 점을 다시 클릭하거나 Enter로 완성 (최소 3개 필요)
        </div>
      )}

      <div className="side-panel-title">치수선</div>
      {renderToolGroup(DIMENSION_TOOLS)}
      {activeTool === 'dimension' && (
        <div className="tool-button-list">
          <button
            type="button"
            className={`tool-button${dimensionMode === 'straight' ? ' is-active' : ''}`}
            onClick={() => setDimensionMode('straight')}
            title="두 점 사이의 직선 거리를 표시합니다"
          >
            직선거리
          </button>
          <button
            type="button"
            className={`tool-button${dimensionMode === 'horizontal' ? ' is-active' : ''}`}
            onClick={() => setDimensionMode('horizontal')}
            title="두 점의 가로(x) 거리만 표시합니다"
          >
            가로거리
          </button>
          <button
            type="button"
            className={`tool-button${dimensionMode === 'vertical' ? ' is-active' : ''}`}
            onClick={() => setDimensionMode('vertical')}
            title="두 점의 세로(y) 거리만 표시합니다"
          >
            세로거리
          </button>
        </div>
      )}
    </>
  );
}
