// Cloudflare Pages Functions에서 공용으로 쓰는 작은 헬퍼들.
// D1 타입 패키지를 새로 설치하지 않고(devDependency 추가 최소화), 런타임에서
// env.DB로 넘어오는 D1Database 바인딩을 최소한의 타입으로만 다룬다.
export interface Env {
  DB: D1DatabaseLike;
}

export interface D1DatabaseLike {
  prepare(query: string): D1PreparedStatementLike;
  batch(statements: D1PreparedStatementLike[]): Promise<unknown[]>;
}

export interface D1PreparedStatementLike {
  bind(...values: unknown[]): D1PreparedStatementLike;
  all<T = unknown>(): Promise<{ results: T[] }>;
  first<T = unknown>(): Promise<T | null>;
  run(): Promise<unknown>;
}

export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export function errorResponse(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function newId(): string {
  return crypto.randomUUID();
}
