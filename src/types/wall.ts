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
}
