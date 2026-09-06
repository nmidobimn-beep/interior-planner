import { errorResponse, json, newId, type Env } from '../_utils';

/** 공용 가구 라이브러리 목록. ?q= 로 이름 검색 가능. */
export async function onRequestGet(context: { request: Request; env: Env }) {
  const url = new URL(context.request.url);
  const q = url.searchParams.get('q')?.trim();

  const stmt = q
    ? context.env.DB.prepare('SELECT * FROM furniture_library WHERE name LIKE ? ORDER BY updated_at DESC').bind(`%${q}%`)
    : context.env.DB.prepare('SELECT * FROM furniture_library ORDER BY updated_at DESC');
  const { results } = await stmt.all();
  return json(results);
}

/** 새 가구를 라이브러리에 등록(모바일 실측 등록 포함). project_id는 절대 받지 않는다 — 공용 데이터. */
export async function onRequestPost(context: { request: Request; env: Env }) {
  const body = (await context.request.json().catch(() => null)) as
    | { name?: string; color?: string; width?: number; height?: number; shape_type?: string; arm_thickness?: number; memo?: string }
    | null;
  if (!body?.name?.trim()) return errorResponse('name is required');
  if (!Number.isFinite(body.width) || !Number.isFinite(body.height)) return errorResponse('width/height are required');

  const id = newId();
  await context.env.DB.prepare(
    'INSERT INTO furniture_library (id, name, color, width, height, shape_type, arm_thickness, memo) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(
      id,
      body.name.trim(),
      body.color ?? null,
      body.width,
      body.height,
      body.shape_type ?? 'rectangle',
      body.arm_thickness ?? null,
      body.memo ?? null,
    )
    .run();

  const item = await context.env.DB.prepare('SELECT * FROM furniture_library WHERE id = ?').bind(id).first();
  return json(item, 201);
}
