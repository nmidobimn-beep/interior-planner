/** 공용 가구 라이브러리(Cloudflare D1) 항목 — 어떤 도면에도 속하지 않는 실제 보유 가구 원본. */
export interface CloudFurnitureItem {
  id: string;
  name: string;
  color: string | null;
  width: number;
  height: number;
  shape_type: string;
  /** 'lshape'(ㄱ자형) 전용 — ㄱ자 팔의 두께(mm). 다른 도형은 null. */
  arm_thickness: number | null;
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
  arm_thickness?: number;
  memo?: string;
}
