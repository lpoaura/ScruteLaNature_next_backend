import { apiClient } from '@/src/lib/api-client';

export interface Signalement {
  id: string;
  type: 'INACCESSIBLE' | 'MISSING_CLUE' | 'TECHNICAL_ERROR' | 'OTHER';
  description: string | null;
  status: 'PENDING' | 'RESOLVED' | 'IGNORED';
  createdAt: string;
  user: { id: string; pseudo: string; email: string } | null;
  parcours: { id: string; title: string };
  etape: { id: string; title: string; order: number } | null;
}

export async function getSignalements(): Promise<Signalement[]> {
  return apiClient<Signalement[]>('/admin/signalements');
}

export async function updateSignalementStatus(id: string, status: Signalement['status']): Promise<Signalement> {
  return apiClient<Signalement>(`/admin/signalements/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}
