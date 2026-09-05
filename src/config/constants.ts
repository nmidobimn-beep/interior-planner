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

/**
 * 벽을 그릴 때(체인 드로잉) 길이를 이 단위의 배수로 딱 떨어지게 스냅한다.
 * 각도(자유/45도 스냅 등)는 그대로 두고 거리만 반올림 — 다른 벽 끝점에 붙는 스냅이
 * 최우선이며, 그 경우가 아닐 때만 적용된다. 사용자가 100mm~1000mm(1m) 사이에서 설정 가능.
 */
export const MIN_WALL_LENGTH_SNAP_MM = 100;
export const MAX_WALL_LENGTH_SNAP_MM = 1000;
export const DEFAULT_WALL_LENGTH_SNAP_MM = 100;

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

/** 새 가구의 기본 색상 (hex). 사용자가 속성 패널에서 도형별로 자유롭게 바꿀 수 있다. */
export const DEFAULT_FURNITURE_COLOR = '#2f9e6f';

/** --- 문/창문 기본값 --- */
export const DEFAULT_DOOR_WIDTH_MM = 900;
export const DEFAULT_WINDOW_WIDTH_MM = 1200;
export const MIN_OPENING_WIDTH_MM = 300;
export const MAX_OPENING_WIDTH_MM = 3000;
/** 문/창문을 벽으로 인식하는 클릭 허용치(px, 두께에 더해짐) */
export const OPENING_WALL_HIT_TOLERANCE_PX = 10;
/** 문/창문 선택 손잡이(끝점)의 화면 히트 반지름(px) */
export const OPENING_HANDLE_RADIUS_PX = 6;

/** --- 콘센트 기본값 --- */
export const DEFAULT_OUTLET_COUNT = 1;
export const MIN_OUTLET_COUNT = 1;
export const MAX_OUTLET_COUNT = 8;
/** 콘센트 아이콘의 화면 반지름(px) — 확대/축소와 무관하게 항상 일정한 크기로 표시 */
export const OUTLET_ICON_RADIUS_PX = 9;

/** --- 동선 기본값 --- */
export const PATH_HIT_TOLERANCE_PX = 8;
export const PATH_ENDPOINT_HANDLE_RADIUS_PX = 6;
export const ARROW_HEAD_LENGTH_MM = 220;
export const ARROW_HEAD_WIDTH_MM = 160;
/** 이보다 짧은 동선은 생성하지 않는다 (같은 자리 실수 클릭 방지). */
export const MIN_PATH_LENGTH_MM = 100;
/** 곡선 동선을 새로 만들 때 시작-끝 중점에서 수직으로 밀어두는 기본 제어점 오프셋 비율(선 길이 대비) */
export const DEFAULT_CURVE_OFFSET_RATIO = 0.25;
/** 곡선 조절점 손잡이의 화면 히트 반지름(px) */
export const CURVE_CONTROL_HANDLE_RADIUS_PX = 7;
/** 곡선을 선분들로 근사해 히트테스트/경계를 계산할 때 나눌 구간 수 */
export const CURVE_SAMPLE_SEGMENTS = 24;

/** --- 텍스트 라벨 기본값 --- */
export const DEFAULT_LABEL_TEXT = '텍스트';
/** 라벨 글자 크기(px) — 확대/축소와 무관하게 항상 읽기 좋은 크기로 표시(가구 이름표와 동일한 방식) */
export const LABEL_FONT_SIZE_PX = 14;
/** 라벨을 클릭으로 선택하기 위한 히트 반지름(px, 대략 텍스트 한 줄 높이) */
export const LABEL_HIT_RADIUS_PX = 40;

