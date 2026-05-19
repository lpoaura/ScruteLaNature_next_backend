import { apiClient } from '@/src/lib/api-client';
import type { Review } from '@/src/types/api.types';

export async function getAllReviews(): Promise<Review[]> {
  return apiClient<Review[]>('/social/reviews/admin/all');
}

export async function deleteReview(id: string): Promise<void> {
  return apiClient<void>(`/social/reviews/${id}`, { method: 'DELETE' });
}
