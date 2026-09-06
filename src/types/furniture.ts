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
  /** 공용 가구 라이브러리(Cloudflare D1)에서 배치했다면 그 원본 id — 배치 이후 이동/회전/
   * 크기 변경은 이 객체에만 반영되고 라이브러리 원본은 절대 바뀌지 않는다. */
  libraryId?: string;
}
