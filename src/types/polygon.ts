import type { Point } from './geometry';

/**
 * 자유 다각형 — 사각형/원형/ㄱ자형 외에 사용자가 원하는 형태를 표현하기 위한 도형.
 * 꼭짓점은 항상 실제 mm 좌표(절대 좌표)로 저장한다. 회전/이동은 각 점을 직접 옮기는
 * 방식으로 처리하므로(동선의 시작/끝점과 동일한 접근) 별도의 rotationDeg 필드는 두지 않는다.
 */
export interface Polygon {
  id: string;
  points: Point[];
  name: string;
  color: string;
  memo?: string;
  layerId: string;
}
