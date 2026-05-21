import { apiClient, getAccessToken } from '@/src/lib/api-client';

export interface Media {
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  createdAt?: string;
  isUsed?: boolean;
}

export interface PaginatedMedias {
  data: Media[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export interface MediasQuery {
  page?: number;
  limit?: number;
  type?: 'image' | 'audio' | 'gpx';
}

/**
 * Récupère les médias avec pagination serveur.
 */
export async function getMedias(query?: MediasQuery): Promise<PaginatedMedias> {
  const params = new URLSearchParams();
  if (query?.page)  params.set('page',  String(query.page));
  if (query?.limit) params.set('limit', String(query.limit));
  if (query?.type)  params.set('type',  query.type);
  const q = params.toString() ? `?${params.toString()}` : '';
  return apiClient<PaginatedMedias>(`/medias${q}`);
}

/**
 * Upload un fichier (multipart/form-data).
 */
export async function uploadMedia(file: File, context?: 'specific'): Promise<Media> {
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000/api';
  const token = await getAccessToken();

  const formData = new FormData();
  formData.append('file', file);

  const url = context === 'specific'
    ? `${BACKEND_URL}/medias/upload?context=specific`
    : `${BACKEND_URL}/medias/upload`;

  const response = await fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Erreur réseau lors de l\'upload' }));
    throw new Error(err.message ?? `Erreur ${response.status}`);
  }

  return response.json();
}

/**
 * Supprime un fichier.
 */
export async function deleteMedia(filename: string): Promise<void> {
  return apiClient<void>(`/medias/${filename}`, { method: 'DELETE' });
}
