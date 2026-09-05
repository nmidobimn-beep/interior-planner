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
import { defaultControlPoint } from '../core/pathGeometry';
import { endPointForLength, wallLengthMm } from '../core/wallGeometry';
import type { HingeSide, SwingDirection } from '../types/opening';
import type { Layer } from '../types/layer';
import type { ObjectKind } from '../state/floorPlanReducer';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';
import type { UsePlanInteractionResult } from '../hooks/usePlanInteraction';
import { LengthInput } from './LengthInput';

interface PropertiesPanelProps {
  floorPlan: UseFloorPlanResult;
  interaction: UsePlanInteractionResult;
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

/** 오른쪽 속성 패널 — 선택된 객체의 속성을 편집하고 삭제할 수 있다. 길이값은 모두 현재 표시 단위(mm/cm/m)로 보여준다. */
export function PropertiesPanel({ floorPlan, interaction }: PropertiesPanelProps) {
  const {
    walls,
    layers,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
    updateWall,
    updateFurniture,
    updateDoor,
    updateWindow,
    updateOutlet,
    updatePath,
    moveObjectToLayer,
    deleteSelected,
  } = floorPlan;
  const { displayUnit: unit } = interaction;

  if (selectedWall) {
    const lengthMm = Math.round(wallLengthMm(selectedWall));
    return (
      <>
        <div className="side-panel-title">벽 속성</div>

        <div className="field-row">
          <label htmlFor="wall-length">길이 ({unit})</label>
          <LengthInput
            id="wall-length"
            valueMm={lengthMm}
            unit={unit}
            minMm={MIN_WALL_LENGTH_MM}
            maxMm={Number.MAX_SAFE_INTEGER}
            onChangeMm={(mm) => updateWall(selectedWall.id, { end: endPointForLength(selectedWall, mm) })}
          />
        </div>

        <div className="field-row">
          <label htmlFor="wall-thickness">두께 ({unit})</label>
          <LengthInput
            id="wall-thickness"
            valueMm={selectedWall.thicknessMm}
            unit={unit}
            minMm={MIN_WALL_THICKNESS_MM}
            maxMm={MAX_WALL_THICKNESS_MM}
            onChangeMm={(mm) => updateWall(selectedWall.id, { thicknessMm: mm })}
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
            <label htmlFor="furniture-diameter">지름 ({unit})</label>
            <LengthInput
              id="furniture-diameter"
              valueMm={item.width}
              unit={unit}
              minMm={MIN_FURNITURE_SIZE_MM}
              maxMm={MAX_FURNITURE_SIZE_MM}
              onChangeMm={(mm) => updateFurniture(item.id, { width: mm, height: mm })}
            />
          </div>
        ) : (
          <>
            <div className="field-row">
              <label htmlFor="furniture-width">가로 ({unit})</label>
              <LengthInput
                id="furniture-width"
                valueMm={item.width}
                unit={unit}
                minMm={MIN_FURNITURE_SIZE_MM}
                maxMm={MAX_FURNITURE_SIZE_MM}
                onChangeMm={(mm) => updateFurniture(item.id, { width: mm })}
              />
            </div>
            <div className="field-row">
              <label htmlFor="furniture-height">세로 ({unit})</label>
              <LengthInput
                id="furniture-height"
                valueMm={item.height}
                unit={unit}
                minMm={MIN_FURNITURE_SIZE_MM}
                maxMm={MAX_FURNITURE_SIZE_MM}
                onChangeMm={(mm) => updateFurniture(item.id, { height: mm })}
              />
            </div>
          </>
        )}

        {item.shape === 'lshape' && (
          <div className="field-row">
            <label htmlFor="furniture-arm">팔 두께 ({unit})</label>
            <LengthInput
              id="furniture-arm"
              valueMm={item.armThicknessMm ?? MIN_FURNITURE_SIZE_MM}
              unit={unit}
              minMm={MIN_FURNITURE_SIZE_MM}
              maxMm={Math.min(item.width, item.height)}
              onChangeMm={(mm) => updateFurniture(item.id, { armThicknessMm: mm })}
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

    const changeWidth = (newWidthRaw: number) => {
      if (!wall) return;
      const newWidth = Math.min(wallLength, Math.max(MIN_OPENING_WIDTH_MM, newWidthRaw));
      const centerOffset = selectedDoor.offsetMm + selectedDoor.widthMm / 2;
      const newOffset = clampOpeningOffset(centerOffset - newWidth / 2, newWidth, wallLength);
      updateDoor(selectedDoor.id, { widthMm: newWidth, offsetMm: newOffset });
    };

    return (
      <>
        <div className="side-panel-title">문 속성</div>

        <div className="field-row">
          <label htmlFor="door-width">폭 ({unit})</label>
          <LengthInput
            id="door-width"
            valueMm={selectedDoor.widthMm}
            unit={unit}
            minMm={MIN_OPENING_WIDTH_MM}
            maxMm={wallLength}
            onChangeMm={changeWidth}
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

    const changeWidth = (newWidthRaw: number) => {
      if (!wall) return;
      const newWidth = Math.min(wallLength, Math.max(MIN_OPENING_WIDTH_MM, newWidthRaw));
      const centerOffset = selectedWindow.offsetMm + selectedWindow.widthMm / 2;
      const newOffset = clampOpeningOffset(centerOffset - newWidth / 2, newWidth, wallLength);
      updateWindow(selectedWindow.id, { widthMm: newWidth, offsetMm: newOffset });
    };

    return (
      <>
        <div className="side-panel-title">창문 속성</div>

        <div className="field-row">
          <label htmlFor="window-width">폭 ({unit})</label>
          <LengthInput
            id="window-width"
            valueMm={selectedWindow.widthMm}
            unit={unit}
            minMm={MIN_OPENING_WIDTH_MM}
            maxMm={wallLength}
            onChangeMm={changeWidth}
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

  if (selectedPath) {
    return (
      <>
        <div className="side-panel-title">동선 속성</div>

        <label className="field-row">
          <span>곡선으로 표시</span>
          <input
            type="checkbox"
            checked={selectedPath.curve}
            onChange={(e) => {
              const curve = e.target.checked;
              if (curve && !selectedPath.controlPoint) {
                updatePath(selectedPath.id, { curve, controlPoint: defaultControlPoint(selectedPath.start, selectedPath.end) });
              } else {
                updatePath(selectedPath.id, { curve });
              }
            }}
          />
        </label>

        <label className="field-row">
          <span>화살표 표시</span>
          <input
            type="checkbox"
            checked={selectedPath.showArrow}
            onChange={(e) => updatePath(selectedPath.id, { showArrow: e.target.checked })}
          />
        </label>

        <div className="field-row field-row--stacked">
          <label htmlFor="path-memo">메모</label>
          <textarea
            id="path-memo"
            rows={2}
            placeholder="예: 현관 → 거실"
            value={selectedPath.memo ?? ''}
            onChange={(e) => updatePath(selectedPath.id, { memo: e.target.value })}
          />
        </div>

        <LayerField
          kind="path"
          objectId={selectedPath.id}
          layerId={selectedPath.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button type="button" className="danger-button" onClick={deleteSelected}>
          동선 삭제
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
