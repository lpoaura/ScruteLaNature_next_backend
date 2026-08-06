import { apiClient } from '@/src/lib/api-client';

export interface SendPushReport {
  success: boolean;
  targetCount: number;
  validTokensCount: number;
  sentCount: number;
  errorCount: number;
  errors: Array<{ message: string; details?: any }>;
}

export interface SendPushResponse {
  message: string;
  report: SendPushReport;
}

export async function sendPushToAll(title: string, body: string): Promise<SendPushResponse> {
  return apiClient<SendPushResponse>('/admin/notifications/send-all', {
    method: 'POST',
    body: JSON.stringify({ title, body }),
  });
}
