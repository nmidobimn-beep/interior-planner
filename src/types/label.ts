/** 텍스트 라벨 — 방 이름 등을 도면 위에 직접 표시하는 간단한 텍스트 객체. */
export interface TextLabel {
  id: string;
  x: number;
  y: number;
  text: string;
  layerId: string;
}
