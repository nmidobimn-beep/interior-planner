import {
  MAX_FURNITURE_SIZE_MM,
  MAX_WALL_THICKNESS_MM,
  MIN_FURNITURE_SIZE_MM,
  MIN_WALL_LENGTH_MM,
  MIN_WALL_THICKNESS_MM,
} from '../config/constants';
import { endPointForLength, wallLengthMm } from '../core/wallGeometry';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';

interface PropertiesPanelProps {
  floorPlan: UseFloorPlanResult;
}

/** 오른쪽 속성 패널 — 선택된 벽 또는 가구의 속성을 편집하고 삭제할 수 있다. */
export function PropertiesPanel({ floorPlan }: PropertiesPanelProps) {
  const { selectedWall, selectedFurniture, updateWall, updateFurniture, deleteSelected } = floorPlan;

  if (selectedWall) {
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

        <button type="button" className="danger-button" onClick={deleteSelected}>
          벽 삭제
        </button>
      </>
    );
  }

  if (selectedFurniture) {
    const item = selectedFurniture;
    const clampSize = (value: number) => Math.min(MAX_FURNITURE_SIZE_MM, Math.max(MIN_FURNITURE_SIZE_MM, value));

    return (
      <>
        <div className="side-panel-title">가구 속성</div>

        <div className="field-row">
          <label htmlFor="furniture-name">이름</label>
          <input
            id="furniture-name"
            type="text"
            value={item.name}
            onChange={(e) => updateFurniture(item.id, { name: e.target.value })}
          />
        </div>

        {item.shape === 'circle' ? (
          <div className="field-row">
            <label htmlFor="furniture-diameter">지름 (mm)</label>
            <input
              id="furniture-diameter"
              type="number"
              min={MIN_FURNITURE_SIZE_MM}
              max={MAX_FURNITURE_SIZE_MM}
              value={item.width}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!Number.isFinite(value)) return;
                const clamped = clampSize(value);
                updateFurniture(item.id, { width: clamped, height: clamped });
              }}
            />
          </div>
        ) : (
          <>
            <div className="field-row">
              <label htmlFor="furniture-width">가로 (mm)</label>
              <input
                id="furniture-width"
                type="number"
                min={MIN_FURNITURE_SIZE_MM}
                max={MAX_FURNITURE_SIZE_MM}
                value={item.width}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isFinite(value)) return;
                  updateFurniture(item.id, { width: clampSize(value) });
                }}
              />
            </div>
            <div className="field-row">
              <label htmlFor="furniture-height">세로 (mm)</label>
              <input
                id="furniture-height"
                type="number"
                min={MIN_FURNITURE_SIZE_MM}
                max={MAX_FURNITURE_SIZE_MM}
                value={item.height}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (!Number.isFinite(value)) return;
                  updateFurniture(item.id, { height: clampSize(value) });
                }}
              />
            </div>
          </>
        )}

        {item.shape === 'lshape' && (
          <div className="field-row">
            <label htmlFor="furniture-arm">팔 두께 (mm)</label>
            <input
              id="furniture-arm"
              type="number"
              min={MIN_FURNITURE_SIZE_MM}
              max={Math.min(item.width, item.height)}
              value={item.armThicknessMm}
              onChange={(e) => {
                const value = Number(e.target.value);
                if (!Number.isFinite(value)) return;
                updateFurniture(item.id, { armThicknessMm: clampSize(value) });
              }}
            />
          </div>
        )}

        <div className="field-row">
          <label htmlFor="furniture-rotation">회전 (°)</label>
          <input
            id="furniture-rotation"
            type="number"
            value={Math.round(item.rotationDeg)}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value)) return;
              updateFurniture(item.id, { rotationDeg: ((value % 360) + 360) % 360 });
            }}
          />
        </div>

        <div className="field-row field-row--stacked">
          <label htmlFor="furniture-memo">메모</label>
          <textarea
            id="furniture-memo"
            rows={2}
            value={item.memo ?? ''}
            onChange={(e) => updateFurniture(item.id, { memo: e.target.value })}
          />
        </div>

        <button type="button" className="danger-button" onClick={deleteSelected}>
          가구 삭제
        </button>
      </>
    );
  }

  return (
    <>
      <div className="side-panel-title">속성</div>
      <div className="side-panel-placeholder">벽 또는 가구를 선택하면 속성을 편집할 수 있습니다.</div>
    </>
  );
}
