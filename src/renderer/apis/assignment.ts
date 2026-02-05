import { kabAuthStore } from "../lib/kabAuthStore";
import type { WorkerData } from "./worker";

// assignmentAPI.ts - API for Assignment Management
export interface Assignment {
  id: number;
  name:string;
  luwangCount: string; // Changed from string to number
  assignmentDate: string;
  status: "active" | "completed" | "cancelled";
  notes?: string;
  createdAt: string;
  updatedAt: string;
  worker?: {
    id: number;
    name: string;
    code: string;
    contactNumber?: string;
  };
  pitak?: {
    id: number;
    name: string;
    code: string;
    location?: string;
  };
}

export interface Worker {
  status: 'active' | 'inactive' | 'on-leave' | 'terminated';
  email: any;
  contact: any;
  id: number;
  name: string;
}

export interface Pitak {
  id: number;
  name: string;
  code: string;
  location?: string;
}

export interface AssignmentFilters {
  dateFrom?: string;
  dateTo?: string;
  status?: "active" | "completed" | "cancelled";
  workerId?: number;
  pitakId?: number;
}

export interface AssignmentStats {
  totalAssignments: number;
  totalLuWang: string;
  byStatus: {
    active: { count: number; totalLuWang: number };
    completed: { count: number; totalLuWang: number };
    cancelled: { count: number; totalLuWang: number };
  };
  byDate: Array<{
    date: string;
    count: number;
    totalLuWang: number;
  }>;
  averages: {
    luwangPerAssignment: string;
    assignmentsPerDay: string;
  };
}

export interface AssignmentReport {
  report: Array<{
    id: number;
    date: string;
    luwangCount: string;
    status: string;
    worker?: {
      id: number;
      name: string;
      code: string;
    };
    pitak?: {
      id: number;
      name: string;
      code: string;
    };
    notes?: string;
  }>;
  summary: {
    totalAssignments: number;
    totalLuWang: string;
    byStatus: {
      active: number;
      completed: number;
      cancelled: number;
    };
    byWorker: Array<{
      name: string;
      totalAssignments: number;
      totalLuWang: number;
    }>;
    byPitak: Array<{
      name: string;
      totalAssignments: number;
      totalLuWang: number;
    }>;
  };
}

export interface WorkerPerformanceReport {
  worker: {
    id: number;
    name: string;
    code: string;
    contactNumber?: string;
  };
  totalAssignments: number;
  totalLuWang: string;
  averageLuWang: string;
  assignmentsByDate: Array<{
    date: string;
    assignments: number;
    totalLuWang: number;
  }>;
  performanceMetrics: {
    completionRate: string;
    averageLuWangPerDay: string;
    consistencyScore: string;
  };
}

export interface PitakSummaryReport {
  pitak: {
    id: number;
    name: string;
    code: string;
    location?: string;
  };
  totalAssignments: number;
  totalLuWang: string;
  averageLuWang: string;
  uniqueWorkers: number;
  utilizationMetrics: {
    assignmentDays: number;
    workerDays: number;
    utilizationRate: string;
  };
}

export interface AssignmentHistory {
  type: "CREATED" | "STATUS_CHANGE" | "LUWANG_UPDATE" | "REASSIGNMENT" | "NOTE";
  timestamp: string;
  details?: string;
  from?: any;
  to?: any;
  reason?: string;
  content?: string;
}

export interface AssignmentResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
  meta?: any;
}

export interface BulkCreateAssignment {
  workerIds: number[];
  pitakId: number;
  luwangCount?: number;
  assignmentDate: string;
  status?: "active" | "completed" | "cancelled";
  notes?: string;
}

export interface AssignmentPayload {
  method: string;
  params?: Record<string, any>;
}

