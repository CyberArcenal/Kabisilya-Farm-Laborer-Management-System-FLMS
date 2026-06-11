// src/renderer/api/bukidAPI.ts
// Updated to use common pagination types and align with refactored BukidService

import type { Pitak } from "./pitak";
import type { Session } from "./session";
import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 Bukid-specific Types
// ----------------------------------------------------------------------

export interface Bukid {
  id: number;
  name: string;
  status: "initiated" | "active" | "completed" | "cancelled";
  notes?: string | null;
  location?: string | null;
  area?: number | null;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  session: Session;
  pitaks?: Pitak[];
}

export interface BukidCreateData {
  name: string;
  sessionId: number;
  status?: "initiated" | "active" | "completed" | "cancelled";
  notes?: string;
  location?: string;
  area?: number;
  description?: string;
}

export interface BukidUpdateData extends Partial<BukidCreateData> {}

export type BukidResponse = ApiResponse<Bukid>;
export type BukidsResponse = ApiResponse<PaginatedResponse<Bukid>>;

export interface BukidStats {
  totalBukids: number;
  statusBreakdown: Record<string, number>;
  pitakDistribution: Array<{ bukidId: number; count: number }>;
}

export type BukidStatsResponse = ApiResponse<BukidStats>;

export interface BukidFilters extends BaseFilters {
  sessionId?: number;
  status?: string;
}

// ----------------------------------------------------------------------
// 🧠 BukidAPI Class (using common types)
// ----------------------------------------------------------------------

class BukidAPI {
  private channel = "bukid";

  private async call<T = any>(
    method: string,
    params: Record<string, any> = {},
  ): Promise<T> {
    if (!window.backendAPI?.bukid) {
      throw new Error(`Electron API (${this.channel}) not available`);
    }
    return window.backendAPI.bukid({ method, params });
  }

  // 🔎 READ (with pagination)

  /**
   * Get all bukids with optional filters (paginated)
   */
  async getAll(params?: BukidFilters): Promise<BukidsResponse> {
    try {
      const response = await this.call<BukidsResponse>(
        "getAllBukids",
        params || {},
      );
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch bukids");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch bukids");
    }
  }

  /**
   * Get bukid by ID
   */
  async getById(id: number): Promise<BukidResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<BukidResponse>("getBukidById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch bukid");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch bukid");
    }
  }

  /**
   * Get bukids by session ID (paginated)
   */
  async getBySession(
    sessionId: number,
    params?: Omit<BukidFilters, "sessionId">,
  ): Promise<BukidsResponse> {
    return this.getAll({ ...params, sessionId });
  }

  /**
   * Get bukid statistics (aggregated data)
   */
  async getStats(): Promise<BukidStatsResponse> {
    try {
      const response = await this.call<BukidStatsResponse>("getBukidStats");
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch stats");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stats");
    }
  }

  // ✏️ WRITE

  /**
   * Create a new bukid
   */
  async create(data: BukidCreateData): Promise<BukidResponse> {
    try {
      const response = await this.call<BukidResponse>("createBukid", data);
      if (response.status) return response;
      throw new Error(response.message || "Failed to create bukid");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create bukid");
    }
  }

  /**
   * Update an existing bukid
   */
  async update(id: number, data: BukidUpdateData): Promise<BukidResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<BukidResponse>("updateBukid", {
        id,
        ...data,
      });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update bukid");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update bukid");
    }
  }

  /**
   * Update bukid status
   * @param id - Bukid ID
   * @param status - New status ('initiated', 'active', 'completed', 'cancelled')
   */
  async updateStatus(id: number, status: string): Promise<BukidResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<BukidResponse>("updateStatus", {
        id,
        status,
      });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update bukid status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update bukid status");
    }
  }

  /**
   * Soft delete (archive) a bukid
   */
  async delete(id: number): Promise<BukidResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<BukidResponse>("deleteBukid", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete bukid");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete bukid");
    }
  }

  /**
   * Restore a soft-deleted bukid
   */
  async restore(id: number): Promise<BukidResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<BukidResponse>("restoreBukid", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to restore bukid");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore bukid");
    }
  }
}

const bukidAPI = new BukidAPI();
export default bukidAPI;