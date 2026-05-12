import { apiClient } from '@/src/lib/api-client';
import type { Organisme } from '@/src/types/api.types';

export async function getOrganismes(): Promise<Organisme[]> {
  return apiClient<Organisme[]>('/admin/organismes');
}
