import { apiClient } from '@/src/lib/api-client';
import type { Parcours, PublishStatus } from '@/src/types/api.types';

export interface ParcoursFilters {
  status?: PublishStatus;
  zonageId?: string;
  organismeId?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedParcours {
  data: Parcours[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/**
 * Liste les parcours accessibles à l'utilisateur connecté (pagination serveur).
 */
export async function getParcours(filters?: ParcoursFilters): Promise<PaginatedParcours> {
  const params = new URLSearchParams();
  if (filters?.status)      params.set('status',      filters.status);
  if (filters?.zonageId)    params.set('zonageId',    filters.zonageId);
  if (filters?.organismeId) params.set('organismeId', filters.organismeId);
  if (filters?.page)        params.set('page',        String(filters.page));
  if (filters?.limit)       params.set('limit',       String(filters.limit));

  const query = params.toString() ? `?${params.toString()}` : '';
  return apiClient<PaginatedParcours>(`/admin/parcours${query}`);
}

/**
 * Récupère un parcours complet avec ses étapes et jeux.
 */
export async function getParcoursById(id: string): Promise<Parcours> {
  return apiClient<Parcours>(`/admin/parcours/${id}`, { cache: 'no-store' });
}

/**
 * Crée un nouveau parcours.
 * @param organismeId — obligatoire si l'utilisateur est SUPER_ADMIN (passé en query param)
 */
export async function createParcours(dto: Partial<Parcours>, organismeId?: string): Promise<Parcours> {
  const query = organismeId ? `?organismeId=${organismeId}` : '';
  return apiClient<Parcours>(`/admin/parcours${query}`, {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

/**
 * Met à jour un parcours existant.
 */
export async function updateParcours(id: string, dto: Partial<Parcours>, organismeId?: string): Promise<Parcours> {
  const query = organismeId ? `?organismeId=${organismeId}` : '';
  return apiClient<Parcours>(`/admin/parcours/${id}${query}`, {
    method: 'PATCH',
    body: JSON.stringify(dto),
  });
}

/**
 * Soumet un parcours pour publication (→ PENDING_REVIEW).
 */
export async function requestPublishParcours(id: string): Promise<{ id: string; status: string; title: string }> {
  return apiClient(`/admin/parcours/${id}/request-publish`, { method: 'PATCH' });
}

/**
 * Supprime un parcours.
 */
export async function deleteParcours(id: string): Promise<void> {
  return apiClient<void>(`/admin/parcours/${id}`, { method: 'DELETE' });
}
