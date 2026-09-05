/**
 * 이 프로그램의 모든 위치·크기 데이터는 화면 픽셀이 아니라 실제 밀리미터(mm) 단위로 저장한다.
 * 화면에 그릴 때만 core/viewport.ts 의 변환 함수를 통해 픽셀 좌표로 바꾼다.
 */

/** 실세계 mm 단위 좌표 (내부 데이터 기준) */
export interface Point {
  x: number;
  y: number;
}

/** mm 단위 크기 */
export interface Size {
  width: number;
  height: number;
}

/** 캔버스 화면(px) 좌표 */
export interface ScreenPoint {
  x: number;
  y: number;
}

/** mm 단위 사각 영역 (전체보기, 경계 계산 등에 사용) */
export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
