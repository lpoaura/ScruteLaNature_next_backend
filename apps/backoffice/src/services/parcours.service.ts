import { apiClient } from '@/src/lib/api-client';
import type { Parcours, PublishStatus } from '@/src/types/api.types';

export interface ParcoursFilters {
  status?: PublishStatus;
  zonageId?: string;
}

/**
 * Liste les parcours accessibles à l'utilisateur connecté (cloisonnés par organisme).
 */
export async function getParcours(filters?: ParcoursFilters): Promise<Parcours[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.zonageId) params.set('zonageId', filters.zonageId);

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiClient<Parcours[]>(`/admin/parcours${query}`);
}

/**
 * Récupère un parcours complet avec ses étapes et jeux.
 */
export async function getParcoursById(id: string): Promise<Parcours> {
  return apiClient<Parcours>(`/admin/parcours/${id}`);
}

/**
 * Crée un nouveau parcours.
 */
export async function createParcours(dto: Partial<Parcours>): Promise<Parcours> {
  return apiClient<Parcours>('/admin/parcours', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Met à jour un parcours existant.
 */
export async function updateParcours(id: string, dto: Partial<Parcours>): Promise<Parcours> {
  return apiClient<Parcours>(`/admin/parcours/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

/**
 * Supprime un parcours.
 */
export async function deleteParcours(id: string): Promise<void> {
  return apiClient<void>(`/admin/parcours/${id}`, { method: 'DELETE' });
}
