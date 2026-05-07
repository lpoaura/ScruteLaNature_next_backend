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

/**
 * Récupère la liste de tous les médias (images, audio, gpx).
 */
export async function getMedias(): Promise<Media[]> {
  return apiClient<Media[]>('/medias');
}

/**
 * Upload un fichier (multipart/form-data).
 * Utilise fetch directement car apiClient stringify le body par défaut.
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
