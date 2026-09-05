import {
  MAX_FURNITURE_SIZE_MM,
  MAX_OUTLET_COUNT,
  MAX_WALL_THICKNESS_MM,
  MIN_FURNITURE_SIZE_MM,
  MIN_OPENING_WIDTH_MM,
  MIN_OUTLET_COUNT,
  MIN_WALL_LENGTH_MM,
  MIN_WALL_THICKNESS_MM,
} from '../config/constants';
import { clampOpeningOffset } from '../core/openingGeometry';
import { endPointForLength, wallLengthMm } from '../core/wallGeometry';
import type { HingeSide, SwingDirection } from '../types/opening';
import type { Layer } from '../types/layer';
import type { ObjectKind } from '../state/floorPlanReducer';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';

interface PropertiesPanelProps {
  floorPlan: UseFloorPlanResult;
}

interface LayerFieldProps {
  kind: ObjectKind;
  objectId: string;
  layerId: string;
  layers: Layer[];
  moveObjectToLayer: UseFloorPlanResult['moveObjectToLayer'];
}

/** 어떤 객체 종류든 공통으로 쓰는 "레이어 이동" 필드. */
function LayerField({ kind, objectId, layerId, layers, moveObjectToLayer }: LayerFieldProps) {
  return (
    <div className="field-row">
      <label htmlFor={`${kind}-layer`}>레이어</label>
      <select id={`${kind}-layer`} value={layerId} onChange={(e) => moveObjectToLayer(kind, objectId, e.target.value)}>
        {layers.map((layer) => (
          <option key={layer.id} value={layer.id}>
            {layer.name}
          </option>
        ))}
      </select>
    </div>
  );
}

