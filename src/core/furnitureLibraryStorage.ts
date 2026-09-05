import type { FurnitureLibraryItem } from '../types/furnitureLibrary';

/** 도면 파일과 별개로, 브라우저에 영구 저장되어 다른 프로젝트에서도 재사용되는 라이브러리. */
export const FURNITURE_LIBRARY_STORAGE_KEY = 'interior-planner:furniture-library';

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function isValidItem(value: unknown): value is FurnitureLibraryItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.category === 'string' &&
    (item.kind === 'furniture' || item.kind === 'polygon')
  );
}

/** 손상된 데이터가 있어도 앱이 죽지 않도록 방어적으로 읽는다. */
export function loadFurnitureLibrary(): FurnitureLibraryItem[] {
  try {
    const raw = localStorage.getItem(FURNITURE_LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!isArray(parsed)) return [];
    return parsed.filter(isValidItem);
  } catch {
    return [];
  }
}

export function saveFurnitureLibrary(items: FurnitureLibraryItem[]): void {
  try {
    localStorage.setItem(FURNITURE_LIBRARY_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // localStorage를 쓸 수 없는 환경(프라이빗 모드 등)에서는 조용히 무시한다.
  }
}
