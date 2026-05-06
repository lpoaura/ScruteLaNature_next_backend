import { apiClient } from '@/src/lib/api-client';
import type { Zonage, CreateZonageDto } from '@/src/types/api.types';

export async function getZonages(): Promise<Zonage[]> {
  return apiClient<Zonage[]>('/admin/zonages');
}

export async function createZonage(dto: CreateZonageDto): Promise<Zonage> {
  return apiClient<Zonage>('/admin/zonages', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function deleteZonage(id: string): Promise<void> {
  return apiClient<void>(`/admin/zonages/${id}`, { method: 'DELETE' });
}
