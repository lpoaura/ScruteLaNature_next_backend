import { apiClient } from '@/src/lib/api-client';

export interface ParcoursActivity {
  id: string;
  title: string;
  coverImage: string | null;
  organisme: string | null;
  downloads: { thisMonth: number; last2Months: number; total: number };
  plays:     { thisMonth: number; last2Months: number; total: number };
}

export interface DashboardStats {
  global: {
    totalParcours: number;
    totalPlayers: number;
    totalMembers: number;
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
  byParcours: ParcoursActivity[];
}

export interface StatsFilterParams {
  organismeId?: string;
  zonageId?: string;
  startDate?: string;
  endDate?: string;
}

function buildQs(params?: StatsFilterParams): string {
  const qs = new URLSearchParams();
  if (params?.organismeId) qs.set('organismeId', params.organismeId);
  if (params?.zonageId) qs.set('zonageId', params.zonageId);
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  return qs.toString() ? `?${qs.toString()}` : '';
}

export async function getStats(params?: StatsFilterParams): Promise<DashboardStats> {
  return apiClient<DashboardStats>(`/admin/stats${buildQs(params)}`);
}

export function getExportCsvUrl(params?: StatsFilterParams): string {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000/api';
  const url = new URL(`${BACKEND_URL}/admin/stats/export/csv`);
  if (params?.organismeId) url.searchParams.set('organismeId', params.organismeId);
  if (params?.zonageId) url.searchParams.set('zonageId', params.zonageId);
  if (params?.startDate) url.searchParams.set('startDate', params.startDate);
  if (params?.endDate) url.searchParams.set('endDate', params.endDate);
  return url.toString();
}
