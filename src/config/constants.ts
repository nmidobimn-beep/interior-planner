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

export const COLORS = {
  background: '#f5f6f8',
  gridMinor: '#e4e6eb',
  gridMajor: '#c7cbd4',
  axisX: '#e0554f',
  axisY: '#3a7bd5',
  rulerBackground: '#ffffff',
  rulerBorder: '#d6d9e0',
  rulerText: '#5b6270',
  roomStroke: '#8a8f9c',
  roomFill: 'rgba(138, 143, 156, 0.06)',
  furnitureStroke: '#2f6fed',
  furnitureFill: 'rgba(47, 111, 237, 0.12)',
  furnitureText: '#1f2937',
} as const;
