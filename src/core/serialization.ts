import type { Wall } from '../types/wall';
import type { Furniture } from '../types/furniture';
import type { Door, WindowOpening } from '../types/opening';
import type { Outlet } from '../types/outlet';
import type { Path } from '../types/path';
import type { TextLabel } from '../types/label';
import type { Layer } from '../types/layer';
import type { FloorPlanState } from '../state/floorPlanReducer';

export const DOCUMENT_VERSION = 1;

/** 파일로 저장/불러오기하는 도면 문서. FloorPlanState에서 selectedObject(선택 상태)만 뺀 형태. */
export interface FloorPlanDocument {
  version: number;
  savedAt: string;
  walls: Wall[];
  furniture: Furniture[];
  doors: Door[];
  windows: WindowOpening[];
  outlets: Outlet[];
  paths: Path[];
  labels: TextLabel[];
  layers: Layer[];
  activeLayerId: string;
}

export function serializeFloorPlan(state: FloorPlanState): FloorPlanDocument {
  return {
    version: DOCUMENT_VERSION,
    savedAt: new Date().toISOString(),
    walls: state.walls,
    furniture: state.furniture,
    doors: state.doors,
    windows: state.windows,
    outlets: state.outlets,
    paths: state.paths,
    labels: state.labels,
    layers: state.layers,
    activeLayerId: state.activeLayerId,
  };
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * 저장된 파일(또는 localStorage)을 읽어올 때 형태를 검증한다.
 * 완전히 다른 파일이거나 손상된 경우 null을 반환해 호출부가 실패를 알릴 수 있게 한다.
 * layerId가 남아있지 않은 레이어를 가리키면 첫 레이어로 고쳐 넣어(방어적 정규화)
 * 손으로 편집했거나 레이어가 삭제된 옛 파일도 안전하게 불러와진다.
 */
export function parseFloorPlanDocument(input: unknown): FloorPlanDocument | null {
  if (!input || typeof input !== 'object') return null;
  const doc = input as Record<string, unknown>;

  if (!isArray(doc.walls) || !isArray(doc.furniture) || !isArray(doc.doors) || !isArray(doc.windows)) return null;
  if (!isArray(doc.outlets) || !isArray(doc.paths) || !isArray(doc.layers) || doc.layers.length === 0) return null;
  // labels는 이 기능이 없던 옛 파일에는 없을 수 있으므로 없으면 빈 배열로 취급한다(하위 호환).
  if (doc.labels !== undefined && !isArray(doc.labels)) return null;

  const layers = doc.layers as Layer[];
  const layerIds = new Set(layers.map((l) => l.id));
  const fallbackLayerId = layers[0].id;
  const normalizeLayerId = <T extends { layerId?: string }>(items: T[]): T[] =>
    items.map((item) => (item.layerId && layerIds.has(item.layerId) ? item : { ...item, layerId: fallbackLayerId }));

  const activeLayerId = typeof doc.activeLayerId === 'string' && layerIds.has(doc.activeLayerId) ? doc.activeLayerId : fallbackLayerId;

  return {
    version: typeof doc.version === 'number' ? doc.version : DOCUMENT_VERSION,
    savedAt: typeof doc.savedAt === 'string' ? doc.savedAt : new Date().toISOString(),
    walls: normalizeLayerId(doc.walls as Wall[]),
    furniture: normalizeLayerId(doc.furniture as Furniture[]),
    doors: normalizeLayerId(doc.doors as Door[]),
    windows: normalizeLayerId(doc.windows as WindowOpening[]),
    outlets: normalizeLayerId(doc.outlets as Outlet[]),
    paths: normalizeLayerId(doc.paths as Path[]),
    labels: normalizeLayerId((doc.labels as TextLabel[]) ?? []),
    layers,
    activeLayerId,
  };
}

export function documentToState(doc: FloorPlanDocument): FloorPlanState {
  return {
    walls: doc.walls,
    furniture: doc.furniture,
    doors: doc.doors,
    windows: doc.windows,
    outlets: doc.outlets,
    paths: doc.paths,
    labels: doc.labels ?? [],
    layers: doc.layers,
    activeLayerId: doc.activeLayerId,
    selection: [],
  };
}

export const AUTOSAVE_STORAGE_KEY = 'interior-planner:autosave';
