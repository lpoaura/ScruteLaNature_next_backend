import { apiClient } from '@/src/lib/api-client';
import type { Jeu } from '../types/api.types';

export async function createJeu(data: Partial<Jeu>): Promise<Jeu> {
  return apiClient<Jeu>('/admin/jeux', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateJeu(id: string, data: Partial<Jeu>): Promise<Jeu> {
  return apiClient<Jeu>(`/admin/jeux/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteJeu(id: string): Promise<void> {
  return apiClient<void>(`/admin/jeux/${id}`, {
    method: 'DELETE',
  });
}
