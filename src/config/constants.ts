/**
 * 매직 넘버를 코드 곳곳에 흩어놓지 않기 위한 중앙 설정.
 * 이후 사용자 설정(예: 기본 줌 배율)으로 옮길 값들도 우선 여기서 관리한다.
 */

/** 화면 px / 실제 mm. 1이면 1mm = 1px. */
export const MIN_SCALE = 0.02; // 10m가 화면에 약 200px로 보이는 최소 축소
export const MAX_SCALE = 5; // 1m가 화면에 5000px로 보이는 최대 확대

/** 마우스 휠 한 스텝당 확대/축소 배율 */
export const WHEEL_ZOOM_FACTOR = 1.1;

/** 버튼 클릭 확대/축소 배율 */
export const BUTTON_ZOOM_FACTOR = 1.25;

/** 전체보기(Fit) 시 캔버스 가장자리에 남길 여백(px) */
export const FIT_PADDING_PX = 56;

/** 눈금자(ruler) 바의 두께(px) */
export const RULER_THICKNESS_PX = 28;

/** 격자선 간 최소 픽셀 간격 (이보다 좁아지면 한 단계 큰 간격으로 전환) */
export const MIN_GRID_PIXEL_SPACING = 48;

/** "보기 좋은" 격자 간격 후보 (mm, 1-2-5 규칙) */
export const GRID_NICE_STEPS_MM = [
  1, 2, 5, 10, 20, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 100000,
];

/** 초기 뷰포트 축척: 1mm = 0.1px (즉 1:10 비율로 시작) */
export const INITIAL_SCALE = 0.1;

/** 새 벽을 그릴 때 사용할 기본 두께 (mm). 일반적인 실내 벽 두께 기준. */
export const DEFAULT_WALL_THICKNESS_MM = 120;
export const MIN_WALL_THICKNESS_MM = 10;
export const MAX_WALL_THICKNESS_MM = 500;

/** 벽 선택 시 끝점 손잡이(handle)의 화면 반지름(px) */
export const WALL_ENDPOINT_HANDLE_RADIUS_PX = 6;
/** 벽 본체를 클릭으로 선택하기 위한 여유 허용치(px, 두께에 더해짐) */
export const WALL_HIT_TOLERANCE_PX = 6;

/** --- 스냅 설정 --- */
/** 기존 벽 끝점에 붙는 스냅의 허용 반경(px). 우선순위 1위. */
export const SNAP_ENDPOINT_RADIUS_PX = 14;
/** 각도 스냅 후보 (도). 가구 회전 스냅과 동일한 각도 체계를 사용한다. */
export const SNAP_ANGLE_STEPS_DEG = [0, 45, 90, 135, 180, 225, 270, 315];
/** 각도 스냅이 걸리는 허용오차(도). 이보다 벗어나면 자유 각도로 그린다. */
export const SNAP_ANGLE_TOLERANCE_DEG = 4;
/** 격자 스냅 간격 (mm). 우선순위 3위(최후 수단). */
export const SNAP_GRID_MM = 50;

/** 이보다 짧은 벽은 생성하지 않는다 (같은 자리 실수 클릭 방지). */
export const MIN_WALL_LENGTH_MM = 50;

/** --- 가구 기본값 --- */
export const MIN_FURNITURE_SIZE_MM = 50;
export const MAX_FURNITURE_SIZE_MM = 10000;
export const DEFAULT_ARM_THICKNESS_MM = 500;

/** 도구별로 새로 놓을 가구의 기본 크기 (mm) */
export const DEFAULT_FURNITURE_SIZE: Record<'rectangle' | 'circle' | 'lshape', { width: number; height: number }> = {
  rectangle: { width: 800, height: 400 },
  circle: { width: 800, height: 800 },
  lshape: { width: 1800, height: 1800 },
};

/** 회전 손잡이가 도형 위쪽으로 떨어진 거리 (mm) */
export const ROTATION_HANDLE_OFFSET_MM = 300;
/** 회전/이동 손잡이의 화면 히트 반지름(px) */
export const FURNITURE_HANDLE_RADIUS_PX = 7;

export const COLORS = {
  background: '#f5f6f8',
  gridMinor: '#e4e6eb',
  gridMajor: '#c7cbd4',
  axisX: '#e0554f',
  axisY: '#3a7bd5',
  rulerBackground: '#ffffff',
  rulerBorder: '#d6d9e0',
  rulerText: '#5b6270',

  demoRoomStroke: '#8a8f9c',
  demoRoomFill: 'rgba(138, 143, 156, 0.06)',
  demoFurnitureStroke: '#2f6fed',
  demoFurnitureFill: 'rgba(47, 111, 237, 0.12)',
  demoFurnitureText: '#1f2937',

  wallFill: '#5b6270',
  wallStroke: '#3d4149',
  wallSelectedFill: '#2f6fed',
  wallSelectedStroke: '#1d4fc4',
  wallHandle: '#ffffff',
  wallHandleStroke: '#1d4fc4',
  wallPreview: 'rgba(47, 111, 237, 0.55)',
  wallLengthLabel: '#1f2937',

  furnitureFill: 'rgba(47, 158, 111, 0.18)',
  furnitureStroke: '#2f9e6f',
  furnitureSelectedFill: 'rgba(47, 111, 237, 0.18)',
  furnitureSelectedStroke: '#1d4fc4',
  furnitureText: '#1f2937',
  furnitureHandle: '#ffffff',
  furnitureHandleStroke: '#1d4fc4',
  furnitureRotateLine: '#1d4fc4',

  snapEndpoint: '#e0554f',
  snapAngle: '#e08a2f',
  snapGrid: '#767c88',
} as const;
