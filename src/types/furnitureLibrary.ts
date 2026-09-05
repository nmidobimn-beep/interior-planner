import type { Point } from './geometry';
import type { FurnitureShape } from './furniture';

/**
 * 가구/다각형 라이브러리 항목 — 평면도의 x/y(현재 위치)는 저장하지 않는다.
 * 라이브러리에서 불러온 객체는 항상 새로운 독립 객체로 생성되므로, 평면도에서 크기/이름을
 * 바꿔도 이 원본 데이터는 변하지 않는다.
 */
export type LibraryItemKind = 'furniture' | 'polygon';

export interface FurnitureLibraryItem {
  id: string;
  name: string;
  /** 사용자가 정하는 분류(예: 침실/거실/주방). 비어 있으면 "기타"로 묶어 보여준다. */
  category: string;
  kind: LibraryItemKind;
  createdAt: string;

  // kind === 'furniture'
  shape?: FurnitureShape;
  width?: number;
  height?: number;
  armThicknessMm?: number;
  color?: string;

  // kind === 'polygon' — 중심(centroid)을 원점(0,0)으로 정규화한 상대 좌표
  points?: Point[];

  /** 배치할 때 기본으로 적용할 회전값(도). 가구는 원본 rotationDeg, 다각형은 0. */
  defaultRotationDeg: number;
  memo?: string;
}
