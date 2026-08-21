export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

export interface Sender {
  id: string;
  label: string;
  email: string;
  createdAt: string;
}

export type EmailStatus = "PENDING" | "SCHEDULED" | "SENDING" | "SENT" | "FAILED" | "RESCHEDULED";

export interface EmailJob {
  id: string;
  batchId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  sequence: number;
  scheduledAt: string;
  status: EmailStatus;
  attempts: number;
  rescheduleCount: number;
  lastError?: string | null;
  previewUrl?: string | null;
  sentAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface ScheduleEmailsRequest {
  senderId: string;
  recipients: string[];
  subject: string;
  body: string;
  startTime: string; // ISO
  delayBetweenEmailsSec: number;
  hourlyLimit: number;
}

export interface ScheduleEmailsResponse {
  batchId: string;
  scheduledCount: number;
}
