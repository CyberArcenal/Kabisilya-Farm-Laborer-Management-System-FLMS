// src/renderer/api/paymentHistoryAPI.ts
// Updated to use common pagination types and align with refactored PaymentHistoryService

import type { Payment } from "./payment";
import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 PaymentHistory-specific Types
// ----------------------------------------------------------------------

export interface PaymentHistory {
  id: number;
  actionType: string;
  changedField?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  oldAmount?: number | null;
  newAmount?: number | null;
  notes?: string | null;
  performedBy?: string | null;
  changeDate: string;
  referenceNumber?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deletedAt?: string | null;
  payment?: Payment;
}

export interface PaymentHistoryCreateData {
  paymentId: number;
  actionType?: string;
  changedField?: string;
  oldValue?: string;
  newValue?: string;
  oldAmount?: number;
  newAmount?: number;
  notes?: string;
  performedBy?: string;
  referenceNumber?: string;
  changeDate?: string;
}

export interface PaymentHistoryUpdateData extends Partial<PaymentHistoryCreateData> {}

export type PaymentHistoryResponse = ApiResponse<PaymentHistory>;
export type PaymentHistoriesResponse = ApiResponse<PaginatedResponse<PaymentHistory>>;

export interface PaymentHistoryStats {
  totalEntries: number;
  actionBreakdown: Record<string, number>;
}

export type PaymentHistoryStatsResponse = ApiResponse<PaymentHistoryStats>;

export interface PaymentHistoryFilters extends BaseFilters {
  paymentId?: number;
  actionType?: string;
  startDate?: string;
  endDate?: string;
  descriptionSearch?: string;
}

// ----------------------------------------------------------------------
// 🧠 PaymentHistoryAPI Class (using common types)
// ----------------------------------------------------------------------

class PaymentHistoryAPI {
  private channel = "paymentHistory";

  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.paymentHistory) {
      throw new Error(`Electron API (${this.channel}) not available`);
    }
    return window.backendAPI.paymentHistory({ method, params });
  }

  // 🔎 READ (with pagination)

  /**
   * Get all payment history entries with optional filters (paginated)
   */
  async getAll(params?: PaymentHistoryFilters): Promise<PaymentHistoriesResponse> {
    try {
      const response = await this.call<PaymentHistoriesResponse>("getAllPaymentHistories", params || {});
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch payment histories");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch payment histories");
    }
  }

  /**
   * Get payment history by ID
   */
  async getById(id: number): Promise<PaymentHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentHistoryResponse>("getPaymentHistoryById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch payment history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch payment history");
    }
  }

  /**
   * Get payment history entries by payment ID (paginated)
   */
  async getByPayment(
    paymentId: number,
    params?: Omit<PaymentHistoryFilters, "paymentId">
  ): Promise<PaymentHistoriesResponse> {
    return this.getAll({ ...params, paymentId });
  }

  /**
   * Get payment history statistics
   */
  async getStats(paymentId?: number): Promise<PaymentHistoryStatsResponse> {
    try {
      const response = await this.call<PaymentHistoryStatsResponse>("getPaymentHistoryStats", { paymentId });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch stats");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stats");
    }
  }

  // ✏️ WRITE

  /**
   * Create a new payment history entry
   */
  async create(data: PaymentHistoryCreateData): Promise<PaymentHistoryResponse> {
    try {
      const response = await this.call<PaymentHistoryResponse>("createPaymentHistory", data);
      if (response.status) return response;
      throw new Error(response.message || "Failed to create payment history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create payment history");
    }
  }

  /**
   * Update a payment history entry (use with caution)
   */
  async update(id: number, data: PaymentHistoryUpdateData): Promise<PaymentHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentHistoryResponse>("updatePaymentHistory", { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update payment history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update payment history");
    }
  }

  /**
   * Soft delete a payment history entry
   */
  async delete(id: number): Promise<PaymentHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentHistoryResponse>("deletePaymentHistory", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete payment history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete payment history");
    }
  }

  /**
   * Restore a soft-deleted payment history entry
   */
  async restore(id: number): Promise<PaymentHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentHistoryResponse>("restorePaymentHistory", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to restore payment history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore payment history");
    }
  }
}

const paymentHistoryAPI = new PaymentHistoryAPI();
export default paymentHistoryAPI;