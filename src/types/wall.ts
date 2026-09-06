import type { Point } from './geometry';

/**
 * 벽 데이터.
 * start/end는 벽의 중심선(centerline) 좌표(mm)이며, 화면에는 thicknessMm만큼
 * 두께를 가진 사각형으로 그린다 (중심선 기준 좌우로 thicknessMm/2씩).
 */
export interface Wall {
  id: string;
  start: Point;
  end: Point;
  /** 벽 두께 (mm) */
  thicknessMm: number;
  layerId: string;
  /**
   * BL(벽 합치기) 명령으로 모서리에서 이어붙인 벽들이 공유하는 id. 실제 데이터는 여전히
   * 벽 여러 개로 남아있지만(문/창문·렌더링·클릭 판정 등 기존 벽 코드를 그대로 재사용하기 위함),
   * 같은 id를 가진 벽들은 하나를 클릭해도 전체가 선택되고 함께 이동해 모서리가 벌어지지 않는다.
   */
  mergeGroupId?: string;
}
