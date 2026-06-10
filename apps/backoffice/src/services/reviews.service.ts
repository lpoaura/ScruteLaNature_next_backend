import { apiClient } from '@/src/lib/api-client';
import type { Review } from '@/src/types/api.types';

export interface PaginatedReviews {
  data: Review[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    kpis: {
      total: number;
      avgRating: number | null;
      count5: number;
      count1: number;
    }
  };
}

export async function getAllReviews(page = 1, limit = 20, rating?: number | null, sortOrder: 'asc' | 'desc' = 'desc'): Promise<PaginatedReviews> {
  const qs = new URLSearchParams();
  qs.set('page', page.toString());
  qs.set('limit', limit.toString());
  qs.set('sortOrder', sortOrder);
  if (rating) {
    qs.set('rating', rating.toString());
  }
  return apiClient<PaginatedReviews>(`/social/reviews/admin/all?${qs.toString()}`);
}

export async function deleteReview(id: string): Promise<void> {
  return apiClient<void>(`/social/reviews/${id}`, { method: 'DELETE' });
}
