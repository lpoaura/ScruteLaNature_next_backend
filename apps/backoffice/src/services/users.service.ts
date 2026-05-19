import { apiClient } from '@/src/lib/api-client';

export interface TeamMember {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'EDITOR';
  organismeId: string | null;
  organisme?: { id: string; nom: string } | null;
  isEmailVerified: boolean;
  createdAt: string;
}

export interface CreateTeamMemberDto {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role: 'ADMIN' | 'EDITOR';
  organismeId?: string;
}

export async function getTeam(): Promise<TeamMember[]> {
  return apiClient<TeamMember[]>('/admin/users');
}

export async function createTeamMember(dto: CreateTeamMemberDto): Promise<TeamMember> {
  return apiClient<TeamMember>('/admin/users', {
    method: 'POST',
    body: JSON.stringify(dto),
  });
}

export async function deleteTeamMember(id: string): Promise<void> {
  return apiClient<void>(`/admin/users/${id}`, { method: 'DELETE' });
}
