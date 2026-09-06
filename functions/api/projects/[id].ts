import { errorResponse, json, type Env } from '../_utils';

/** 프로젝트 하나 조회 — plan_data(도면 데이터)까지 전체를 돌려준다("불러오기"용). */
export async function onRequestGet(context: { params: { id: string }; env: Env }) {
  const row = await context.env.DB.prepare('SELECT * FROM projects WHERE id = ?').bind(context.params.id).first();
  if (!row) return errorResponse('project not found', 404);
  return json(row);
}

/** 이름 변경 및/또는 도면 데이터 저장("저장하기"용, 둘 다 선택적으로 받는다). */
export async function onRequestPut(context: { request: Request; params: { id: string }; env: Env }) {
  const body = (await context.request.json().catch(() => null)) as { name?: string; plan_data?: unknown } | null;
  if (!body) return errorResponse('invalid body');

  const sets: string[] = [];
  const values: unknown[] = [];
  if (typeof body.name === 'string' && body.name.trim()) {
    sets.push('name = ?');
    values.push(body.name.trim());
  }
  if (body.plan_data !== undefined) {
    sets.push('plan_data = ?');
    values.push(JSON.stringify(body.plan_data));
  }
  if (sets.length === 0) return errorResponse('nothing to update');

  sets.push("updated_at = datetime('now')");
  values.push(context.params.id);
  await context.env.DB.prepare(`UPDATE projects SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  const row = await context.env.DB.prepare('SELECT id, name, created_at, updated_at FROM projects WHERE id = ?').bind(context.params.id).first();
  if (!row) return errorResponse('project not found', 404);
  return json(row);
}

/** 프로젝트 삭제 — 이 프로젝트에 배치된 객체(project_objects)만 함께 지운다.
 * furniture_library(가구 원본)는 절대 건드리지 않는다. */
export async function onRequestDelete(context: { params: { id: string }; env: Env }) {
  await context.env.DB.batch([
    context.env.DB.prepare('DELETE FROM project_objects WHERE project_id = ?').bind(context.params.id),
    context.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(context.params.id),
  ]);
  return json({ ok: true });
}
