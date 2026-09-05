/** 레이어 순서는 배열 순서 자체로 관리한다 (별도 order 필드 없음). */
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
}
