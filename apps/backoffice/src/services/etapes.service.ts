import { apiClient } from '@/src/lib/api-client';
import type { Etape } from '../types/api.types';

export async function createEtape(data: Partial<Etape>): Promise<Etape> {
  return apiClient<Etape>('/admin/etapes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateEtape(id: string, data: Partial<Etape>): Promise<Etape> {
  return apiClient<Etape>(`/admin/etapes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteEtape(id: string): Promise<void> {
  return apiClient<void>(`/admin/etapes/${id}`, {
    method: 'DELETE',
  });
}

export async function reorderEtapes(etapes: { id: string; order: number }[]): Promise<void> {
  return apiClient<void>('/admin/etapes/reorder', {
    method: 'PATCH',
    body: JSON.stringify({ etapes }),
  });
}
