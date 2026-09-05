import { MAX_WALL_THICKNESS_MM, MIN_WALL_LENGTH_MM, MIN_WALL_THICKNESS_MM } from '../config/constants';
import { endPointForLength, wallLengthMm } from '../core/wallGeometry';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';

interface WallPropertiesPanelProps {
  floorPlan: UseFloorPlanResult;
}

/** 오른쪽 속성 패널 — 선택된 벽의 길이/두께를 직접 입력해 수정하고, 삭제할 수 있다. */
export function WallPropertiesPanel({ floorPlan }: WallPropertiesPanelProps) {
  const { selectedWall, updateWall, deleteWall } = floorPlan;

  if (!selectedWall) {
    return (
      <>
        <div className="side-panel-title">속성</div>
        <div className="side-panel-placeholder">벽을 선택하면 길이 · 두께를 편집할 수 있습니다.</div>
      </>
    );
  }

  const lengthMm = Math.round(wallLengthMm(selectedWall));

  return (
    <>
      <div className="side-panel-title">벽 속성</div>

      <div className="field-row">
        <label htmlFor="wall-length">길이 (mm)</label>
        <input
          id="wall-length"
          type="number"
          min={MIN_WALL_LENGTH_MM}
          value={lengthMm}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (!Number.isFinite(value) || value < MIN_WALL_LENGTH_MM) return;
            updateWall(selectedWall.id, { end: endPointForLength(selectedWall, value) });
          }}
        />
      </div>

      <div className="field-row">
        <label htmlFor="wall-thickness">두께 (mm)</label>
        <input
          id="wall-thickness"
          type="number"
          min={MIN_WALL_THICKNESS_MM}
          max={MAX_WALL_THICKNESS_MM}
          value={selectedWall.thicknessMm}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (!Number.isFinite(value)) return;
            const clamped = Math.min(MAX_WALL_THICKNESS_MM, Math.max(MIN_WALL_THICKNESS_MM, value));
            updateWall(selectedWall.id, { thicknessMm: clamped });
          }}
        />
      </div>

      <button type="button" className="danger-button" onClick={() => deleteWall(selectedWall.id)}>
        벽 삭제
      </button>
    </>
  );
}
