import { apiClient } from '@/src/lib/api-client';
import type { Organisme } from '@/src/types/api.types';

export interface OrganismeDetail extends Organisme {
  _count?: { employes: number; parcours: number };
}

export async function getOrganismes(): Promise<OrganismeDetail[]> {
  return apiClient<OrganismeDetail[]>('/admin/organismes');
}

export async function createOrganisme(nom: string): Promise<Organisme> {
  return apiClient<Organisme>('/admin/organismes', {
    method: 'POST',
    body: JSON.stringify({ nom }),
  });
}

export async function updateOrganisme(id: string, nom: string): Promise<Organisme> {
  return apiClient<Organisme>(`/admin/organismes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ nom }),
  });
}