class AssignmentAPI {
  // Helper method to get current user ID
  private getCurrentUserId(): number | null {
    try {
      const user = kabAuthStore.getUser();
      if (user && user.id) {
        const userId =
          typeof user.id === "string" ? parseInt(user.id, 10) : user.id;
        return isNaN(userId) ? null : userId;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  }

  // Helper method to enrich params with userId
  private enrichParams(params: any = {}): any {
    const userId = this.getCurrentUserId();
    return { ...params, userId: userId !== null ? userId : 0 };
  }

  // Helper method to normalize assignment data from backend
  private normalizeAssignment(data: any): Assignment {
    return {
      ...data,
      luwangCount:
        typeof data.luwangCount === "string"
          ? parseFloat(data.luwangCount)
          : data.luwangCount,
      assignmentDate:
        data.assignmentDate instanceof Date
          ? data.assignmentDate.toISOString().split("T")[0]
          : data.assignmentDate,
      createdAt:
        data.createdAt instanceof Date
          ? data.createdAt.toISOString()
          : data.createdAt,
      updatedAt:
        data.updatedAt instanceof Date
          ? data.updatedAt.toISOString()
          : data.updatedAt,
    };
  }

  // Helper method to normalize assignments array
  private normalizeAssignments(data: any[]): Assignment[] {
    return data.map((item) => this.normalizeAssignment(item));
  }

  // 🔎 Read-only methods

  /**
   * Get all assignments with optional filters
   */
  async getAllAssignments(
    filters?: AssignmentFilters,
  ): Promise<AssignmentResponse<Assignment[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAllAssignments",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignments(response.data),
        };
      }
      throw new Error(response.message || "Failed to get assignments");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignments");
    }
  }

  /**
   * Get assignment by ID
   */
  async getAssignmentById(id: number): Promise<AssignmentResponse<Assignment>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentById",
        params: this.enrichParams({ id }),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignment(response.data),
        };
      }
      throw new Error(response.message || "Failed to get assignment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignment");
    }
  }

  /**
   * Get assignments by date
   */
  async getAssignmentsByDate(
    date: string,
    filters?: AssignmentFilters,
  ): Promise<AssignmentResponse<Assignment[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentsByDate",
        params: this.enrichParams({ date, filters }),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignments(response.data),
        };
      }
      throw new Error(response.message || "Failed to get assignments by date");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignments by date");
    }
  }

  /**
   * Get assignments by status
   */
  async getAssignmentsByStatus(
    status: "active" | "completed" | "cancelled",
    filters?: AssignmentFilters,
  ): Promise<AssignmentResponse<Assignment[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentsByStatus",
        params: this.enrichParams({ status, filters }),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignments(response.data),
        };
      }
      throw new Error(
        response.message || "Failed to get assignments by status",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignments by status");
    }
  }

  /**
   * Get assignments by worker
   */
  async getAssignmentsByWorker(
    workerId: number,
    filters?: AssignmentFilters,
  ): Promise<{
    status: true;
    message: string;
    data: {
      worker: WorkerData;
      assignments: Assignment[];
      statistics: {
        totalAssignments: number;
        totalLuWang: string;
        averageLuWang: string;
        byStatus: { active: number; completed: number; cancelled: number };
        byMonth: Array<{
          month: string;
          count: number;
          totalLuWang: number;
          averageLuWang: string;
        }>;
      };
    };
  }> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentsByWorker",
        params: this.enrichParams({ workerId, filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to get assignments by worker",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignments by worker");
    }
  }

  /**
   * Get assignments by pitak - FIXED VERSION
   */
  async getAssignmentsByPitak(
    pitakId: number,
    filters?: AssignmentFilters,
  ): Promise<
    AssignmentResponse<{
      pitak: Pitak;
      assignments: Assignment[];
      statistics: any;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const params: any = { pitakId };
      if (filters) {
        params.filters = filters;
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentsByPitak",
        params: this.enrichParams(params),
      });

      if (response.status) {
        return {
          ...response,
          data: {
            ...response.data,
            assignments: this.normalizeAssignments(
              response.data.assignments || [],
            ),
          },
        };
      }
      throw new Error(response.message || "Failed to get assignments by pitak");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignments by pitak");
    }
  }

  /**
   * Get active assignments
   */
  async getActiveAssignments(filters?: AssignmentFilters): Promise<
    AssignmentResponse<{
      assignments: Assignment[];
      groupedByDate: any;
      meta: any;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getActiveAssignments",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return {
          ...response,
          data: {
            ...response.data,
            assignments: this.normalizeAssignments(
              response.data.assignments || [],
            ),
          },
        };
      }
      throw new Error(response.message || "Failed to get active assignments");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get active assignments");
    }
  }

  /**
   * Get completed assignments
   */
  async getCompletedAssignments(
    filters?: AssignmentFilters,
  ): Promise<AssignmentResponse<Assignment[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getCompletedAssignments",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignments(response.data),
        };
      }
      throw new Error(
        response.message || "Failed to get completed assignments",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to get completed assignments");
    }
  }

  /**
   * Get cancelled assignments
   */
  async getCancelledAssignments(
    filters?: AssignmentFilters,
  ): Promise<AssignmentResponse<Assignment[]>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getCancelledAssignments",
        params: this.enrichParams({ filters }),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignments(response.data),
        };
      }
      throw new Error(
        response.message || "Failed to get cancelled assignments",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to get cancelled assignments");
    }
  }

  /**
   * Get assignment statistics
   */
  async getAssignmentStats(dateRange?: {
    startDate: string;
    endDate: string;
  }): Promise<AssignmentResponse<AssignmentStats>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentStats",
        params: this.enrichParams({ date_range: dateRange }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get assignment stats");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignment stats");
    }
  }

  /**
   * Get assignment history
   */
  async getAssignmentHistory(assignmentId: number): Promise<
    AssignmentResponse<{
      assignment: Assignment;
      history: AssignmentHistory[];
      summary: any;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentHistory",
        params: this.enrichParams({ assignmentId }),
      });

      if (response.status) {
        return {
          ...response,
          data: {
            ...response.data,
            assignment: this.normalizeAssignment(response.data.assignment),
          },
        };
      }
      throw new Error(response.message || "Failed to get assignment history");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignment history");
    }
  }

  /**
   * Search assignments
   */
  async searchAssignments(
    query: string,
  ): Promise<
    AssignmentResponse<{ results: any; suggestions: any; searchTerm: string }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "searchAssignments",
        params: this.enrichParams({ query }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to search assignments");
    } catch (error: any) {
      throw new Error(error.message || "Failed to search assignments");
    }
  }

  // 📊 Report methods

  /**
   * Get assignment report
   */
  async getAssignmentReport(
    dateRange: { startDate: string; endDate: string },
    filters?: AssignmentFilters,
  ): Promise<
    AssignmentResponse<{ report: any; summary: any; dateRange: any }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getAssignmentReport",
        params: this.enrichParams({ date_range: dateRange, filters }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get assignment report");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get assignment report");
    }
  }

  /**
   * Get worker performance report
   */
  async getWorkerPerformanceReport(
    workerId: number,
    dateRange?: { startDate: string; endDate: string },
  ): Promise<
    AssignmentResponse<{ report: WorkerPerformanceReport[]; summary: any }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getWorkerPerformanceReport",
        params: this.enrichParams({ workerId, date_range: dateRange }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to get worker performance report",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to get worker performance report",
      );
    }
  }

  /**
   * Get pitak summary report
   */
  async getPitakSummaryReport(
    pitakId: number,
    dateRange?: { startDate: string; endDate: string },
  ): Promise<
    AssignmentResponse<{ report: PitakSummaryReport[]; summary: any }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "getPitakSummaryReport",
        params: this.enrichParams({ pitakId, date_range: dateRange }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to get pitak summary report");
    } catch (error: any) {
      throw new Error(error.message || "Failed to get pitak summary report");
    }
  }

  // ✏️ Write operation methods

  /**
   * Create a new assignment
   */
  async createAssignment(data: {
    workerIds: number[];
    pitakId: number;
    luwangCount?: number;
    assignmentDate: string;
    notes?: string;
  }): Promise<{
    status: boolean;
    message: string;
    data: {
      assignments: Assignment[];
      summary: {
        totalWorkers: number;
        totalLuWangCount: number;
        assignmentDate: string;
        pitakId: number;
      };
    } | null;
  }> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "createAssignment",
        params: this.enrichParams(data),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignment(response.data),
        };
      }
      throw new Error(response.message || "Failed to create assignment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to create assignment");
    }
  }

  /**
   * Update assignment
   */
  async updateAssignment(data: {
    assignmentId: number;
    workerId?: number;
    pitakId?: number;
    luwangCount?: number;
    assignmentDate?: string;
    notes?: string;
  }): Promise<AssignmentResponse<Assignment>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "updateAssignment",
        params: this.enrichParams(data),
      });

      if (response.status) {
        // Extract the assignment from the response data
        const assignmentData = response.data.assignment || response.data;
        return {
          status: true,
          message: response.message,
          data: this.normalizeAssignment(assignmentData),
        };
      }
      throw new Error(response.message || "Failed to update assignment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update assignment");
    }
  }

  /**
   * Delete assignment
   */
  async deleteAssignment(
    assignmentId: number,
    reason?: string,
  ): Promise<AssignmentResponse<{ deletedAssignment: Assignment }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "deleteAssignment",
        params: this.enrichParams({ assignmentId, reason }),
      });

      if (response.status) {
        return {
          ...response,
          data: {
            deletedAssignment: this.normalizeAssignment(
              response.data.deletedAssignment,
            ),
          },
        };
      }
      throw new Error(response.message || "Failed to delete assignment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to delete assignment");
    }
  }

  /**
   * Update assignment status
   */
  async updateAssignmentStatus(
    assignmentId: number,
    status: "active" | "completed" | "cancelled",
    notes?: string,
  ): Promise<
    AssignmentResponse<{
      id: number;
      previousStatus: string;
      newStatus: string;
      assignmentDate: string;
      worker: any;
      pitak: any;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "updateAssignmentStatus",
        params: this.enrichParams({ assignmentId, status, notes }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to update assignment status");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update assignment status");
    }
  }

  /**
   * Bulk update assignments
   */
  async bulkUpdateAssignments(data: {
    assignments?: number[];
    filters?: AssignmentFilters;
    updateData: {
      status?: "active" | "completed" | "cancelled";
      luwangCount?: number;
      notes?: string;
    };
  }): Promise<
    AssignmentResponse<{
      updatedAssignments: any[];
      skippedAssignments: any[];
      failedUpdates: any[];
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "bulkUpdateAssignments",
        params: this.enrichParams(data),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk update assignments");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk update assignments");
    }
  }

  /**
   * Reassign worker
   */
  async reassignWorker(
    assignmentId: number,
    newWorkerId: number,
    reason?: string,
  ): Promise<
    AssignmentResponse<{
      id: number;
      oldWorker: any;
      newWorker: any;
      assignmentDate: string;
      pitak: any;
      reassignmentNote: string;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "reassignWorker",
        params: this.enrichParams({ assignmentId, newWorkerId, reason }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to reassign worker");
    } catch (error: any) {
      throw new Error(error.message || "Failed to reassign worker");
    }
  }

  /**
   * Update luwang count
   */
  async updateLuWangCount(
    assignmentId: number,
    luwangCount: number,
    notes?: string,
  ): Promise<
    AssignmentResponse<{
      id: number;
      previousLuWang: string;
      newLuWang: string;
      difference: string;
      assignmentDate: string;
      worker: any;
      pitak: any;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "updateLuWangCount",
        params: this.enrichParams({ assignmentId, luwangCount, notes }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to update luwang count");
    } catch (error: any) {
      throw new Error(error.message || "Failed to update luwang count");
    }
  }

  /**
   * Add note to assignment
   */
  async addAssignmentNote(
    assignmentId: number,
    note: string,
    noteType?: string,
  ): Promise<AssignmentResponse<Assignment>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "addAssignmentNote",
        params: this.enrichParams({ assignmentId, note, noteType }),
      });

      if (response.status) {
        return {
          ...response,
          data: this.normalizeAssignment(response.data),
        };
      }
      throw new Error(response.message || "Failed to add note to assignment");
    } catch (error: any) {
      throw new Error(error.message || "Failed to add note to assignment");
    }
  }

  // 🔄 Batch operation methods

  /**
   * Bulk create assignments
   */
  async bulkCreateAssignments(
    assignments: BulkCreateAssignment[],
  ): Promise<AssignmentResponse<{ created: any[]; skipped: any[] }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "bulkCreateAssignments",
        params: this.enrichParams({ assignments }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to bulk create assignments");
    } catch (error: any) {
      throw new Error(error.message || "Failed to bulk create assignments");
    }
  }

  /**
   * Import assignments from CSV
   */
  async importAssignmentsFromCSV(
    filePath: string,
    options?: any,
  ): Promise<AssignmentResponse<{ results: any; summary: any }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "importAssignmentsFromCSV",
        params: this.enrichParams({ filePath, options }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to import assignments from CSV",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to import assignments from CSV");
    }
  }

  /**
   * Export assignments to CSV
   */
  async exportAssignmentsToCSV(
    filters?: AssignmentFilters,
    outputPath?: string,
  ): Promise<AssignmentResponse<{ fileInfo: any; summary: any }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "exportAssignmentsToCSV",
        params: this.enrichParams({ filters, outputPath }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to export assignments to CSV",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to export assignments to CSV");
    }
  }

  /**
   * Sync assignments from external source
   */
  async syncAssignmentsFromExternal(
    source: string,
    sourceData: any[],
    options?: any,
  ): Promise<AssignmentResponse<{ results: any; summary: any }>> {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "syncAssignmentsFromExternal",
        params: this.enrichParams({ source, sourceData, options }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(
        response.message || "Failed to sync assignments from external source",
      );
    } catch (error: any) {
      throw new Error(
        error.message || "Failed to sync assignments from external source",
      );
    }
  }

  // ⚙️ Validation methods

  /**
   * Validate assignment data
   */
  async validateAssignmentData(
    assignmentData: any,
    checkExisting: boolean = true,
  ): Promise<
    AssignmentResponse<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
      validatedData: any;
      suggestions: any[];
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "validateAssignmentData",
        params: this.enrichParams({ assignmentData, checkExisting }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to validate assignment data");
    } catch (error: any) {
      throw new Error(error.message || "Failed to validate assignment data");
    }
  }

  /**
   * Check worker availability
   */
  async checkWorkerAvailability(
    workerId: number,
    date: string,
    excludeAssignmentId?: number,
  ): Promise<
    AssignmentResponse<{
      isAvailable: boolean;
      existingAssignment?: Assignment;
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "checkWorkerAvailability",
        params: this.enrichParams({ workerId, date, excludeAssignmentId }),
      });

      if (response.status) {
        return {
          ...response,
          data: {
            ...response.data,
            existingAssignment: response.data.existingAssignment
              ? this.normalizeAssignment(response.data.existingAssignment)
              : undefined,
          },
        };
      }
      throw new Error(
        response.message || "Failed to check worker availability",
      );
    } catch (error: any) {
      throw new Error(error.message || "Failed to check worker availability");
    }
  }

  /**
   * Validate luwang count
   */
  async validateLuWangCount(
    luwangCount: number,
    assignmentId?: number,
    dateRange?: { startDate: string; endDate: string },
  ): Promise<
    AssignmentResponse<{
      isValid: boolean;
      errors: string[];
      warnings: string[];
      statistics: any;
      recommendations: any[];
    }>
  > {
    try {
      if (!window.backendAPI || !window.backendAPI.assignment) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.assignment({
        method: "validateLuWangCount",
        params: this.enrichParams({ luwangCount, assignmentId, dateRange }),
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || "Failed to validate luwang count");
    } catch (error: any) {
      throw new Error(error.message || "Failed to validate luwang count");
    }
  }

  // 🔧 Utility methods (similar to activationAPI)

  /**
   * Check if worker is available for assignment
   */
  async isWorkerAvailable(
    workerId: number,
    date: string,
    excludeAssignmentId?: number,
  ): Promise<boolean> {
    try {
      const response = await this.checkWorkerAvailability(
        workerId,
        date,
        excludeAssignmentId,
      );
      return response.data.isAvailable;
    } catch (error) {
      console.error("Error checking worker availability:", error);
      return false;
    }
  }

  /**
   * Get today's assignments
   */
  async getTodayAssignments(
    filters?: AssignmentFilters,
  ): Promise<Assignment[]> {
    try {
      const today = new Date().toISOString().split("T")[0];
      const response = await this.getAssignmentsByDate(today, filters);
      return response.data || [];
    } catch (error) {
      console.error("Error getting today's assignments:", error);
      return [];
    }
  }

  /**
   * Get assignments for date range
   */
  async getAssignmentsForDateRange(
    startDate: string,
    endDate: string,
    filters?: AssignmentFilters,
  ): Promise<Assignment[]> {
    try {
      const response = await this.getAllAssignments({
        ...filters,
        dateFrom: startDate,
        dateTo: endDate,
      });
      return response.data || [];
    } catch (error) {
      console.error("Error getting assignments for date range:", error);
      return [];
    }
  }

  /**
   * Create assignment with validation
   */
async createAssignmentWithValidation(data: {
  workerIds: number[];
  pitakId: number;
  luwangCount?: number;
  assignmentDate: string;
  notes?: string;
}): Promise<{
  status: boolean;
  message: string;
  data: {
    assignments: Assignment[];
    summary: {
      totalWorkers: number;
      totalLuWangCount: number;
      assignmentDate: string;
      pitakId: number;
    };
  } | null;
}> {
  try {
    const validation = await this.validateAssignmentData(data);

    if (!validation.data.isValid) {
      // combine errors + warnings into a readable message
      const errorMessages = [
        ...(validation.data.errors || []),
        ...(validation.data.warnings || [])
      ];

      return {
        status: false,
        message: errorMessages.length > 0
          ? `Validation failed: ${errorMessages.join("; ")}`
          : "Assignment data validation failed",
        data: null,
      };
    }

    return await this.createAssignment(data);
  } catch (error: any) {
    return {
      status: false,
      message: error.message || "Failed to create assignment",
      data: null,
    };
  }
}

  /**
   * Update assignment with validation
   */
  async updateAssignmentWithValidation(data: {
    assignmentId: number;
    workerId?: number;
    pitakId?: number;
    luwangCount?: number;
    assignmentDate?: string;
    notes?: string;
  }): Promise<AssignmentResponse<Assignment>> {
    try {
      const current = await this.getAssignmentById(data.assignmentId);

      if (!current.status) {
        return current;
      }

      const assignmentData = {
        ...current.data,
        ...data,
      };

      const validation = await this.validateAssignmentData(
        assignmentData,
        false,
      );

      if (!validation.data.isValid) {
        return {
          status: false,
          message: "Assignment data validation failed",
          data: {} as Assignment,
        };
      }

      // Now this will return AssignmentResponse<Assignment>
      return await this.updateAssignment(data);
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to update assignment",
        data: {} as Assignment,
      };
    }
  }

  /**
   * Complete assignment (convenience method)
   */
  async completeAssignment(
    assignmentId: number,
    notes?: string,
  ): Promise<AssignmentResponse<Assignment>> {
    try {
      const response = await this.updateAssignmentStatus(
        assignmentId,
        "completed",
        notes,
      );
      if (response.status) {
        // Get the updated assignment
        return await this.getAssignmentById(assignmentId);
      }
      return {
        status: false,
        message: response.message || "Failed to complete assignment",
        data: {} as Assignment,
      };
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to complete assignment",
        data: {} as Assignment,
      };
    }
  }

  /**
   * Cancel assignment (convenience method)
   */
  async cancelAssignment(
    assignmentId: number,
    reason: string,
  ): Promise<AssignmentResponse<Assignment>> {
    try {
      const response = await this.updateAssignmentStatus(
        assignmentId,
        "cancelled",
        reason,
      );
      if (response.status) {
        // Get the updated assignment
        return await this.getAssignmentById(assignmentId);
      }
      return {
        status: false,
        message: response.message || "Failed to cancel assignment",
        data: {} as Assignment,
      };
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to cancel assignment",
        data: {} as Assignment,
      };
    }
  }

  /**
   * Get assignment summary for dashboard
   */
  async getDashboardSummary(): Promise<{
    totalAssignments: number;
    activeAssignments: number;
    completedToday: number;
    totalLuWang: string;
  }> {
    try {
      const today = new Date().toISOString().split("T")[0];

      const todayAssignments = await this.getTodayAssignments();
      const completedToday = todayAssignments.filter(
        (a) => a.status === "completed",
      ).length;

      const activeResponse = await this.getActiveAssignments();
      const activeAssignments = activeResponse.data?.assignments?.length || 0;

      const stats = await this.getAssignmentStats();

      return {
        totalAssignments: stats.data?.totalAssignments || 0,
        activeAssignments,
        completedToday,
        totalLuWang: stats.data?.totalLuWang || "0.00",
      };
    } catch (error) {
      console.error("Error getting dashboard summary:", error);
      return {
        totalAssignments: 0,
        activeAssignments: 0,
        completedToday: 0,
        totalLuWang: "0.00",
      };
    }
  }

  /**
   * Generate report for current month
   */
  async getCurrentMonthReport(): Promise<
    AssignmentResponse<{ report: any; summary: any; dateRange: any }>
  > {
    try {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)
        .toISOString()
        .split("T")[0];

      return await this.getAssignmentReport(
        { startDate: firstDay, endDate: lastDay },
        { status: "completed" },
      );
    } catch (error: any) {
      throw new Error(
        `Failed to generate current month report: ${error.message}`,
      );
    }
  }
}

const assignmentAPI = new AssignmentAPI();

export default assignmentAPI;
