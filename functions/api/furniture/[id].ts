import { errorResponse, json, type Env } from '../_utils';

const FIELDS = ['name', 'color', 'width', 'height', 'shape_type', 'memo'] as const;

/** 가구 원본 수정(이름/색상/크기/도형/메모). 위치·회전 등 배치 상태는 여기서 다루지 않는다. */
export async function onRequestPut(context: { request: Request; params: { id: string }; env: Env }) {
  const body = (await context.request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return errorResponse('invalid body');

  const sets: string[] = [];
  const values: unknown[] = [];
  for (const field of FIELDS) {
    if (body[field] !== undefined) {
      sets.push(`${field} = ?`);
      values.push(body[field]);
    }
  }
  if (sets.length === 0) return errorResponse('nothing to update');

  sets.push("updated_at = datetime('now')");
  values.push(context.params.id);
  await context.env.DB.prepare(`UPDATE furniture_library SET ${sets.join(', ')} WHERE id = ?`).bind(...values).run();

  const item = await context.env.DB.prepare('SELECT * FROM furniture_library WHERE id = ?').bind(context.params.id).first();
  if (!item) return errorResponse('furniture not found', 404);
  return json(item);
}

/** 가구 원본 삭제. 이미 도면에 배치된 project_objects는 유지된다(그 객체는 배치 시점의
 * object_data를 자체적으로 갖고 있으므로 원본이 사라져도 화면에서 사라지지 않는다). */
export async function onRequestDelete(context: { params: { id: string }; env: Env }) {
  await context.env.DB.prepare('DELETE FROM furniture_library WHERE id = ?').bind(context.params.id).run();
  return json({ ok: true });
}
