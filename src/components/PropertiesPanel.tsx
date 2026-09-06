import { MAX_FURNITURE_SIZE_MM, MAX_OUTLET_COUNT, MAX_WALL_THICKNESS_MM, MIN_FURNITURE_SIZE_MM } from '../config/constants';
import { clampOpeningOffset } from '../core/openingGeometry';
import { defaultControlPoint } from '../core/pathGeometry';
import { endPointForLength, wallLengthMm } from '../core/wallGeometry';
import { computeDimensionGeometry } from '../core/dimensionGeometry';
import { formatLengthMm } from '../core/units';
import type { HingeSide, SwingDirection } from '../types/opening';
import type { DimensionMode } from '../types/dimension';
import type { Layer } from '../types/layer';
import type { ObjectKind } from '../state/floorPlanReducer';
import type { UseFloorPlanResult } from '../hooks/useFloorPlan';
import type { UsePlanInteractionResult } from '../hooks/usePlanInteraction';
import type { UseFurnitureLibraryResult } from '../hooks/useFurnitureLibrary';
import { LengthInput } from './LengthInput';
import { NumberInput } from './NumberInput';

interface PropertiesPanelProps {
  floorPlan: UseFloorPlanResult;
  interaction: UsePlanInteractionResult;
  furnitureLibrary: UseFurnitureLibraryResult;
}

/** 이름(필수)·분류(선택)를 물어보고 "취소"면 null. 간단한 MVP라 window.prompt를 그대로 쓴다. */
function promptLibrarySaveInfo(defaultName: string): { name: string; category: string } | null {
  const name = window.prompt('라이브러리에 저장할 이름을 입력하세요', defaultName);
  if (name === null) return null;
  const category = window.prompt('분류(예: 침실/거실/주방) — 비워두면 "기타"로 저장됩니다', '') ?? '';
  return { name: name.trim() || defaultName, category };
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
export function PropertiesPanel({ floorPlan, interaction, furnitureLibrary }: PropertiesPanelProps) {
  const { saveFurnitureToLibrary, savePolygonToLibrary } = furnitureLibrary;
  const {
    walls,
    layers,
    selectedWall,
    selectedFurniture,
    selectedDoor,
    selectedWindow,
    selectedOutlet,
    selectedPath,
    selectedLabel,
    selectedPolygon,
    selectedDimension,
    selectionCount,
    updateWall,
    updateFurniture,
    updateDoor,
    updateWindow,
    updateOutlet,
    updatePath,
    updateLabel,
    updatePolygon,
    updateDimension,
    moveObjectToLayer,
    deleteSelected,
  } = floorPlan;
  const { displayUnit: unit } = interaction;

  if (selectionCount > 1) {
    return (
      <>
        <div className="side-panel-title">다중 선택</div>
        <div className="side-panel-placeholder">
          객체 {selectionCount}개가 선택되었습니다. 하나를 드래그하면 전체가 함께 이동하고, 바운딩 박스 위쪽
          손잡이를 드래그하면 전체가 함께 회전합니다.
        </div>
        <button type="button" className="danger-button" onClick={deleteSelected}>
          선택한 {selectionCount}개 삭제
        </button>
      </>
    );
  }

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
          <NumberInput
            id="furniture-rotation"
            value={Math.round(item.rotationDeg)}
            onCommit={(value) => updateFurniture(item.id, { rotationDeg: ((value % 360) + 360) % 360 })}
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

        <button
          type="button"
          className="layer-add-button"
          onClick={() => {
            const info = promptLibrarySaveInfo(item.name);
            if (info) saveFurnitureToLibrary(item, info.name, info.category);
          }}
        >
          + 가구로 저장
        </button>

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
      const newWidth = Math.min(wallLength, newWidthRaw);
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
      const newWidth = Math.min(wallLength, newWidthRaw);
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
          <NumberInput
            id="outlet-count"
            max={MAX_OUTLET_COUNT}
            value={selectedOutlet.count}
            onCommit={(value) => updateOutlet(selectedOutlet.id, { count: value })}
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

  if (selectedLabel) {
    return (
      <>
        <div className="side-panel-title">텍스트 속성</div>

        <div className="field-row">
          <label htmlFor="label-text">내용</label>
          <input
            id="label-text"
            type="text"
            value={selectedLabel.text}
            onChange={(e) => updateLabel(selectedLabel.id, { text: e.target.value })}
          />
        </div>

        <LayerField
          kind="label"
          objectId={selectedLabel.id}
          layerId={selectedLabel.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button type="button" className="danger-button" onClick={deleteSelected}>
          텍스트 삭제
        </button>
      </>
    );
  }

  if (selectedPolygon) {
    return (
      <>
        <div className="side-panel-title">다각형 속성</div>

        <div className="field-row">
          <label htmlFor="polygon-name">이름</label>
          <input
            id="polygon-name"
            type="text"
            value={selectedPolygon.name}
            onChange={(e) => updatePolygon(selectedPolygon.id, { name: e.target.value })}
          />
        </div>

        <div className="field-row">
          <label htmlFor="polygon-color">색상</label>
          <input
            id="polygon-color"
            type="color"
            value={selectedPolygon.color}
            onChange={(e) => updatePolygon(selectedPolygon.id, { color: e.target.value })}
          />
        </div>

        <div className="field-row field-row--stacked">
          <label htmlFor="polygon-memo">메모</label>
          <textarea
            id="polygon-memo"
            rows={2}
            value={selectedPolygon.memo ?? ''}
            onChange={(e) => updatePolygon(selectedPolygon.id, { memo: e.target.value })}
          />
        </div>

        <div className="side-panel-placeholder">꼭짓점 {selectedPolygon.points.length}개 — 선택 후 꼭짓점을 드래그해 모양을 바꿀 수 있습니다.</div>

        <LayerField
          kind="polygon"
          objectId={selectedPolygon.id}
          layerId={selectedPolygon.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button
          type="button"
          className="layer-add-button"
          onClick={() => {
            const info = promptLibrarySaveInfo(selectedPolygon.name);
            if (info) savePolygonToLibrary(selectedPolygon, info.name, info.category);
          }}
        >
          + 가구로 저장
        </button>

        <button type="button" className="danger-button" onClick={deleteSelected}>
          다각형 삭제
        </button>
      </>
    );
  }

  if (selectedDimension) {
    const geo = computeDimensionGeometry(selectedDimension);

    return (
      <>
        <div className="side-panel-title">치수선 속성</div>

        <div className="side-panel-placeholder">거리: {formatLengthMm(geo.valueMm, unit)}</div>

        <div className="field-row">
          <label htmlFor="dimension-mode">표시 방식</label>
          <select
            id="dimension-mode"
            value={selectedDimension.mode}
            onChange={(e) => updateDimension(selectedDimension.id, { mode: e.target.value as DimensionMode })}
          >
            <option value="straight">직선거리</option>
            <option value="horizontal">가로거리</option>
            <option value="vertical">세로거리</option>
          </select>
        </div>

        <div className="field-row field-row--stacked">
          <label htmlFor="dimension-memo">메모</label>
          <textarea
            id="dimension-memo"
            rows={2}
            value={selectedDimension.memo ?? ''}
            onChange={(e) => updateDimension(selectedDimension.id, { memo: e.target.value })}
          />
        </div>

        <LayerField
          kind="dimension"
          objectId={selectedDimension.id}
          layerId={selectedDimension.layerId}
          layers={layers}
          moveObjectToLayer={moveObjectToLayer}
        />

        <button type="button" className="danger-button" onClick={deleteSelected}>
          치수선 삭제
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
