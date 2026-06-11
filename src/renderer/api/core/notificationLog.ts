// src/renderer/api/notificationLog.ts
// Refactored – uses common pagination types and aligns with backend NotificationLogService

import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 Types & Interfaces
// ----------------------------------------------------------------------

export interface NotificationLogEntry {
  id: number;
  recipient_email: string;
  subject: string | null;
  payload: string | null;
  status: "queued" | "sent" | "failed" | "resend";
  error_message: string | null;
  retry_count: number;
  resend_count: number;
  sent_at: string | null;
  last_error_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

export interface NotificationStats {
  total: number;
  byStatus: Record<string, number>;
  avgRetryFailed: number;
  last24h: number;
}

// Response types using common patterns
export type NotificationsResponse = ApiResponse<PaginatedResponse<NotificationLogEntry>>;
export type NotificationResponse = ApiResponse<NotificationLogEntry>;
export type NotificationStatsResponse = ApiResponse<NotificationStats>;
export type NotificationActionResponse = ApiResponse<any>;

export interface NotificationLogFilters extends BaseFilters {
  recipient_email?: string;
  status?: string | string[];
  startDate?: string;
  endDate?: string;
}

// ----------------------------------------------------------------------
// 🧠 NotificationLogAPI Class
// ----------------------------------------------------------------------

class NotificationLogAPI {
  private async callRaw<T = any>(method: string, params: any = {}): Promise<T> {
    if (!window.backendAPI?.notificationLog) {
      throw new Error("Electron API (notificationLog) not available");
    }
    const response = await window.backendAPI.notificationLog({ method, params });
    if (!response || typeof response !== "object") throw new Error("Invalid response");
    return response as T;
  }

  private normalizeResponse<T extends { status: boolean; message?: string; data?: any }>(
    response: T
  ): T & { message: string } {
    return { ...response, message: response.message ?? "" };
  }

  private toNotificationsResponse(raw: any): NotificationsResponse {
    const normalized = this.normalizeResponse(raw);
    if (normalized.status && raw.pagination) {
      const { page, limit, total, pages } = raw.pagination;
      return {
        ...normalized,
        data: {
          items: raw.data || [],
          pagination: { page, limit, total, pages },
        },
      };
    }
    return {
      ...normalized,
      data: { items: [], pagination: { page: 1, limit: 50, total: 0, pages: 0 } },
    };
  }

  // --------------------------------------------------------------------
  // READ – aligned with service methods
  // --------------------------------------------------------------------

  async findAll(params?: NotificationLogFilters): Promise<NotificationsResponse> {
    const raw = await this.callRaw("findAll", params || {});
    return this.toNotificationsResponse(raw);
  }

  async findById(id: number): Promise<NotificationResponse> {
    const raw = await this.callRaw("findById", { id });
    return this.normalizeResponse(raw);
  }

  async findByRecipient(params: {
    recipient_email: string;
    page?: number;
    limit?: number;
  }): Promise<NotificationsResponse> {
    const raw = await this.callRaw("findByRecipient", params);
    return this.toNotificationsResponse(raw);
  }

  async search(params: {
    keyword: string;
    page?: number;
    limit?: number;
  }): Promise<NotificationsResponse> {
    const raw = await this.callRaw("search", params);
    return this.toNotificationsResponse(raw);
  }

  async getStatistics(params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<NotificationStatsResponse> {
    const raw = await this.callRaw("getStatistics", params || {});
    return this.normalizeResponse(raw);
  }

  // --------------------------------------------------------------------
  // WRITE – aligned with service methods
  // --------------------------------------------------------------------

  async updateStatus(params: {
    id: number;
    status: string;
    errorMessage?: string | null;
  }): Promise<NotificationActionResponse> {
    const raw = await this.callRaw("updateStatus", params);
    return this.normalizeResponse(raw);
  }

  async delete(id: number): Promise<NotificationActionResponse> {
    const raw = await this.callRaw("delete", { id });
    return this.normalizeResponse(raw);
  }

  async retryFailed(id: number): Promise<NotificationActionResponse> {
    const raw = await this.callRaw("retryFailed", { id });
    return this.normalizeResponse(raw);
  }

  async retryAllFailed(params?: {
    filters?: { recipient_email?: string; createdBefore?: string };
  }): Promise<NotificationActionResponse> {
    const raw = await this.callRaw("retryAllFailed", params || {});
    return this.normalizeResponse(raw);
  }

  async resend(id: number): Promise<NotificationActionResponse> {
    const raw = await this.callRaw("resend", { id });
    return this.normalizeResponse(raw);
  }

  // --------------------------------------------------------------------
  // Utility methods
  // --------------------------------------------------------------------

  async hasLogs(recipient_email: string): Promise<boolean> {
    const res = await this.findByRecipient({ recipient_email, limit: 1 });
    return res.status && res.data.pagination.total > 0;
  }

  async getLatestByRecipient(recipient_email: string): Promise<NotificationLogEntry | null> {
    const res = await this.findByRecipient({ recipient_email, limit: 1, page: 1 });
    if (res.status && res.data.items.length > 0) {
      return res.data.items[0];
    }
    return null;
  }

  isAvailable(): boolean {
    return !!window.backendAPI?.notificationLog;
  }
}

const notificationLogAPI = new NotificationLogAPI();
export default notificationLogAPI;