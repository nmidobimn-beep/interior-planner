import { errorResponse, json, newId, type Env } from '../_utils';

interface ObjectInput {
  id?: string;
  furniture_id?: string | null;
  x: number;
  y: number;
  rotation: number;
  layer_id?: string | null;
  object_data: unknown;
}

/** 특정 도면(project_id)에 배치된 가구 객체 전체 조회. */
export async function onRequestGet(context: { request: Request; env: Env }) {
  const url = new URL(context.request.url);
  const projectId = url.searchParams.get('project_id');
  if (!projectId) return errorResponse('project_id is required');

  const { results } = await context.env.DB.prepare('SELECT * FROM project_objects WHERE project_id = ?').bind(projectId).all();
  return json(results);
}

/**
 * 배치 객체 저장.
 * - project_id + 단일 객체 필드 → 객체 하나 추가.
 * - project_id + objects(배열) → 이 프로젝트의 배치 객체를 통째로 교체(도면 저장 시 사용,
 *   가구 원본(furniture_library)은 절대 건드리지 않는다).
 */
export async function onRequestPost(context: { request: Request; env: Env }) {
  const url = new URL(context.request.url);
  const projectIdFromQuery = url.searchParams.get('project_id');
  const body = (await context.request.json().catch(() => null)) as
    | (ObjectInput & { project_id?: string })
    | { project_id?: string; objects?: ObjectInput[] }
    | null;
  if (!body) return errorResponse('invalid body');

  const projectId = ('project_id' in body && body.project_id) || projectIdFromQuery;
  if (!projectId) return errorResponse('project_id is required');

  if ('objects' in body && Array.isArray(body.objects)) {
    const statements = [
      context.env.DB.prepare('DELETE FROM project_objects WHERE project_id = ?').bind(projectId),
      ...body.objects.map((obj) =>
        context.env.DB
          .prepare(
            'INSERT INTO project_objects (id, project_id, furniture_id, x, y, rotation, layer_id, object_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          )
          .bind(obj.id ?? newId(), projectId, obj.furniture_id ?? null, obj.x, obj.y, obj.rotation, obj.layer_id ?? null, JSON.stringify(obj.object_data)),
      ),
    ];
    await context.env.DB.batch(statements);
    return json({ ok: true, count: body.objects.length });
  }

  const single = body as ObjectInput;
  const id = newId();
  await context.env.DB.prepare(
    'INSERT INTO project_objects (id, project_id, furniture_id, x, y, rotation, layer_id, object_data) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
  )
    .bind(id, projectId, single.furniture_id ?? null, single.x, single.y, single.rotation, single.layer_id ?? null, JSON.stringify(single.object_data))
    .run();
  const row = await context.env.DB.prepare('SELECT * FROM project_objects WHERE id = ?').bind(id).first();
  return json(row, 201);
}
