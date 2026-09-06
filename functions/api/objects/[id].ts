import { errorResponse, json, type Env } from '../_utils';

/** 배치 객체 하나 수정(이동/회전 등). */
export async function onRequestPut(context: { request: Request; params: { id: string }; env: Env }) {
  const body = (await context.request.json().catch(() => null)) as
    | { x?: number; y?: number; rotation?: number; layer_id?: string; object_data?: unknown }
    | null;
  if (!body) return errorResponse('invalid body');

  const sets: string[] = [];
  const values: unknown[] = [];
  if (body.x !== undefined) { sets.push('x = ?'); values.push(body.x); }
  if (body.y !== undefined) { sets.push('y = ?'); values.push(body.y); }
  if (body.rotation !== undefined) { sets.push('rotation = ?'); values.push(body.rotation); }
  if (body.layer_id !== undefined) { sets.push('layer_id = ?'); values.push(body.layer_id); }
  if (body.object_data !== undefined) { sets.push('object_data = ?'); values.push(JSON.stringify(body.object_data)); }
  if (sets.length === 0) return errorResponse('nothing to update');

  values.push(context.params.id);
  await context.env.DB.prepare(`UPDATE project_objects SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();
  const row = await context.env.DB.prepare('SELECT * FROM project_objects WHERE id = ?').bind(context.params.id).first();
  if (!row) return errorResponse('object not found', 404);
  return json(row);
}

/** 배치 객체 하나 삭제. 가구 원본(furniture_library)에는 영향 없다. */
export async function onRequestDelete(context: { params: { id: string }; env: Env }) {
  await context.env.DB.prepare('DELETE FROM project_objects WHERE id = ?').bind(context.params.id).run();
  return json({ ok: true });
}
