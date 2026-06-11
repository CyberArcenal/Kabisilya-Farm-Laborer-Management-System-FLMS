// src/renderer/api/pitakAPI.ts
// Updated to use common pagination types and align with refactored PitakService

import type { Assignment } from "./assignment";
import type { Bukid } from "./bukid";
import type { Payment } from "./payment";
import type { PaginatedResponse, ApiResponse, BaseFilters } from "../shared";

// ----------------------------------------------------------------------
// 📦 Pitak-specific Types
// ----------------------------------------------------------------------

export interface Pitak {
  id: number;
  location: string;
  totalLuwang?: number;
  layoutType?: string;
  sideLengths?: any | null;
  areaSqm?: number;
  area?: number;          // alias for areaSqm
  notes?: string | null;
  description?: string | null;
  status: "active" | "completed" | "cancelled";
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  bukid?: Bukid;
  assignments?: Assignment[];
  payments?: Payment[];
}

export interface PitakCreateData {
  bukidId: number;
  location?: string;
  layoutType?: string;
  sideLengths?: any;
  areaSqm?: number;
  area?: number;          // alias
  notes?: string;
  description?: string;
  status?: "active" | "completed" | "cancelled";
  totalLuwang?: number;
}

export interface PitakUpdateData extends Partial<PitakCreateData> {}

export type PitakResponse = ApiResponse<Pitak>;
export type PitaksResponse = ApiResponse<PaginatedResponse<Pitak>>;

export interface PitakStats {
  totalPitaks: number;
  statusBreakdown: Record<string, number>;
  totalArea: number;
}

export type PitakStatsResponse = ApiResponse<PitakStats>;

export interface PitakFilters extends BaseFilters {
  bukidId?: number;
  status?: string;
  sessionId?: number;
  minArea?: number;
  maxArea?: number;
}

// ----------------------------------------------------------------------
// 🧠 PitakAPI Class (using common types)
// ----------------------------------------------------------------------

class PitakAPI {
  private channel = "pitak";

  private async call<T = any>(method: string, params: Record<string, any> = {}): Promise<T> {
    if (!window.backendAPI?.pitak) {
      throw new Error(`Electron API (${this.channel}) not available`);
    }
    return window.backendAPI.pitak({ method, params });
  }

  // 🔎 READ (with pagination)

  /**
   * Get all pitaks with optional filters (paginated)
   */
  async getAll(params?: PitakFilters): Promise<PitaksResponse> {
    try {
      const response = await this.call<PitaksResponse>("getAllPitaks", params || {});
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch pitaks");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch pitaks");
    }
  }

  /**
   * Get pitak by ID
   */
  async getById(id: number): Promise<PitakResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PitakResponse>("getPitakById", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch pitak");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch pitak");
    }
  }

  /**
   * Get pitaks by bukid ID (paginated)
   */
  async getByBukid(
    bukidId: number,
    params?: Omit<PitakFilters, "bukidId">
  ): Promise<PitaksResponse> {
    return this.getAll({ ...params, bukidId });
  }

  /**
   * Get pitak statistics
   */
  async getStats(bukidId?: number): Promise<PitakStatsResponse> {
    try {
      const response = await this.call<PitakStatsResponse>("getPitakStats", { bukidId });
      if (response.status) return response;
      throw new Error(response.message || "Failed to fetch stats");
    } catch (error: any) {
      throw new Error(error.message || "Failed to fetch stats");
    }
  }

  // ✏️ WRITE

  /**
   * Create a new pitak
   */
  async create(data: PitakCreateData): Promise<PitakResponse> {
    try {
      // Convert area to areaSqm if needed
      const payload = { ...data };
      if (payload.area !== undefined && payload.areaSqm === undefined) {
        payload.areaSqm = payload.area;
        delete payload.area;
      }
      const response = await this.call<PitakResponse>("createPitak", payload);
      if (response.status) return response;
      throw new Error(response.message || "Failed to create pitak");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create pitak");
    }
  }

  /**
   * Update an existing pitak
   */
  async update(id: number, data: PitakUpdateData): Promise<PitakResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const payload = { ...data };
      if (payload.area !== undefined && payload.areaSqm === undefined) {
        payload.areaSqm = payload.area;
        delete payload.area;
      }
      const response = await this.call<PitakResponse>("updatePitak", { id, ...payload });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update pitak");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update pitak");
    }
  }

  /**
   * Update pitak status
   */
  async updateStatus(
    id: number,
    status: "active" | "completed" | "cancelled"
  ): Promise<PitakResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PitakResponse>("updateStatus", { id, status });
      if (response.status) return response;
      throw new Error(response.message || "Failed to update pitak status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update pitak status");
    }
  }

  /**
   * Soft delete a pitak
   */
  async delete(id: number): Promise<PitakResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PitakResponse>("deletePitak", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to delete pitak");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete pitak");
    }
  }

  /**
   * Restore a soft-deleted pitak
   */
  async restore(id: number): Promise<PitakResponse> {
    try {
      if (!id || id <= 0) throw new Error("Invalid ID");
      const response = await this.call<PitakResponse>("restorePitak", { id });
      if (response.status) return response;
      throw new Error(response.message || "Failed to restore pitak");
    } catch (error: any) {
      throw new Error(error.message || "Failed to restore pitak");
    }
  }
}

const pitakAPI = new PitakAPI();
export default pitakAPI;