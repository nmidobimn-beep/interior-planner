import { useCallback, useRef } from 'react';
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

function formatTimestamp(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
}

/** 상단 툴바. 새로 만들기/저장/불러오기, 실행취소/다시실행/복사/붙여넣기, 확대/축소/전체보기, 스냅 on/off를 담당한다. */
export function Toolbar({ viewportApi, interaction, floorPlan, canvasSize, fitBounds, showDemo, onToggleDemo }: ToolbarProps) {
  const { viewport, zoomIn, zoomOut, fitToView } = viewportApi;
  const { snapEnabled, setSnapEnabled } = interaction;
  const { canUndo, canRedo, undo, redo, canCopy, canPaste, copySelected, pasteClipboard, exportDocument, loadDocument, newDocument } =
    floorPlan;
  const zoomPercent = Math.round(viewport.scale * 100);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleNew = useCallback(() => {
    if (window.confirm('현재 도면을 지우고 새로 시작할까요? 저장하지 않은 변경 사항은 되돌릴 수 없습니다.')) {
      newDocument();
    }
  }, [newDocument]);

  const handleSave = useCallback(() => {
    const doc = exportDocument();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `interior-plan-${formatTimestamp(new Date())}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [exportDocument]);

  const handleLoadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = ''; // 같은 파일을 다시 선택해도 onChange가 또 발생하도록 초기화
      if (!file) return;

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const parsed = JSON.parse(String(reader.result));
          if (!loadDocument(parsed)) {
            window.alert('올바른 도면 파일이 아닙니다.');
          }
        } catch {
          window.alert('파일을 읽을 수 없습니다. JSON 형식이 맞는지 확인해 주세요.');
        }
      };
      reader.readAsText(file);
    },
    [loadDocument],
  );

  return (
    <header className="toolbar">
      <div className="toolbar-brand">Interior Planner</div>

      <div className="toolbar-group">
        <button type="button" onClick={handleNew} title="새로 만들기">
          새로 만들기
        </button>
        <button type="button" onClick={handleSave} title="저장 (JSON 파일로 내려받기)">
          저장
        </button>
        <button type="button" onClick={handleLoadClick} title="불러오기 (JSON 파일)">
          불러오기
        </button>
        <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleFileChange} />
      </div>

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
