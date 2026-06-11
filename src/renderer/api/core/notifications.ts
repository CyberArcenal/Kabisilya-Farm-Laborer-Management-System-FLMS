// src/renderer/api/notificationAPI.ts
// Updated to use common pagination types and align with refactored NotificationService

import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 Types
// ----------------------------------------------------------------------

export interface Notification {
  id: number;
  userId: number | null;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error' | 'purchase' | 'sale';
  isRead: boolean;
  metadata: any | null;
  scheduledFor?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export type NotificationsResponse = ApiResponse<PaginatedResponse<Notification>>;
export type NotificationResponse = ApiResponse<Notification>;
export type UnreadCountResponse = ApiResponse<number>;
export type ActionResponse = ApiResponse<any>;

export interface NotificationFilters extends BaseFilters {
  isRead?: boolean;
  userId?: number;
  type?: string;
  startDate?: string;
  endDate?: string;
}

// ----------------------------------------------------------------------
// 🧠 NotificationAPI Class
// ----------------------------------------------------------------------

class NotificationAPI {
  private channel = "notification";

  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.notification) {
      throw new Error("Electron API (notification) not available");
    }
    return window.backendAPI.notification({ method, params });
  }

  // 🔎 READ

  async getAll(params?: NotificationFilters): Promise<NotificationsResponse> {
    try {
      const response = await this.call<NotificationsResponse>("getAllNotifications", params || {});
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch notifications");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch notifications");
    }
  }

  async getById(id: number): Promise<NotificationResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<NotificationResponse>("getNotificationById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch notification");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch notification");
    }
  }

  async getUnreadCount(userId?: number): Promise<UnreadCountResponse> {
    try {
      const response = await this.call<UnreadCountResponse>("getUnreadCount", { userId });
      if (response.status) return response;
      throw new Error(response.message || "Failed to get unread count");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get unread count");
    }
  }

  // ✏️ WRITE

  async delete(id: number): Promise<ActionResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<ActionResponse>("deleteNotification", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete notification");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete notification");
    }
  }

  async markAsRead(id: number, isRead: boolean = true): Promise<NotificationResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<NotificationResponse>("markAsRead", { id, isRead });
      if (response.status) return response;
      throw new Error(response.message || "Failed to mark notification");
    } catch (error: any) {
      throw new Error(error.message || "Failed to mark notification");
    }
  }

  async markAllAsRead(userId?: number): Promise<ActionResponse> {
    try {
      const response = await this.call<ActionResponse>("markAllAsRead", { userId });
      if (response.status) return response;
      throw new Error(response.message || "Failed to mark all as read");
    } catch (error: any) {
      throw new Error(error.message || "Failed to mark all as read");
    }
  }

  async deleteAllRead(): Promise<ActionResponse> {
    try {
      const response = await this.call<ActionResponse>("deleteAllRead", {});
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete read notifications");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete read notifications");
    }
  }

  async restore(id: number): Promise<NotificationResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<NotificationResponse>("restoreNotification", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to restore notification");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore notification");
    }
  }

  // 📊 STATS (utility)
  async getStats(userId?: number): Promise<{ total: number; unread: number; read: number; byType: Record<string, number> }> {
    const all = await this.getAll({ limit: 1000, userId });
    const unreadCount = await this.getUnreadCount(userId);
    const total = all.data.items.length;
    const unread = unreadCount.data;
    const read = total - unread;
    const byType: Record<string, number> = {};
    all.data.items.forEach(n => {
      byType[n.type] = (byType[n.type] || 0) + 1;
    });
    return { total, unread, read, byType };
  }
}

const notificationAPI = new NotificationAPI();
export default notificationAPI;