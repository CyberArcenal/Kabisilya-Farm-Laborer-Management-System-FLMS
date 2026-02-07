// workerAPI.ts - Refactored to align with IPC handlers
import { kabAuthStore } from "../lib/kabAuthStore";

// ============================================================================
// INTERFACE DEFINITIONS
// ============================================================================

export interface WorkerData {
  id: number;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  status: "active" | "inactive" | "on-leave" | "terminated";
  hireDate: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export interface WorkerWithRelations extends WorkerData {
  debts?: any[];
  payments?: any[];
  assignments?: any[];
}

// Financial data is now calculated, not stored
export interface WorkerFinancialSummary {
  totalDebt: number;
  totalPaid: number;
  currentBalance: number;
}

export interface WorkerDebtSummary {
  debts: any[];
  summary: {
    totalDebts: number;
    totalOriginalAmount: number;
    totalAmount: number;
    totalBalance: number;
    totalInterest: number;
    totalPaid: number;
    byStatus: {
      pending: number;
      partially_paid: number;
      paid: number;
      cancelled: number;
      overdue: number;
    };
    overdueDebts: any[];
    averageInterestRate: number;
  };
  counts: {
    activeDebts: number;
    completedDebts: number;
    overdueCount: number;
  };
}

export interface WorkerPaymentSummary {
  payments: any[];
  summary: {
    totalPayments: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalDebtDeduction: number;
    totalOtherDeductions: number;
    byStatus: {
      pending: number;
      processing: number;
      completed: number;
      cancelled: number;
      partially_paid: number;
    };
    byPaymentMethod: Record<string, { count: number; totalAmount: number }>;
    averageNetPay: number;
  };
  groupedPayments?: any[];
  recentPayments: any[];
}

export interface WorkerAssignmentSummary {
  assignments: any[];
  summary: {
    totalAssignments: number;
    totalLuwang: number;
    byStatus: {
      active: number;
      completed: number;
      cancelled: number;
    };
    byBukid: Record<string, { count: number; totalLuwang: number; pitaks: string[] }>;
    byPitak: Record<string, { count: number; totalLuwang: number; bukid: string }>;
    averageLuwang: number;
    recentActivity: any[];
  };
  groupedAssignments?: any[];
  productivity: {
    totalDaysWorked: number;
    averageLuwangPerDay: number;
  };
}

export interface WorkerSummary {
  worker: WorkerData;
  summary: {
    basicInfo: {
      name: string;
      status: string;
      hireDate: string | Date | null;
      daysEmployed: number;
    };
    counts: {
      totalDebts: number;
      totalPayments: number;
      totalAssignments: number;
      activeAssignments: number;
    };
    financial: {
      totalDebt: number;
      totalPaid: number;
      currentBalance: number;
      activeDebt: number;
    };
  };
}

export interface WorkerStats {
  totals: {
    all: number;
    active: number;
    inactive: number;
    onLeave: number;
    terminated: number;
  };
  distribution: {
    byStatus: Array<{ status: string; count: number }>;
  };
  financial: {
    totalBalance: number;
    totalDebt: number;
    totalPaid: number;
    averageBalance: number;
    averageDebt: number;
  };
  trends: {
    recentHires: number;
    hireRate: number;
  };
  percentages: {
    activeRate: number;
    turnoverRate: number;
  };
}

export interface WorkerAttendance {
  period: {
    month: number;
    year: number;
    monthName: string;
    startDate: string | Date;
    endDate: string | Date;
  };
  attendance: Array<{
    date: string;
    day: number;
    dayOfWeek: string;
    isWeekend: boolean;
    assignments: any[];
    hasWork: boolean;
    totalLuwang: number;
  }>;
  weeks: Array<{
    week: number;
    days: any[];
    summary: {
      daysInWeek: number;
      daysWorked: number;
      totalLuwang: number;
      averageLuwang: number;
    };
  }>;
  summary: {
    totalDays: number;
    workingDays: number;
    daysWorked: number;
    daysOff: number;
    weekendDaysWorked: number;
    totalLuwang: number;
    averageLuwangPerDay: number;
    attendanceRate: number;
  };
  recentMonths: Array<{
    month: string;
    year: number;
    display: string;
  }>;
}

export interface WorkerPerformance {
  period: {
    type: string;
    current: {
      start: string | Date;
      end: string | Date;
      label: string;
    };
    previous: {
      start: string | Date;
      end: string | Date;
      label: string;
    } | null;
  };
  currentPeriod: {
    assignments: {
      total: number;
      completed: number;
      active: number;
      totalLuwang: number;
      completionRate: number;
    };
    payments: {
      total: number;
      totalNetPay: number;
      averageNetPay: number;
    };
    productivity: {
      luwangPerDay: number;
      earningsPerLuwang: number;
    };
  };
  previousPeriod: {
    assignments: {
      total: number;
      completed: number;
      totalLuwang: number;
      completionRate: number;
    };
    payments: {
      total: number;
      totalNetPay: number;
    };
  } | null;
  comparison: {
    assignments: {
      totalChange: number;
      luwangChange: number;
      completionRateChange: number;
    };
    payments: {
      totalChange: number;
      netPayChange: number;
    };
    trends: {
      improving: boolean;
      declining: boolean;
      stable: boolean;
    };
  } | null;
  performance: {
    score: number;
    grade: string;
    metrics: {
      attendance: string;
      quality: string;
      productivity: string;
    };
  };
  recommendations: Array<{
    type: string;
    area: string;
    current: string;
    target: string;
    suggestion: string;
  }>;
  highlights: {
    bestMetric: { name: string; value: number };
    areaForImprovement: string;
  };
}

export interface WorkerReport {
  report: any;
  metadata: {
    workerId: number;
    reportType: string;
    period: string | { startDate: string; endDate: string };
    generatedAt: string | Date;
    format: string;
  };
}

export interface WorkerCreateData {
  name: string;
  contact?: string | null;
  email?: string | null;
  address?: string | null;
  status?: "active" | "inactive" | "on-leave" | "terminated";
  hireDate?: string | Date;
}

export interface WorkerUpdateData {
  id: number;
  name?: string;
  contact?: string | null;
  email?: string | null;
  address?: string | null;
  status?: "active" | "inactive" | "on-leave" | "terminated";
  hireDate?: string | Date;
}

export interface WorkerSearchParams {
  query: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  status?: string | null;
}

export interface WorkerBulkCreateData {
  workers: WorkerCreateData[];
}

export interface WorkerBulkUpdateData {
  updates: Array<{
    id: number;
    [key: string]: any;
  }>;
}

export interface WorkerExportParams {
  workerIds?: number[];
  status?: string | null;
  startDate?: string | Date;
  endDate?: string | Date;
  includeFields?: string | string[] | "all";
}

export interface WorkerImportCSVParams {
  filePath: string;
  hasHeader?: boolean;
  delimiter?: string;
}

export interface WorkerUpdateStatusParams {
  id: number;
  status: "active" | "inactive" | "on-leave" | "terminated";
  notes?: string;
}

export interface WorkerUpdateContactParams {
  id: number;
  contact?: string | null;
  email?: string | null;
  address?: string | null;
}

// ============================================================================
// RESPONSE INTERFACES
// ============================================================================

export interface WorkerResponse<T = any> {
  status: boolean;
  message: string;
  data: T | null;
}

export interface WorkerListResponse {
  workers: WorkerData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  stats?: any;
}

export interface WorkerDetailResponse {
  worker: WorkerWithRelations;
}

// ============================================================================
// WORKER API CLASS
// ============================================================================

export class WorkerAPI {
  private getCurrentUserId(): number | null {
    try {
      const user = kabAuthStore.getUser();
      if (user && user.id) {
        const userId = typeof user.id === "string" ? parseInt(user.id, 10) : user.id;
        return isNaN(userId) ? null : userId;
      }
      return null;
    } catch (error) {
      console.error("Error getting current user ID:", error);
      return null;
    }
  }

