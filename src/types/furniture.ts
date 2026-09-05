export type FurnitureShape = 'rectangle' | 'circle' | 'lshape';

/**
 * 가구 데이터. x/y는 도형의 중심 좌표(mm) — 회전이 중심 기준으로 이뤄지므로
 * 좌상단이 아닌 중심점을 기준으로 저장한다.
 */
export interface Furniture {
  id: string;
  shape: FurnitureShape;
  name: string;
  x: number;
  y: number;
  /** 가로 (mm). 'circle'은 지름으로 사용(가로=세로). */
  width: number;
  /** 세로 (mm). 'circle'은 지름으로 사용(가로=세로). */
  height: number;
  /** 자유 회전 각도 (도, 0~360) */
  rotationDeg: number;
  /** 'lshape' 전용: ㄱ자 팔의 두께(mm) */
  armThicknessMm?: number;
  /** 채우기/선 색상 (hex, 예: '#2f9e6f') */
  color: string;
  memo?: string;
  layerId: string;
}
