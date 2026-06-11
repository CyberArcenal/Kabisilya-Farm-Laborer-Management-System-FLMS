// src/renderer/api/workerAPI.ts
// Updated to use common pagination types and align with refactored WorkerService

import type { Assignment } from "./assignment";
import type { Debt } from "./debt";
import type { Payment } from "./payment";
import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 Worker-specific Types
// ----------------------------------------------------------------------

export interface Worker {
  id: number;
  name: string;
  contact?: string | null;
  email?: string | null;
  address?: string | null;
  status: "active" | "inactive" | "on-leave" | "terminated";
  hireDate?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  debts?: Debt[];
  payments?: Payment[];
  assignments?: Assignment[];
}

export interface WorkerCreateData {
  name: string;
  contact?: string;
  email?: string;
  address?: string;
  status?: string;
  hireDate?: string;
}

export interface WorkerUpdateData extends Partial<WorkerCreateData> {}

export type WorkerResponse = ApiResponse<Worker>;
export type WorkersResponse = ApiResponse<PaginatedResponse<Worker>>;

export interface WorkerStats {
  totalWorkers: number;
  statusBreakdown: Record<string, number>;
  workerDetails?: {
    totalAssignments: number;
    totalPayments: number;
    totalDebts: number;
    outstandingDebt: number;
  } | null;
}

export type WorkerStatsResponse = ApiResponse<WorkerStats>;

export interface WorkerFilters extends BaseFilters {
  status?: string;
  email?: string;
  contact?: string;
}

// ----------------------------------------------------------------------
// 🧠 WorkerAPI Class (using common types)
// ----------------------------------------------------------------------

class WorkerAPI {
  private channel = "worker";

  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.worker) {
      throw new Error(`Electron API (${this.channel}) not available`);
    }
    return window.backendAPI.worker({ method, params });
  }

  // 🔎 READ (with pagination)

  /**
   * Get all workers with optional filters (paginated)
   */
  async getAll(params?: WorkerFilters): Promise<WorkersResponse> {
    try {
      const response = await this.call<WorkersResponse>("getAllWorkers", params || {});
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch workers");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch workers");
    }
  }

  /**
   * Get worker by ID
   */
  async getById(id: number): Promise<WorkerResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<WorkerResponse>("getWorkerById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch worker");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch worker");
    }
  }

  /**
   * Get workers by status (paginated)
   */
  async getByStatus(
    status: string,
    params?: Omit<WorkerFilters, "status">
  ): Promise<WorkersResponse> {
    return this.getAll({ ...params, status });
  }

  /**
   * Get worker statistics
   */
  async getStats(workerId?: number): Promise<WorkerStatsResponse> {
    try {
      const response = await this.call<WorkerStatsResponse>("getWorkerStats", { workerId });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch stats");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stats");
    }
  }

  // ✏️ WRITE

  /**
   * Create a new worker
   */
  async create(data: WorkerCreateData): Promise<WorkerResponse> {
    try {
      const response = await this.call<WorkerResponse>("createWorker", data);
      if (response.status) return response;
      throw new Error(response.message || "Failed to create worker");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create worker");
    }
  }

  /**
   * Update an existing worker
   */
  async update(id: number, data: WorkerUpdateData): Promise<WorkerResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<WorkerResponse>("updateWorker", { id, ...data });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update worker");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update worker");
    }
  }

  /**
   * Update worker status
   */
  async updateStatus(id: number, status: string): Promise<WorkerResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<WorkerResponse>("updateStatus", { id, status });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update worker status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update worker status");
    }
  }

  /**
   * Soft delete a worker
   */
  async delete(id: number): Promise<WorkerResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<WorkerResponse>("deleteWorker", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete worker");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete worker");
    }
  }

  /**
   * Restore a soft-deleted worker
   */
  async restore(id: number): Promise<WorkerResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<WorkerResponse>("restoreWorker", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to restore worker");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore worker");
    }
  }
}

const workerAPI = new WorkerAPI();
export default workerAPI;