/** --- 자유 다각형 기본값 --- */
export const DEFAULT_POLYGON_NAME = '다각형';
export const DEFAULT_POLYGON_COLOR = '#d6862f';
/** 다각형을 완성하려면 최소 이만큼의 꼭짓점이 필요하다(삼각형 이상). */
export const MIN_POLYGON_VERTICES = 3;
/** 그리는 중 첫 꼭짓점 근처를 다시 클릭하면 도형을 닫는다(이 거리 이내, px). */
export const POLYGON_CLOSE_HIT_RADIUS_PX = 10;
/** 다각형 선택 시 꼭짓점 손잡이의 화면 히트 반지름(px) */
export const POLYGON_VERTEX_HANDLE_RADIUS_PX = 6;
/** 다각형 본체를 클릭으로 선택하기 위한 테두리 근처 허용치(px) — 내부 클릭은 항상 선택됨 */
export const POLYGON_EDGE_HIT_TOLERANCE_PX = 6;

/** --- 스냅 대상 종류 (CAD처럼 개별로 켜고 끌 수 있음) --- */
export interface SnapCategoryFlags {
  endpoint: boolean;
  center: boolean;
  corner: boolean;
}
export const DEFAULT_SNAP_CATEGORIES: SnapCategoryFlags = { endpoint: true, center: true, corner: true };

/** --- 다중 선택 --- */
/** 다중 선택된 객체들을 감싸는 바운딩 박스가 개별 객체 테두리와 겹치지 않도록 두는 여백(mm) */
export const MULTI_SELECT_BOUNDS_PADDING_MM = 80;
/** 영역 드래그 선택 중, 클릭인지 실제 드래그인지 구분하는 최소 이동 거리(px) */
export const BOX_SELECT_MIN_DRAG_PX = 4;

export const COLORS = {
  background: '#f5f6f8',
  gridMinor: '#e4e6eb',
  gridMajor: '#c7cbd4',
  axisX: '#e0554f',
  axisY: '#3a7bd5',
  rulerBackground: '#ffffff',
  rulerBorder: '#d6d9e0',
  rulerText: '#5b6270',

  wallFill: '#5b6270',
  wallStroke: '#3d4149',
  wallSelectedFill: '#2f6fed',
  wallSelectedStroke: '#1d4fc4',
  wallHandle: '#ffffff',
  wallHandleStroke: '#1d4fc4',
  wallPreview: 'rgba(47, 111, 237, 0.55)',
  wallLengthLabel: '#1f2937',

  furnitureSelectedFill: 'rgba(47, 111, 237, 0.18)',
  furnitureSelectedStroke: '#1d4fc4',
  furnitureText: '#1f2937',
  furnitureHandle: '#ffffff',
  furnitureHandleStroke: '#1d4fc4',
  furnitureRotateLine: '#1d4fc4',

  snapEndpoint: '#e0554f',
  snapAngle: '#e08a2f',
  snapGrid: '#767c88',

  doorLeaf: '#b8672f',
  doorSelected: '#1d4fc4',
  windowFill: '#bfe0f5',
  windowGlass: '#3a7bd5',
  windowSelected: '#1d4fc4',
  outletFill: '#ffffff',
  outletStroke: '#4a4f58',
  outletSelected: '#1d4fc4',
  outletText: '#1f2937',

  path: '#9a4fd6',
  pathSelected: '#1d4fc4',
  pathHandle: '#ffffff',
  pathControlHandle: '#9a4fd6',
  pathControlLine: 'rgba(154, 79, 214, 0.5)',

  labelText: '#1f2937',
  labelSelectedText: '#1d4fc4',
  labelSelectedBox: '#1d4fc4',

  multiSelectBounds: '#e0872f',
  multiSelectFill: 'rgba(224, 135, 47, 0.35)',
  marqueeFill: 'rgba(47, 111, 237, 0.10)',
  marqueeStroke: 'rgba(47, 111, 237, 0.7)',

  polygonSelectedFill: 'rgba(47, 111, 237, 0.18)',
  polygonSelectedStroke: '#1d4fc4',
  polygonText: '#1f2937',
  polygonHandle: '#ffffff',
  polygonHandleStroke: '#1d4fc4',
  polygonPreview: 'rgba(214, 134, 47, 0.35)',
} as const;
