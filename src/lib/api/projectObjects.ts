import { apiFetch } from './http';

export interface ProjectObjectRow {
  id: string;
  project_id: string;
  furniture_id: string | null;
  x: number;
  y: number;
  rotation: number;
  layer_id: string | null;
  object_data: string;
  created_at: string;
}

export interface ProjectObjectInput {
  id?: string;
  furniture_id?: string | null;
  x: number;
  y: number;
  rotation: number;
  layer_id?: string | null;
  object_data: unknown;
}

export const listProjectObjects = (projectId: string) => apiFetch<ProjectObjectRow[]>(`/api/objects?project_id=${projectId}`);

/** 이 프로젝트의 배치 가구 객체를 통째로 교체한다(도면 저장). */
export const replaceProjectObjects = (projectId: string, objects: ProjectObjectInput[]) =>
  apiFetch<{ ok: true }>('/api/objects', { method: 'POST', body: JSON.stringify({ project_id: projectId, objects }) });

export const deleteProjectObject = (id: string) => apiFetch<{ ok: true }>(`/api/objects/${id}`, { method: 'DELETE' });
