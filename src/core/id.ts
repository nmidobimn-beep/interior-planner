/** 브라우저 crypto가 없는 환경(구형 브라우저 등)을 대비한 폴백 포함 ID 생성기. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}
