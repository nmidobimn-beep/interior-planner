import type { Point } from './geometry';

/**
 * 동선 — 사람의 이동 경로를 나타내는 선/화살표. 가구와는 별도의 객체로 관리한다.
 * curve가 true면 controlPoint(2차 베지어 제어점) 하나로 곡선을 그린다 — 시작점·끝점·제어점을
 * 각각 따로 드래그해 모양을 바꿀 수 있다.
 */
export interface Path {
  id: string;
  start: Point;
  end: Point;
  curve: boolean;
  controlPoint?: Point;
  showArrow: boolean;
  memo?: string;
  layerId: string;
}
