import type { ProjectDetail, ProjectSummary } from '../../types/project';
import { apiFetch } from './http';

export const listProjects = () => apiFetch<ProjectSummary[]>('/api/projects');

export const createProject = (name: string) =>
  apiFetch<ProjectSummary>('/api/projects', { method: 'POST', body: JSON.stringify({ name }) });

export const getProject = (id: string) => apiFetch<ProjectDetail>(`/api/projects/${id}`);

export const renameProject = (id: string, name: string) =>
  apiFetch<ProjectSummary>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify({ name }) });

export const saveProjectPlan = (id: string, planData: unknown) =>
  apiFetch<ProjectSummary>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify({ plan_data: planData }) });

export const deleteProject = (id: string) => apiFetch<{ ok: true }>(`/api/projects/${id}`, { method: 'DELETE' });
