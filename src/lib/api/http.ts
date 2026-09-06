/** 공용 fetch 래퍼 — Cloudflare Pages Functions(/api/*)는 같은 오리진이라 CORS 설정이 필요 없다. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error((body as { error?: string } | null)?.error ?? `요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}
