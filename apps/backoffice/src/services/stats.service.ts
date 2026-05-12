import { apiClient } from '@/src/lib/api-client';

export interface DashboardStats {
  global: {
    totalParcours: number;
    totalUsers: number;
    totalObservations: number;
    totalCompletions: number;
  };
  byOrganisme: {
    id: string;
    nom: string;
    nbParcours: number;
    totalDistanceKm: number;
    totalParticipants: number;
  }[];
  byZonage: {
    id: string;
    nom: string;
    nbParcours: number;
  }[];
}

export async function getStats(): Promise<DashboardStats> {
  return apiClient<DashboardStats>('/admin/stats');
}

export function getExportCsvUrl(): string {
  // Return the URL that triggers download
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000/api';
  return `${BACKEND_URL}/admin/stats/export/csv`;
}
