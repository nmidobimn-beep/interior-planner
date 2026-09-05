import type { Bounds } from '../types/geometry';
import type { Wall } from '../types/wall';
import type { Door, WindowOpening } from '../types/opening';
import type { TextLabel } from '../types/label';
import { drawWalls } from './renderWalls';
import { drawDoors, drawWindows } from './renderOpenings';
import { drawLabels } from './renderLabel';
import type { Viewport } from './viewport';

/**
 * "예시 표시" 체크박스를 켰을 때 보여주는 예제 도면.
 * 사용자가 제공한 실제 아파트 평면도 이미지(C타입 3Bay 판상형)를 픽셀 단위로 직접 분석해
 * 방 배치·문 위치·통로 구조를 옮겨 그린 것이다(치수는 사용자가 알려준 대략적인 범위 사용).
 * 실제 편집 데이터를 그릴 때 쓰는 렌더링 함수(drawWalls/drawDoors/drawWindows/drawLabels)를
 * 그대로 재사용해 그린다. 여기 쓰인 layerId는 예시 전용 값이며 실제 레이어 시스템/편집
 * 상태와는 전혀 무관하다.
 *
 * 원본 이미지에서 확인한 핵심 구조 (이전 버전에서 틀렸던 부분들):
 * - 왼쪽은 위→아래로 갈수록 건물이 더 넓어지는 3단 계단식 외곽선이다
 *   (발코니1·욕실A 열이 가장 안쪽/좁고, 현관이 한 단 더 밖으로, 침실 열이 가장 바깥쪽).
 * - 현관과 욕실A 사이, 현관 위쪽은 건물 바깥(공용 계단실로 추정)이라 벽을 그리지 않는다.
 * - 발코니는 2개뿐이다(발코니1, 안방 발코니) — 드레스룸 옆 발코니는 없음.
 * - 욕실A는 현관이 아니라 거실 쪽으로 문이 나 있다. 현관은 거실과 벽 없이 바로 이어진다.
 * - 주방/식당도 거실과 벽 없이 열려 있다(오픈플랜).
 * - 안방은 거실과 딱 한 곳(스핀 월의 문 하나)으로만 연결된다 — 현관 쪽 별도 문은 없다.
 * - 드레스룸은 문 없이 안방에 바로 열려 있다(붙박이 드레스룸).
 * - 두 작은방은 모두 "위쪽"(복도) 벽에 문이 있다 — 거실 쪽 벽은 막혀 있다.
 */
const DEMO_LAYER_ID = 'demo-layer';
const EXT_THICKNESS_MM = 150;
const INT_THICKNESS_MM = 100;

let wallSeq = 0;
let doorSeq = 0;
let windowSeq = 0;
let labelSeq = 0;

function wall(x1: number, y1: number, x2: number, y2: number, thicknessMm: number): Wall {
  return { id: `demo-wall-${++wallSeq}`, start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thicknessMm, layerId: DEMO_LAYER_ID };
}
function door(wallId: string, offsetMm: number, widthMm: number): Door {
  return {
    id: `demo-door-${++doorSeq}`,
    wallId,
    offsetMm,
    widthMm,
    hingeSide: 'start',
    swingDirection: 'in',
    layerId: DEMO_LAYER_ID,
  };
}
function win(wallId: string, offsetMm: number, widthMm: number): WindowOpening {
  return { id: `demo-window-${++windowSeq}`, wallId, offsetMm, widthMm, layerId: DEMO_LAYER_ID };
}
function label(x: number, y: number, text: string): TextLabel {
  return { id: `demo-label-${++labelSeq}`, x, y, text, layerId: DEMO_LAYER_ID };
}

// --- 벽 ---
const wH1 = wall(4600, 0, 12200, 0, EXT_THICKNESS_MM); // 상단 외벽 (발코니1+주방식당+욕실B+드레스룸 구간만 — 그 서쪽은 건물 밖)
const wH2 = wall(4600, 900, 6300, 900, INT_THICKNESS_MM); // 발코니1 / 욕실A 경계
const wH3 = wall(8800, 1900, 10200, 1900, INT_THICKNESS_MM); // 안방 / 욕실B 경계 (문 있음, 드레스룸 쪽은 벽 없이 열림)
const wH4 = wall(1600, 1200, 3200, 1200, EXT_THICKNESS_MM); // 세대 현관문이 달린 외벽 (계단실 쪽으로 튀어나온 부분)
const wH5 = wall(0, 3000, 1600, 3000, EXT_THICKNESS_MM); // 복도 서쪽 끝의 외벽 (그 위쪽은 공용 계단실로 비워둠)
const wH6 = wall(4600, 3000, 6300, 3000, INT_THICKNESS_MM); // 욕실A / 거실 경계 (문 있음)
const wH7 = wall(0, 3700, 2700, 3700, INT_THICKNESS_MM); // 복도 / 작은방1 경계 (문 있음)
const wH8 = wall(2700, 3700, 5100, 3700, INT_THICKNESS_MM); // 복도 / 작은방2 경계 (문 있음)
const wH9 = wall(0, 6700, 8800, 6700, EXT_THICKNESS_MM); // 하단 외벽 (작은방1+작은방2+거실)
const wH10 = wall(8800, 5300, 12200, 5300, INT_THICKNESS_MM); // 안방 / 안방 발코니 경계 (문 있음)
const wH11 = wall(8800, 6300, 12200, 6300, EXT_THICKNESS_MM); // 안방 발코니 하단 외벽

