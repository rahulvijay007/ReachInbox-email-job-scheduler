import type {
  EmailJob,
  PaginatedResult,
  ScheduleEmailsRequest,
  ScheduleEmailsResponse,
  Sender,
  User,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export class ApiRequestError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiRequestError(res.status, body.error ?? `Request failed (${res.status})`);
  }

  return res.json() as Promise<T>;
}

export const api = {
  exchangeGoogleSession: (idToken: string) =>
    request<{ user: User }>("/api/auth/google", { method: "POST", body: JSON.stringify({ idToken }) }),

  logout: () => request<{ ok: true }>("/api/auth/logout", { method: "POST" }),

  me: () => request<{ user: User }>("/api/auth/me"),

  senders: {
    list: () => request<{ senders: Sender[]; defaults: { minDelayMs: number; hourlyLimit: number } }>("/api/senders"),
    create: (label: string) => request<{ sender: Sender }>("/api/senders", { method: "POST", body: JSON.stringify({ label }) }),
  },

  emails: {
    schedule: (payload: ScheduleEmailsRequest) =>
      request<ScheduleEmailsResponse>("/api/emails/schedule", { method: "POST", body: JSON.stringify(payload) }),
    scheduled: (page = 1, limit = 20) =>
      request<PaginatedResult<EmailJob>>(`/api/emails/scheduled?page=${page}&limit=${limit}`),
    sent: (page = 1, limit = 20) => request<PaginatedResult<EmailJob>>(`/api/emails/sent?page=${page}&limit=${limit}`),
    get: (id: string) => request<{ job: EmailJob & { sender: { email: string; label: string } } }>(`/api/emails/${id}`),
  },
};
