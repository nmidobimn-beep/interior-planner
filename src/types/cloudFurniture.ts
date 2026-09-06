/** 공용 가구 라이브러리(Cloudflare D1) 항목 — 어떤 도면에도 속하지 않는 실제 보유 가구 원본. */
export interface CloudFurnitureItem {
  id: string;
  name: string;
  color: string | null;
  width: number;
  height: number;
  shape_type: string;
  memo: string | null;
  created_at: string;
  updated_at: string;
}

export interface CloudFurnitureInput {
  name: string;
  color?: string;
  width: number;
  height: number;
  shape_type?: string;
  memo?: string;
}
