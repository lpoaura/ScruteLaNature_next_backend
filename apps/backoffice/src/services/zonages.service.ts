import { apiClient } from '@/src/lib/api-client';
import type { Zonage, CreateZonageDto } from '@/src/types/api.types';

export async function getZonages(): Promise<Zonage[]> {
  return apiClient<Zonage[]>('/admin/zonages');
}

export interface DashboardStats {
  parcours: { actifs: number; brouillons: number };
  joueurs: { total: number; invites: number };
  co2: number;
  communes: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  return apiClient<DashboardStats>('/admin/stats/dashboard');
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