  private enrichParams(params: any = {}): any {
    const userId = this.getCurrentUserId();
    return { ...params, _userId: userId !== null ? userId : 0 };
  }

  // ============================================================================
  // 📋 READ-ONLY METHODS
  // ============================================================================

  async getAllWorkers(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
  }): Promise<WorkerResponse<WorkerListResponse>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getAllWorkers",
        params: this.enrichParams(params || {}),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get all workers",
        data: null,
      };
    }
  }

  async getWorkerById(id: number): Promise<WorkerResponse<WorkerDetailResponse>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerById",
        params: this.enrichParams({ id }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker",
        data: null,
      };
    }
  }

  async getWorkerByName(name: string): Promise<WorkerResponse<{ workers: WorkerData[] }>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerByName",
        params: this.enrichParams({ name }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker by name",
        data: null,
      };
    }
  }

  async getWorkerByStatus(
    status: string,
    params?: { page?: number; limit?: number }
  ): Promise<WorkerResponse<WorkerListResponse>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerByStatus",
        params: this.enrichParams({ status, ...params }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get workers by status",
        data: null,
      };
    }
  }

  async getWorkerWithDebts(id: number): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerWithDebts",
        params: this.enrichParams({ id }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker with debts",
        data: null,
      };
    }
  }

  async getWorkerWithPayments(
    id: number,
    periodStart?: string,
    periodEnd?: string
  ): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerWithPayments",
        params: this.enrichParams({ id, periodStart, periodEnd }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker with payments",
        data: null,
      };
    }
  }

  async getWorkerWithAssignments(
    id: number,
    startDate?: string,
    endDate?: string,
    groupBy?: string
  ): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerWithAssignments",
        params: this.enrichParams({ id, startDate, endDate, groupBy }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker with assignments",
        data: null,
      };
    }
  }

  async getWorkerSummary(id: number): Promise<WorkerResponse<WorkerSummary>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerSummary",
        params: this.enrichParams({ id }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker summary",
        data: null,
      };
    }
  }

  async getActiveWorkers(params?: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: "ASC" | "DESC";
    includeStats?: boolean;
  }): Promise<WorkerResponse<WorkerListResponse>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getActiveWorkers",
        params: this.enrichParams(params || {}),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get active workers",
        data: null,
      };
    }
  }

  async getWorkerStats(): Promise<WorkerResponse<{ stats: WorkerStats }>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerStats",
        params: this.enrichParams({}),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker statistics",
        data: null,
      };
    }
  }

  async searchWorkers(params: WorkerSearchParams): Promise<WorkerResponse<WorkerListResponse>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "searchWorkers",
        params: this.enrichParams(params),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to search workers",
        data: null,
      };
    }
  }

  // ============================================================================
  // 💰 FINANCIAL METHODS
  // ============================================================================

  async getWorkerDebtSummary(
    workerId: number,
    includeHistory?: boolean
  ): Promise<WorkerResponse<WorkerDebtSummary>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerDebtSummary",
        params: this.enrichParams({ workerId, includeHistory }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker debt summary",
        data: null,
      };
    }
  }

  async getWorkerPaymentSummary(
    workerId: number,
    periodStart?: string,
    periodEnd?: string,
    groupBy?: string
  ): Promise<WorkerResponse<WorkerPaymentSummary>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerPaymentSummary",
        params: this.enrichParams({ workerId, periodStart, periodEnd, groupBy }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker payment summary",
        data: null,
      };
    }
  }

  async getWorkerAssignmentSummary(
    workerId: number,
    startDate?: string,
    endDate?: string,
    groupBy?: string
  ): Promise<WorkerResponse<WorkerAssignmentSummary>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerAssignmentSummary",
        params: this.enrichParams({ workerId, startDate, endDate, groupBy }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker assignment summary",
        data: null,
      };
    }
  }

  async calculateWorkerBalance(
    workerId: number
  ): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "calculateWorkerBalance",
        params: this.enrichParams({ workerId }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to calculate worker balance",
        data: null,
      };
    }
  }

  // ============================================================================
  // 📊 REPORT METHODS
  // ============================================================================

  async getWorkerAttendance(
    workerId: number,
    month?: number,
    year?: number
  ): Promise<WorkerResponse<WorkerAttendance>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerAttendance",
        params: this.enrichParams({ workerId, month, year }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker attendance",
        data: null,
      };
    }
  }

  async getWorkerPerformance(
    workerId: number,
    period?: string,
    compareToPrevious?: boolean
  ): Promise<WorkerResponse<WorkerPerformance>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "getWorkerPerformance",
        params: this.enrichParams({ workerId, period, compareToPrevious }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to get worker performance",
        data: null,
      };
    }
  }

  async generateWorkerReport(
    workerId: number,
    reportType?: string,
    startDate?: string,
    endDate?: string,
    format?: string
  ): Promise<WorkerResponse<WorkerReport>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "generateWorkerReport",
        params: this.enrichParams({ workerId, reportType, startDate, endDate, format }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to generate worker report",
        data: null,
      };
    }
  }

  // ============================================================================
  // ✏️ WRITE METHODS
  // ============================================================================

  async createWorker(data: WorkerCreateData): Promise<WorkerResponse<{ worker: WorkerData }>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "createWorker",
        params: this.enrichParams(data),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to create worker",
        data: null,
      };
    }
  }

  async updateWorker(data: WorkerUpdateData): Promise<WorkerResponse<{ worker: WorkerData }>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "updateWorker",
        params: this.enrichParams(data),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to update worker",
        data: null,
      };
    }
  }

  async deleteWorker(id: number): Promise<WorkerResponse<{ id: number }>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "deleteWorker",
        params: this.enrichParams({ id }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to delete worker",
        data: null,
      };
    }
  }

  async updateWorkerStatus(
    id: number,
    status: "active" | "inactive" | "on-leave" | "terminated",
    notes?: string
  ): Promise<WorkerResponse<{ worker: WorkerData; change: { oldStatus: string; newStatus: string } }>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "updateWorkerStatus",
        params: this.enrichParams({ id, status, notes }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to update worker status",
        data: null,
      };
    }
  }

  async updateWorkerContact(
    id: number,
    contact?: string | null,
    email?: string | null,
    address?: string | null
  ): Promise<WorkerResponse<{ worker: WorkerData }>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "updateWorkerContact",
        params: this.enrichParams({ id, contact, email, address }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to update worker contact",
        data: null,
      };
    }
  }

  // ============================================================================
  // 🔄 BATCH OPERATIONS
  // ============================================================================

  async bulkCreateWorkers(data: WorkerBulkCreateData): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "bulkCreateWorkers",
        params: this.enrichParams(data),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to bulk create workers",
        data: null,
      };
    }
  }

  async bulkUpdateWorkers(data: WorkerBulkUpdateData): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "bulkUpdateWorkers",
        params: this.enrichParams(data),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to bulk update workers",
        data: null,
      };
    }
  }

  async importWorkersFromCSV(
    filePath: string,
    hasHeader: boolean = true,
    delimiter: string = ","
  ): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "importWorkersFromCSV",
        params: this.enrichParams({ filePath, hasHeader, delimiter }),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to import workers from CSV",
        data: null,
      };
    }
  }

  async exportWorkersToCSV(params: WorkerExportParams): Promise<WorkerResponse<any>> {
    try {
      if (!window.backendAPI?.worker) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.worker({
        method: "exportWorkersToCSV",
        params: this.enrichParams(params),
      });

      return response;
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Failed to export workers to CSV",
        data: null,
      };
    }
  }

  // ============================================================================
  // 🛠️ UTILITY METHODS
  // ============================================================================

  async searchWorkerByName(name: string): Promise<WorkerData | null> {
    try {
      const response = await this.getWorkerByName(name);
      if (response.status && (response.data?.workers?.length || 0) > 0) {
        if(!response.data){
          throw new Error("Invalid response data");
        }
        return response.data?.workers[0];
      }
      return null;
    } catch (error) {
      console.error("Error searching worker by name:", error);
      return null;
    }
  }

  async getActiveWorkerCount(): Promise<number> {
    try {
      const response = await this.getWorkerStats();
      if (response.status && response.data?.stats) {
        return response.data.stats.totals.active;
      }
      return 0;
    } catch (error) {
      console.error("Error getting active worker count:", error);
      return 0;
    }
  }

  async isWorkerActive(workerId: number): Promise<boolean> {
    try {
      const response = await this.getWorkerById(workerId);
      return response.status && response.data?.worker?.status === "active";
    } catch (error) {
      console.error("Error checking if worker is active:", error);
      return false;
    }
  }

  async getWorkerFinancialSummary(workerId: number): Promise<WorkerFinancialSummary | null> {
    try {
      const response = await this.getWorkerSummary(workerId);
      if (response.status && response.data?.summary) {
        const { totalDebt, totalPaid, currentBalance } = response.data.summary.financial;
        return { totalDebt, totalPaid, currentBalance };
      }
      return null;
    } catch (error) {
      console.error("Error getting worker financial summary:", error);
      return null;
    }
  }

  async validateWorkerEmail(email: string): Promise<boolean> {
    try {
      const response = await this.searchWorkers({ query: email, limit: 1 });
      return response.status ? response.data?.workers.length === 0 : false;
    } catch (error) {
      console.error("Error validating worker email:", error);
      return false;
    }
  }

  async calculateWorkerMetrics(workerId: number): Promise<{
    attendanceRate: number;
    productivityScore: number;
    completionRate: number;
    financialHealth: string;
  } | null> {
    try {
      const [attendanceRes, performanceRes] = await Promise.all([
        this.getWorkerAttendance(workerId),
        this.getWorkerPerformance(workerId, "month", false),
      ]);

      const attendanceRate = attendanceRes.data?.summary?.attendanceRate || 0;
      const productivityScore = performanceRes.data?.performance?.score || 0;
      const completionRate = performanceRes.data?.currentPeriod?.assignments.completionRate || 0;

      let financialHealth = "good";
      const financialSummary = await this.getWorkerFinancialSummary(workerId);
      if (financialSummary) {
        if (financialSummary.currentBalance > 10000) financialHealth = "critical";
        else if (financialSummary.currentBalance > 5000) financialHealth = "warning";
        else if (financialSummary.currentBalance > 0) financialHealth = "moderate";
        else financialHealth = "good";
      }

      return {
        attendanceRate,
        productivityScore,
        completionRate,
        financialHealth,
      };
    } catch (error) {
      console.error("Error calculating worker metrics:", error);
      return null;
    }
  }

  async createWorkerWithValidation(data: WorkerCreateData): Promise<WorkerResponse<{ worker: WorkerData }>> {
    try {
      // Validate required fields
      if (!data.name || data.name.trim() === "") {
        throw new Error("Worker name is required");
      }

      // Validate email if provided
      if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          throw new Error("Invalid email format");
        }

        // Check if email already exists
        const isEmailAvailable = await this.validateWorkerEmail(data.email);
        if (!isEmailAvailable) {
          throw new Error("Email already exists");
        }
      }

      // Validate status
      const validStatuses = ["active", "inactive", "on-leave", "terminated"];
      if (data.status && !validStatuses.includes(data.status)) {
        throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
      }

      return await this.createWorker(data);
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Validation failed",
        data: null,
      };
    }
  }

  async updateWorkerWithValidation(data: WorkerUpdateData): Promise<WorkerResponse<{ worker: WorkerData }>> {
    try {
      if (!data.id) {
        throw new Error("Worker ID is required");
      }

      // Get current worker data
      const currentWorker = await this.getWorkerById(data.id);
      if (!currentWorker.status || !currentWorker.data) {
        throw new Error("Worker not found");
      }

      // Validate email if being changed
      if (data.email && data.email !== currentWorker.data.worker.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          throw new Error("Invalid email format");
        }

        const isEmailAvailable = await this.validateWorkerEmail(data.email);
        if (!isEmailAvailable) {
          throw new Error("Email already exists");
        }
      }

      // Validate status
      if (data.status) {
        const validStatuses = ["active", "inactive", "on-leave", "terminated"];
        if (!validStatuses.includes(data.status)) {
          throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
      }

      return await this.updateWorker(data);
    } catch (error: any) {
      return {
        status: false,
        message: error.message || "Validation failed",
        data: null,
      };
    }
  }

  async getWorkersWithDebt(debtThreshold: number = 0): Promise<WorkerData[]> {
    try {
      const response = await this.getAllWorkers({ limit: 1000 });
      if (!response.status || !response.data) return [];

      return response.data.workers.filter((worker) => {
        // Note: Workers don't have financial fields directly
        // You'd need to call getWorkerSummary for each or optimize differently
        return false; // Placeholder
      });
    } catch (error) {
      console.error("Error getting workers with debt:", error);
      return [];
    }
  }

  // ============================================================================
  // 📊 STATISTICS UTILITIES
  // ============================================================================

  async getWorkerStatistics(): Promise<{
    total: number;
    active: number;
    inactive: number;
    withDebt: number;
    averageBalance: number;
  }> {
    try {
      const statsRes = await this.getWorkerStats();
      if (!statsRes.status || !statsRes.data) {
        throw new Error("Failed to get worker statistics");
      }

      const stats = statsRes.data.stats;

      return {
        total: stats.totals.all,
        active: stats.totals.active,
        inactive: stats.totals.inactive + stats.totals.terminated,
        withDebt: 0, // Would require additional calculation
        averageBalance: stats.financial.averageBalance,
      };
    } catch (error) {
      console.error("Error getting worker statistics:", error);
      return {
        total: 0,
        active: 0,
        inactive: 0,
        withDebt: 0,
        averageBalance: 0,
      };
    }
  }

  // ============================================================================
  // 🎯 EVENT LISTENERS (if supported by backend)
  // ============================================================================

  onWorkerCreated(callback: (data: WorkerData) => void) {
    if (window.backendAPI && window.backendAPI.onWorkerCreated) {
      window.backendAPI.onWorkerCreated(callback);
    }
  }

  onWorkerUpdated(callback: (data: { id: number; changes: any }) => void) {
    if (window.backendAPI && window.backendAPI.onWorkerUpdated) {
      window.backendAPI.onWorkerUpdated(callback);
    }
  }

  onWorkerDeleted(callback: (id: number) => void) {
    if (window.backendAPI && window.backendAPI.onWorkerDeleted) {
      window.backendAPI.onWorkerDeleted(callback);
    }
  }

  onWorkerStatusChanged(
    callback: (data: { id: number; oldStatus: string; newStatus: string }) => void
  ) {
    if (window.backendAPI && window.backendAPI.onWorkerStatusChanged) {
      window.backendAPI.onWorkerStatusChanged(callback);
    }
  }
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

const workerAPI = new WorkerAPI();
export default workerAPI;