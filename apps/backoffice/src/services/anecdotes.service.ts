import { apiClient } from '@/src/lib/api-client';
import type { Anecdote } from '../types/api.types';

export async function getAnecdotes(): Promise<Anecdote[]> {
  return apiClient('/admin/anecdotes');
}

export async function getAnecdote(id: string): Promise<Anecdote> {
  return apiClient(`/admin/anecdotes/${id}`);
}

export async function createAnecdote(data: { content: string; imageUrl?: string; isActive: boolean }): Promise<Anecdote> {
  return apiClient('/admin/anecdotes', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAnecdote(id: string, data: { content?: string; imageUrl?: string; isActive?: boolean }): Promise<Anecdote> {
  return apiClient(`/admin/anecdotes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteAnecdote(id: string): Promise<void> {
  return apiClient(`/admin/anecdotes/${id}`, {
    method: 'DELETE',
  });
}
