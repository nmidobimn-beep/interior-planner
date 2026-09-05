/** 콘센트 — 벽에 붙일 수도, 벽과 무관하게 원하는 위치에 둘 수도 있어 좌표는 항상 절대 mm로 저장한다. */
export interface Outlet {
  id: string;
  x: number;
  y: number;
  /** 콘센트 개수(구) */
  count: number;
  memo?: string;
}
