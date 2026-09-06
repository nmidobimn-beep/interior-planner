import type { UseFloorPlanResult } from '../hooks/useFloorPlan';

interface LayerPanelProps {
  floorPlan: UseFloorPlanResult;
}

/**
 * 레이어 목록 패널.
 * 행을 클릭하면 "활성 레이어"가 되어(새로 그리는 객체가 여기 들어감) 강조 표시되고,
 * 눈 아이콘으로 표시/숨김을, 이름 입력으로 이름 변경을, 삭제 버튼으로 레이어를 지운다
 * (레이어 삭제 시 그 안의 객체는 사라지지 않고 남은 첫 레이어로 옮겨진다).
 */
export function LayerPanel({ floorPlan }: LayerPanelProps) {
  const { layers, activeLayerId, setActiveLayer, addLayer, duplicateLayer, renameLayer, toggleLayerVisibility, deleteLayer } = floorPlan;

  return (
    <div id="layer-panel">
      <div className="side-panel-title">레이어</div>
      <ul className="layer-list">
        {layers.map((layer) => (
          <li key={layer.id} className={`layer-row${layer.id === activeLayerId ? ' is-active' : ''}`} onClick={() => setActiveLayer(layer.id)}>
            <button
              type="button"
              className="layer-visibility-toggle"
              title={layer.visible ? '숨기기' : '표시하기'}
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerVisibility(layer.id);
              }}
            >
              {layer.visible ? '👁' : '🙈'}
            </button>
            <input
              className="layer-name-input"
              type="text"
              value={layer.name}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => renameLayer(layer.id, e.target.value)}
            />
            <button
              type="button"
              className="layer-duplicate-button"
              title="레이어 복사 — 이 레이어의 벽·가구·텍스트를 모두 복제해 새 레이어로 만듭니다"
              onClick={(e) => {
                e.stopPropagation();
                duplicateLayer(layer.id);
              }}
            >
              ⧉
            </button>
            <button
              type="button"
              className="layer-delete-button"
              title="레이어 삭제"
              disabled={layers.length <= 1}
              onClick={(e) => {
                e.stopPropagation();
                deleteLayer(layer.id);
              }}
            >
              ×
            </button>
          </li>
        ))}
      </ul>
      <button type="button" className="layer-add-button" onClick={() => addLayer()}>
        + 새 레이어
      </button>
    </div>
  );
}