const wV1 = wall(0, 3000, 0, 6700, EXT_THICKNESS_MM); // 좌측 외벽 (복도 서쪽 끝 + 작은방1)
const wV2 = wall(1600, 1200, 1600, 3000, EXT_THICKNESS_MM); // 현관 서쪽 외벽
const wV3 = wall(3200, 1200, 3200, 3000, INT_THICKNESS_MM); // 현관 동쪽 벽 (문 없음 — 현관은 남쪽으로만 거실에 열림)
const wV4 = wall(4600, 0, 4600, 3000, EXT_THICKNESS_MM); // 발코니1+욕실A 서쪽 외벽
const wV5 = wall(6300, 0, 6300, 900, INT_THICKNESS_MM); // 발코니1 / 주방식당 경계 (문 있음)
const wV6 = wall(2700, 3700, 2700, 6700, INT_THICKNESS_MM); // 작은방1 / 작은방2 경계 (문 없음)
const wV7 = wall(5100, 3700, 5100, 6700, INT_THICKNESS_MM); // 작은방2 / 거실 경계 (문 없음)
const wV8 = wall(8800, 0, 8800, 5300, INT_THICKNESS_MM); // 스핀 월: 주방·거실 / 욕실B·안방 경계 (거실-안방 문 하나만 있음)
const wV9 = wall(8800, 5300, 8800, 6300, INT_THICKNESS_MM); // 거실 / 안방 발코니 경계 (문 없음 — 서로 안 이어짐)
const wV10 = wall(8800, 6300, 8800, 6700, EXT_THICKNESS_MM); // 우측 하단 외벽 계단 구간
const wV11 = wall(10200, 0, 10200, 1900, INT_THICKNESS_MM); // 욕실B / 드레스룸 경계 (문 없음)
const wV12 = wall(12200, 0, 12200, 6300, EXT_THICKNESS_MM); // 우측 외벽

const DEMO_WALLS: Wall[] = [
  wH1, wH2, wH3, wH4, wH5, wH6, wH7, wH8, wH9, wH10, wH11,
  wV1, wV2, wV3, wV4, wV5, wV6, wV7, wV8, wV9, wV10, wV11, wV12,
];

// --- 문 ---
const DEMO_DOORS: Door[] = [
  door(wV5.id, 100, 700), // 발코니1 <-> 주방식당
  door(wH6.id, 700, 800), // 욕실A <-> 거실
  door(wH7.id, 750, 900), // 복도 <-> 작은방1
  door(wH8.id, 600, 900), // 복도 <-> 작은방2
  door(wV8.id, 3550, 900), // 거실 <-> 안방 (스핀 월에서 유일한 연결)
  door(wH3.id, 300, 800), // 안방 <-> 욕실B
  door(wH10.id, 1100, 1200), // 안방 <-> 안방 발코니
  door(wH4.id, 350, 900), // 세대 현관 출입문
];

// --- 창문 ---
const DEMO_WINDOWS: WindowOpening[] = [
  win(wH1.id, 400, 900), // 발코니1
  win(wH1.id, 2200, 1500), // 주방식당
  win(wH1.id, 4600, 600), // 욕실B
  win(wH1.id, 6150, 900), // 드레스룸
  win(wH9.id, 600, 1200), // 작은방1
  win(wH9.id, 3000, 1500), // 작은방2
  win(wH9.id, 5450, 3000), // 거실 (통창)
  win(wV12.id, 2850, 1500), // 안방
  win(wH11.id, 1100, 1200), // 안방 발코니
];

// --- 방 이름 라벨 ---
const DEMO_LABELS: TextLabel[] = [
  label(5450, 450, '발코니1'),
  label(5450, 1950, '욕실A'),
  label(7550, 1500, '주방/식당'),
  label(2400, 2100, '현관'),
  label(9500, 950, '욕실B'),
  label(11200, 950, '드레스룸'),
  label(1350, 5200, '작은방1'),
  label(3900, 5200, '작은방2'),
  label(6950, 4850, '거실'),
  label(10500, 3600, '안방'),
  label(10500, 5800, '안방 발코니'),
];

const DEMO_MARGIN_MM = 500;
export const DEMO_BOUNDS: Bounds = {
  minX: -DEMO_MARGIN_MM,
  minY: -DEMO_MARGIN_MM,
  maxX: 12200 + DEMO_MARGIN_MM,
  maxY: 6700 + DEMO_MARGIN_MM,
};

const NO_SELECTION = new Set<string>();

export function drawDemoScene(ctx: CanvasRenderingContext2D, viewport: Viewport) {
  drawWalls(ctx, viewport, DEMO_WALLS, null);
  drawDoors(ctx, viewport, DEMO_DOORS, DEMO_WALLS, null);
  drawWindows(ctx, viewport, DEMO_WINDOWS, DEMO_WALLS, null);
  drawLabels(ctx, viewport, DEMO_LABELS, NO_SELECTION);
}
