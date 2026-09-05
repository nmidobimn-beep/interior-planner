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
 * 실제 아파트 한 채(C타입 3Bay 판상형: 거실·안방·작은방 2개·주방/식당·욕실 2개·드레스룸·
 * 발코니 3개)를 본떠 만든 벽/문/창문/방 이름 라벨이며, 실제 편집 데이터를 그릴 때 쓰는
 * 렌더링 함수(drawWalls/drawDoors/drawWindows/drawLabels)를 그대로 재사용해 그린다 —
 * 완성된 도면이 실제로 어떤 모습인지 처음 열자마자 바로 감을 잡을 수 있게 하기 위함이다.
 * 여기 쓰인 layerId는 예시 전용 값이며 실제 레이어 시스템/편집 상태와는 전혀 무관하다.
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
const wH1 = wall(0, 0, 12200, 0, EXT_THICKNESS_MM); // 상단 외벽
const wH2 = wall(0, 850, 1700, 850, INT_THICKNESS_MM); // 발코니1 / 욕실A 경계
const wH3 = wall(8800, 1900, 12200, 1900, INT_THICKNESS_MM); // 마스터 / (욕실B·드레스룸) 경계
const wH4 = wall(0, 3000, 1700, 3000, INT_THICKNESS_MM); // 욕실A / 복도 경계
const wH6 = wall(5100, 3000, 8800, 3000, INT_THICKNESS_MM); // 현관 / 거실 경계
const wH7 = wall(0, 3700, 2400, 3700, INT_THICKNESS_MM); // 복도 / 침실3 경계
const wH8 = wall(2400, 3700, 5100, 3700, INT_THICKNESS_MM); // 복도 / 침실2 경계 (문 없음)
const wH9 = wall(0, 6700, 8800, 6700, EXT_THICKNESS_MM); // 하단 외벽 (침실3+침실2+거실)
const wH10 = wall(8800, 5300, 12200, 5300, INT_THICKNESS_MM); // 마스터 / 발코니3 경계
const wH11 = wall(8800, 6300, 12200, 6300, EXT_THICKNESS_MM); // 발코니3 하단 외벽

const wV1 = wall(0, 0, 0, 6700, EXT_THICKNESS_MM); // 좌측 외벽
const wV2 = wall(1700, 0, 1700, 3000, INT_THICKNESS_MM); // (발코니1+욕실A) / 주방식당 경계
const wV4 = wall(2400, 3700, 2400, 6700, INT_THICKNESS_MM); // 침실3 / 침실2 경계 (문 없음)
const wV5 = wall(5100, 3700, 5100, 6700, INT_THICKNESS_MM); // 침실2 / 거실 경계
const wVx = wall(8800, 0, 8800, 5300, INT_THICKNESS_MM); // 현관·욕실B / 현관·마스터 / 거실·마스터 경계
const wV9 = wall(8800, 5300, 8800, 6300, INT_THICKNESS_MM); // 거실 / 발코니3 경계 (문 없음)
const wV10 = wall(8800, 6300, 8800, 6700, EXT_THICKNESS_MM); // 우측 하단 외벽 계단 구간
const wV11 = wall(10000, 0, 10000, 1900, INT_THICKNESS_MM); // 욕실B / 드레스룸 경계 (문 없음)
const wV12 = wall(11200, 0, 11200, 1900, INT_THICKNESS_MM); // 드레스룸 / 발코니2 경계
const wV13 = wall(12200, 0, 12200, 6300, EXT_THICKNESS_MM); // 우측 외벽

const DEMO_WALLS: Wall[] = [
  wH1, wH2, wH3, wH4, wH6, wH7, wH8, wH9, wH10, wH11,
  wV1, wV2, wV4, wV5, wVx, wV9, wV10, wV11, wV12, wV13,
];

// --- 문 ---
const DEMO_DOORS: Door[] = [
  door(wV2.id, 75, 700), // 발코니1 <-> 주방식당
  door(wH4.id, 450, 800), // 욕실A <-> 복도
  door(wH6.id, 1250, 1200), // 현관 <-> 거실
  door(wVx.id, 2050, 800), // 현관 <-> 마스터
  door(wVx.id, 3700, 900), // 거실 <-> 마스터
  door(wH3.id, 200, 800), // 마스터 <-> 욕실B
  door(wH3.id, 1350, 900), // 마스터 <-> 드레스룸
  door(wV12.id, 550, 800), // 드레스룸 <-> 발코니2
  door(wH10.id, 1100, 1200), // 마스터 <-> 발코니3
  door(wH7.id, 750, 900), // 복도 <-> 침실3
  door(wV5.id, 1050, 900), // 침실2 <-> 거실
  door(wH1.id, 6050, 900), // 세대 현관 출입문
];

// --- 창문 ---
const DEMO_WINDOWS: WindowOpening[] = [
  win(wH1.id, 400, 900), // 발코니1
  win(wH1.id, 2250, 1500), // 주방식당
  win(wH1.id, 9100, 600), // 욕실B
  win(wH1.id, 11250, 900), // 발코니2
  win(wH9.id, 600, 1200), // 침실3
  win(wH9.id, 3000, 1500), // 침실2
  win(wH9.id, 5450, 3000), // 거실 (통창)
  win(wV13.id, 2850, 1500), // 마스터 침실
];

// --- 방 이름 라벨 ---
const DEMO_LABELS: TextLabel[] = [
  label(850, 425, '발코니1'),
  label(850, 1925, '욕실A'),
  label(3000, 1500, '주방/식당'),
  label(6550, 1500, '현관'),
  label(9400, 950, '욕실B'),
  label(10600, 950, '드레스룸'),
  label(11700, 950, '발코니2'),
  label(1200, 5200, '침실3'),
  label(3750, 5200, '침실2'),
  label(6950, 4850, '거실'),
  label(10500, 3600, '안방(마스터)'),
  label(10500, 5800, '발코니3'),
];

const DEMO_MARGIN_MM = 500;
export const DEMO_BOUNDS: Bounds = {
  minX: -DEMO_MARGIN_MM,
  minY: -DEMO_MARGIN_MM,
  maxX: 12200 + DEMO_MARGIN_MM,
  maxY: 6700 + DEMO_MARGIN_MM,
};

export function drawDemoScene(ctx: CanvasRenderingContext2D, viewport: Viewport) {
  drawWalls(ctx, viewport, DEMO_WALLS, null);
  drawDoors(ctx, viewport, DEMO_DOORS, DEMO_WALLS, null);
  drawWindows(ctx, viewport, DEMO_WINDOWS, DEMO_WALLS, null);
  drawLabels(ctx, viewport, DEMO_LABELS, null);
}
