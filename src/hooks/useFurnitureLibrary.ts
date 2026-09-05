import { useCallback, useEffect, useRef, useState } from 'react';
import type { Furniture } from '../types/furniture';
import type { Polygon } from '../types/polygon';
import type { FurnitureLibraryItem } from '../types/furnitureLibrary';
import { createId } from '../core/id';
import { polygonCentroid } from '../core/polygonGeometry';
import { loadFurnitureLibrary, saveFurnitureLibrary } from '../core/furnitureLibraryStorage';

const DEFAULT_CATEGORY = '기타';

/** 도면 저장과 별개로, 브라우저에 영구 저장되어 다른 프로젝트에서도 재사용할 수 있는 가구/다각형 라이브러리. */
export function useFurnitureLibrary() {
  const [library, setLibrary] = useState<FurnitureLibraryItem[]>(() => loadFurnitureLibrary());
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveFurnitureLibrary(library);
  }, [library]);

  const saveFurnitureToLibrary = useCallback((furniture: Furniture, name: string, category = DEFAULT_CATEGORY) => {
    const item: FurnitureLibraryItem = {
      id: createId(),
      name: name.trim() || furniture.name,
      category: category.trim() || DEFAULT_CATEGORY,
      kind: 'furniture',
      createdAt: new Date().toISOString(),
      shape: furniture.shape,
      width: furniture.width,
      height: furniture.height,
      armThicknessMm: furniture.armThicknessMm,
      color: furniture.color,
      defaultRotationDeg: furniture.rotationDeg,
      memo: furniture.memo,
    };
    setLibrary((prev) => [...prev, item]);
    return item;
  }, []);

  const savePolygonToLibrary = useCallback((polygon: Polygon, name: string, category = DEFAULT_CATEGORY) => {
    const centroid = polygonCentroid(polygon);
    const item: FurnitureLibraryItem = {
      id: createId(),
      name: name.trim() || polygon.name,
      category: category.trim() || DEFAULT_CATEGORY,
      kind: 'polygon',
      createdAt: new Date().toISOString(),
      points: polygon.points.map((p) => ({ x: p.x - centroid.x, y: p.y - centroid.y })),
      color: polygon.color,
      defaultRotationDeg: 0,
      memo: polygon.memo,
    };
    setLibrary((prev) => [...prev, item]);
    return item;
  }, []);

  const deleteFromLibrary = useCallback((id: string) => {
    setLibrary((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const renameLibraryItem = useCallback((id: string, name: string) => {
    setLibrary((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));
  }, []);

  return {
    library,
    saveFurnitureToLibrary,
    savePolygonToLibrary,
    deleteFromLibrary,
    renameLibraryItem,
  };
}

export type UseFurnitureLibraryResult = ReturnType<typeof useFurnitureLibrary>;
