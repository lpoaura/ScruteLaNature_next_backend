'use client';

import { useState, useTransition } from 'react';
import { apiClient } from '@/src/lib/api-client';
import type { UserProfile } from '@/src/types/api.types';

interface UpdateMePayload {
  firstName?: string;
  lastName?: string;
  pseudo?: string;
}

export async function updateMe(data: UpdateMePayload): Promise<UserProfile> {
  return apiClient<UserProfile>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function changePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>('/users/me/change-password', {
    method: 'POST',
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}
