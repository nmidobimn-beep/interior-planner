/**
 * 문/창문은 벽에 종속된다 — wallId가 가리키는 벽의 중심선을 따라
 * offsetMm(벽 시작점부터 거리) ~ offsetMm+widthMm 구간에 위치한다.
 * 벽이 삭제되면 그 벽에 달린 문/창문도 함께 삭제된다.
 */
export type HingeSide = 'start' | 'end';
export type SwingDirection = 'in' | 'out';

export interface Door {
  id: string;
  wallId: string;
  offsetMm: number;
  widthMm: number;
  hingeSide: HingeSide;
  swingDirection: SwingDirection;
  layerId: string;
}

export interface WindowOpening {
  id: string;
  wallId: string;
  offsetMm: number;
  widthMm: number;
  memo?: string;
  layerId: string;
}
