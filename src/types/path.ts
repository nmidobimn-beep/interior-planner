import type { Point } from './geometry';

/** 동선 — 사람의 이동 경로를 나타내는 선/화살표. 가구와는 별도의 객체로 관리한다. */
export interface Path {
  id: string;
  start: Point;
  end: Point;
  showArrow: boolean;
  memo?: string;
  layerId: string;
}
