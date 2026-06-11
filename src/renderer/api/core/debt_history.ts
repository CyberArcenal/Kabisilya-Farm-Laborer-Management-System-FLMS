// src/renderer/api/debtHistoryAPI.ts
// Updated to use common pagination types and align with refactored DebtHistoryService

import type { Debt } from "./debt";
import type { Payment } from "./payment";
import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 DebtHistory-specific Types
// ----------------------------------------------------------------------

export interface DebtHistory {
  id: number;
  amountPaid: number;
  previousBalance: number;
  newBalance: number;
  transactionType: string;
  paymentMethod?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
  transactionDate: string;
  createdAt: string;
  updatedAt?: string;
  deletedAt?: string | null;
  debt?: Debt;
  payment?: Payment | null;
}

export interface DebtHistoryCreateData {
  debtId: number;
  paymentId?: number | null;
  amountPaid: number;
  previousBalance: number;
  newBalance: number;
  transactionType?: string;
  paymentMethod?: string;
  referenceNumber?: string;
  notes?: string;
  transactionDate?: string;
}

export interface DebtHistoryUpdateData extends Partial<DebtHistoryCreateData> {}

export type DebtHistoryResponse = ApiResponse<DebtHistory>;
export type DebtHistoriesResponse = ApiResponse<PaginatedResponse<DebtHistory>>;

export interface DebtHistoryStats {
  totalEntries: number;
  typeBreakdown: Record<string, number>;
  totalPayments: number;
}

export type DebtHistoryStatsResponse = ApiResponse<DebtHistoryStats>;

export interface DebtHistoryFilters extends BaseFilters {
  debtId?: number;
  paymentId?: number;
  transactionType?: string;
  startDate?: string;
  endDate?: string;
  minAmount?: number;
  maxAmount?: number;
}

// ----------------------------------------------------------------------
// 🧠 DebtHistoryAPI Class (using common types)
// ----------------------------------------------------------------------

class DebtHistoryAPI {
  private channel = "debtHistory";

  private async call<T = any>(
    method: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    if (!window.backendAPI?.debtHistory) {
      throw new Error(`Electron API (${this.channel}) not available`);
    }
    return window.backendAPI.debtHistory({ method, params });
  }

  // 🔎 READ (with pagination)

  /**
   * Get all debt history entries with optional filters (paginated)
   */
  async getAll(params?: DebtHistoryFilters): Promise<DebtHistoriesResponse> {
    try {
      const response = await this.call<DebtHistoriesResponse>(
        "getAllDebtHistories",
        params || {},
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch debt histories");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch debt histories");
    }
  }

  /**
   * Get debt history by ID
   */
  async getById(id: number): Promise<DebtHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<DebtHistoryResponse>(
        "getDebtHistoryById",
        { id },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch debt history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch debt history");
    }
  }

  /**
   * Get debt history entries by debt ID (paginated)
   */
  async getByDebt(
    debtId: number,
    params?: Omit<DebtHistoryFilters, "debtId">,
  ): Promise<DebtHistoriesResponse> {
    return this.getAll({ ...params, debtId });
  }

  /**
   * Get debt history statistics
   */
  async getStats(debtId?: number): Promise<DebtHistoryStatsResponse> {
    try {
      const response = await this.call<DebtHistoryStatsResponse>(
        "getDebtHistoryStats",
        { debtId },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch stats");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stats");
    }
  }

  // ✏️ WRITE

  /**
   * Create a new debt history entry
   */
  async create(data: DebtHistoryCreateData): Promise<DebtHistoryResponse> {
    try {
      const response = await this.call<DebtHistoryResponse>(
        "createDebtHistory",
        data,
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to create debt history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create debt history");
    }
  }

  /**
   * Update a debt history entry (use with caution)
   */
  async update(
    id: number,
    data: DebtHistoryUpdateData,
  ): Promise<DebtHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<DebtHistoryResponse>(
        "updateDebtHistory",
        { id, ...data },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to update debt history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update debt history");
    }
  }

  /**
   * Soft delete a debt history entry
   */
  async delete(id: number): Promise<DebtHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<DebtHistoryResponse>(
        "deleteDebtHistory",
        { id },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete debt history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete debt history");
    }
  }

  /**
   * Restore a soft-deleted debt history entry
   */
  async restore(id: number): Promise<DebtHistoryResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<DebtHistoryResponse>(
        "restoreDebtHistory",
        { id },
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to restore debt history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore debt history");
    }
  }
}

const debtHistoryAPI = new DebtHistoryAPI();
export default debtHistoryAPI;