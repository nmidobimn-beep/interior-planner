/** 도면 프로젝트 — 가구 라이브러리와 완전히 독립적으로 저장되는 도면 데이터. */
export interface ProjectSummary {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectDetail extends ProjectSummary {
  /** 가구를 제외한 나머지 도면 데이터(JSON 문자열). */
  plan_data: string;
}
