// src/renderer/api/paymentAPI.ts
// Updated to use common pagination types and align with refactored PaymentService

import type { Assignment } from "./assignment";
import type { Debt } from "./debt";
import type { PaymentHistory } from "./payment_history";
import type { Pitak } from "./pitak";
import type { Session } from "./session";
import type { Worker } from "./worker";
import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 Payment-specific Types
// ----------------------------------------------------------------------

export interface Payment {
  id: number;
  grossPay: number;
  manualDeduction?: number | null;
  netPay: number;
  status: "pending" | "partially_paid" | "completed" | "cancelled";
  paymentDate?: string | null;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  periodStart?: string | null;
  periodEnd?: string | null;
  totalDebtDeduction: number;
  otherDeductions: number;
  deductionBreakdown?: any | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  idempotencyKey?: string | null;
  worker?: Worker;
  pitak?: Pitak;
  session?: Session;
  assignment?: Assignment | null;
  history?: PaymentHistory[];
  debtPayments?: Debt[];
}

export interface PaymentCreateData {
  workerId: number;
  pitakId: number;
  sessionId: number;
  assignmentId?: number | null;
  amount: number;  // Changed from grossPay to amount for consistency with service
  grossPay?: number;  // Keep for backward compatibility
  manualDeduction?: number;
  netPay?: number;
  status?: "pending" | "partially_paid" | "completed" | "cancelled";
  paymentDate?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  periodStart?: string;
  periodEnd?: string;
  totalDebtDeduction?: number;
  otherDeductions?: number;
  deductionBreakdown?: any;
  notes?: string;
  idempotencyKey?: string;
  description?: string;
}

export interface PaymentUpdateData extends Partial<PaymentCreateData> {}

export type PaymentResponse = ApiResponse<Payment>;
export type PaymentsResponse = ApiResponse<PaginatedResponse<Payment>>;

export interface PaymentStats {
  totalPayments: number;
  statusBreakdown: Record<string, number>;
  totalGross: number;
  totalNet: number;
  totalDeductions: number;
}

export type PaymentStatsResponse = ApiResponse<PaymentStats>;

export interface PaymentFilters extends BaseFilters {
  workerId?: number;
  pitakId?: number;
  sessionId?: number;
  assignmentId?: number;
  status?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
  idempotencyKey?: string;
}

// ----------------------------------------------------------------------
// 🧠 PaymentAPI Class (using common types)
// ----------------------------------------------------------------------

class PaymentAPI {
  private channel = "payment";

  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.payment) {
      throw new Error(`Electron API (${this.channel}) not available`);
    }
    return window.backendAPI.payment({ method, params });
  }

  // 🔎 READ (with pagination)

  /**
   * Get all payments with optional filters (paginated)
   */
  async getAll(params?: PaymentFilters): Promise<PaymentsResponse> {
    try {
      const response = await this.call<PaymentsResponse>("getAllPayments", params || {});
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch payments");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch payments");
    }
  }

  /**
   * Get payment by ID
   */
  async getById(id: number): Promise<PaymentResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentResponse>("getPaymentById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch payment");
    }
  }

  /**
   * Get payments by worker ID (paginated)
   */
  async getByWorker(
    workerId: number,
    params?: Omit<PaymentFilters, "workerId">
  ): Promise<PaymentsResponse> {
    return this.getAll({ ...params, workerId });
  }

  /**
   * Get payments by pitak ID (paginated)
   */
  async getByPitak(
    pitakId: number,
    params?: Omit<PaymentFilters, "pitakId">
  ): Promise<PaymentsResponse> {
    return this.getAll({ ...params, pitakId });
  }

  /**
   * Get payments by session ID (paginated)
   */
  async getBySession(
    sessionId: number,
    params?: Omit<PaymentFilters, "sessionId">
  ): Promise<PaymentsResponse> {
    return this.getAll({ ...params, sessionId });
  }

  /**
   * Get payment statistics
   */
  async getStats(sessionId?: number): Promise<PaymentStatsResponse> {
    try {
      const response = await this.call<PaymentStatsResponse>("getPaymentStats", { sessionId });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch stats");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stats");
    }
  }

  // ✏️ WRITE

  /**
   * Create a new payment
   */
  async create(data: PaymentCreateData): Promise<PaymentResponse> {
    try {
      // Transform grossPay/netPay to amount if needed (service expects amount)
      const payload = { ...data };
      if (data.amount === undefined && data.grossPay !== undefined) {
        payload.amount = data.grossPay;
      }
      const response = await this.call<PaymentResponse>("createPayment", payload);
      if (response.status) return response;
      throw new Error(response.message || "Failed to create payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create payment");
    }
  }

  /**
   * Update an existing payment
   */
  async update(id: number, data: PaymentUpdateData): Promise<PaymentResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentResponse>("updatePayment", { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update payment");
    }
  }

  /**
   * Update payment status
   */
  async updateStatus(id: number, status: string): Promise<PaymentResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentResponse>("updateStatus", { id, status });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update payment status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update payment status");
    }
  }

  /**
   * Soft delete a payment
   */
  async delete(id: number): Promise<PaymentResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentResponse>("deletePayment", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete payment");
    }
  }

  /**
   * Restore a soft-deleted payment
   */
  async restore(id: number): Promise<PaymentResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PaymentResponse>("restorePayment", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to restore payment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore payment");
    }
  }
}

const paymentAPI = new PaymentAPI();
export default paymentAPI;