/** 오른쪽 속성 패널 — 선택된 벽 또는 가구의 속성을 편집하고 삭제할 수 있다. */
export function PropertiesPanel({ floorPlan }: PropertiesPanelProps) {
  const {
    walls,
    layers,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    updateWall,
    updateFurniture,
    updateDoor,
    updateWindow,
    updateOutlet,
    moveObjectToLayer,
    deleteSelected,
  } = floorPlan;

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

        <LayerField kind="wall" objectId={selectedWall.id} layerId={selectedWall.layerId} layers={layers} moveObjectToLayer={moveObjectToLayer} />

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
          <label htmlFor="furniture-color">색상</label>
          <input
            id="furniture-color"
            type="color"
            value={item.color}
            onChange={(e) => updateFurniture(item.id, { color: e.target.value })}
          />
        </div>

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

        <LayerField
          kind="furniture"
          objectId={item.id}
          layerId={item.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button type="button" className="danger-button" onClick={deleteSelected}>
          가구 삭제
        </button>
      </>
    );
  }

  if (selectedDoor) {
    const wall = walls.find((w) => w.id === selectedDoor.wallId);
    const wallLength = wall ? wallLengthMm(wall) : MAX_WALL_THICKNESS_MM * 10;

    const changeWidth = (value: number) => {
      if (!wall || !Number.isFinite(value)) return;
      const newWidth = Math.min(wallLength, Math.max(MIN_OPENING_WIDTH_MM, value));
      const centerOffset = selectedDoor.offsetMm + selectedDoor.widthMm / 2;
      const newOffset = clampOpeningOffset(centerOffset - newWidth / 2, newWidth, wallLength);
      updateDoor(selectedDoor.id, { widthMm: newWidth, offsetMm: newOffset });
    };

    return (
      <>
        <div className="side-panel-title">문 속성</div>

        <div className="field-row">
          <label htmlFor="door-width">폭 (mm)</label>
          <input
            id="door-width"
            type="number"
            min={MIN_OPENING_WIDTH_MM}
            max={wallLength}
            value={Math.round(selectedDoor.widthMm)}
            onChange={(e) => changeWidth(Number(e.target.value))}
          />
        </div>

        <div className="field-row">
          <label htmlFor="door-hinge">경첩</label>
          <select
            id="door-hinge"
            value={selectedDoor.hingeSide}
            onChange={(e) => updateDoor(selectedDoor.id, { hingeSide: e.target.value as HingeSide })}
          >
            <option value="start">왼쪽</option>
            <option value="end">오른쪽</option>
          </select>
        </div>

        <div className="field-row">
          <label htmlFor="door-swing">여닫이</label>
          <select
            id="door-swing"
            value={selectedDoor.swingDirection}
            onChange={(e) => updateDoor(selectedDoor.id, { swingDirection: e.target.value as SwingDirection })}
          >
            <option value="in">안쪽 열림</option>
            <option value="out">바깥쪽 열림</option>
          </select>
        </div>

        <LayerField
          kind="door"
          objectId={selectedDoor.id}
          layerId={selectedDoor.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button type="button" className="danger-button" onClick={deleteSelected}>
          문 삭제
        </button>
      </>
    );
  }

  if (selectedWindow) {
    const wall = walls.find((w) => w.id === selectedWindow.wallId);
    const wallLength = wall ? wallLengthMm(wall) : MAX_WALL_THICKNESS_MM * 10;

    const changeWidth = (value: number) => {
      if (!wall || !Number.isFinite(value)) return;
      const newWidth = Math.min(wallLength, Math.max(MIN_OPENING_WIDTH_MM, value));
      const centerOffset = selectedWindow.offsetMm + selectedWindow.widthMm / 2;
      const newOffset = clampOpeningOffset(centerOffset - newWidth / 2, newWidth, wallLength);
      updateWindow(selectedWindow.id, { widthMm: newWidth, offsetMm: newOffset });
    };

    return (
      <>
        <div className="side-panel-title">창문 속성</div>

        <div className="field-row">
          <label htmlFor="window-width">폭 (mm)</label>
          <input
            id="window-width"
            type="number"
            min={MIN_OPENING_WIDTH_MM}
            max={wallLength}
            value={Math.round(selectedWindow.widthMm)}
            onChange={(e) => changeWidth(Number(e.target.value))}
          />
        </div>

        <div className="field-row field-row--stacked">
          <label htmlFor="window-memo">메모</label>
          <textarea
            id="window-memo"
            rows={2}
            value={selectedWindow.memo ?? ''}
            onChange={(e) => updateWindow(selectedWindow.id, { memo: e.target.value })}
          />
        </div>

        <LayerField
          kind="window"
          objectId={selectedWindow.id}
          layerId={selectedWindow.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button type="button" className="danger-button" onClick={deleteSelected}>
          창문 삭제
        </button>
      </>
    );
  }

  if (selectedOutlet) {
    return (
      <>
        <div className="side-panel-title">콘센트 속성</div>

        <div className="field-row">
          <label htmlFor="outlet-count">개수</label>
          <input
            id="outlet-count"
            type="number"
            min={MIN_OUTLET_COUNT}
            max={MAX_OUTLET_COUNT}
            value={selectedOutlet.count}
            onChange={(e) => {
              const value = Number(e.target.value);
              if (!Number.isFinite(value)) return;
              updateOutlet(selectedOutlet.id, { count: Math.min(MAX_OUTLET_COUNT, Math.max(MIN_OUTLET_COUNT, value)) });
            }}
          />
        </div>

        <div className="field-row field-row--stacked">
          <label htmlFor="outlet-memo">메모</label>
          <textarea
            id="outlet-memo"
            rows={2}
            placeholder="예: TV, 인터넷, 에어컨"
            value={selectedOutlet.memo ?? ''}
            onChange={(e) => updateOutlet(selectedOutlet.id, { memo: e.target.value })}
          />
        </div>

        <LayerField
          kind="outlet"
          objectId={selectedOutlet.id}
          layerId={selectedOutlet.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button type="button" className="danger-button" onClick={deleteSelected}>
          콘센트 삭제
        </button>
      </>
    );
  }

  return (
    <>
      <div className="side-panel-title">속성</div>
      <div className="side-panel-placeholder">객체를 선택하면 속성을 편집할 수 있습니다.</div>
    </>
  );
}
