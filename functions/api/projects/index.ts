import { errorResponse, json, newId, type Env } from '../_utils';

/** 도면 프로젝트 목록 — plan_data(용량 큰 도면 JSON)는 목록에서는 제외한다. */
export async function onRequestGet(context: { env: Env }) {
  const { results } = await context.env.DB.prepare(
    'SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC',
  ).all();
  return json(results);
}

/** 새 도면 프로젝트 생성 — 항상 빈 도면(plan_data='{}')으로 시작한다. */
export async function onRequestPost(context: { request: Request; env: Env }) {
  const body = (await context.request.json().catch(() => null)) as { name?: string } | null;
  const name = body?.name?.trim();
  if (!name) return errorResponse('name is required');

  const id = newId();
  await context.env.DB.prepare('INSERT INTO projects (id, name, plan_data) VALUES (?, ?, ?)').bind(id, name, '{}').run();
  const project = await context.env.DB.prepare('SELECT id, name, created_at, updated_at FROM projects WHERE id = ?').bind(id).first();
  return json(project, 201);
}
