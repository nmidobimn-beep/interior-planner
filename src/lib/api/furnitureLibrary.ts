import type { CloudFurnitureInput, CloudFurnitureItem } from '../../types/cloudFurniture';
import { apiFetch } from './http';

export const listCloudFurniture = (query?: string) =>
  apiFetch<CloudFurnitureItem[]>(`/api/furniture${query ? `?q=${encodeURIComponent(query)}` : ''}`);

export const createCloudFurniture = (input: CloudFurnitureInput) =>
  apiFetch<CloudFurnitureItem>('/api/furniture', { method: 'POST', body: JSON.stringify(input) });

export const updateCloudFurniture = (id: string, patch: Partial<CloudFurnitureInput>) =>
  apiFetch<CloudFurnitureItem>(`/api/furniture/${id}`, { method: 'PUT', body: JSON.stringify(patch) });

export const deleteCloudFurniture = (id: string) => apiFetch<{ ok: true }>(`/api/furniture/${id}`, { method: 'DELETE' });
