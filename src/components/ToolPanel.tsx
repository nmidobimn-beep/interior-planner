import { MAX_WALL_THICKNESS_MM, MIN_WALL_THICKNESS_MM } from '../config/constants';
import type { ToolId, UsePlanInteractionResult } from '../hooks/usePlanInteraction';

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

/** 왼쪽 도구 패널. 도구 전환과, 새로 그릴 벽의 기본 두께를 설정한다. */
export function ToolPanel({ interaction }: ToolPanelProps) {
  const { activeTool, setActiveTool, defaultWallThicknessMm, setDefaultWallThicknessMm } = interaction;

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
        <div className="field-row">
          <label htmlFor="default-wall-thickness">기본 벽 두께 (mm)</label>
          <input
            id="default-wall-thickness"
            type="number"
            min={MIN_WALL_THICKNESS_MM}
            max={MAX_WALL_THICKNESS_MM}
            value={defaultWallThicknessMm}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value)) return;
              setDefaultWallThicknessMm(Math.min(MAX_WALL_THICKNESS_MM, Math.max(MIN_WALL_THICKNESS_MM, value)));
            }}
          />
        </div>
      )}

      <div className="side-panel-title">문 · 창문 · 콘센트</div>
      {renderToolGroup(OPENING_TOOLS)}

      <div className="side-panel-title">가구</div>
      {renderToolGroup(FURNITURE_TOOLS)}

      <div className="side-panel-title">앞으로 추가될 도구</div>
      <div className="side-panel-placeholder">다각형 가구 · 동선 (5단계~)</div>
    </>
  );
}
