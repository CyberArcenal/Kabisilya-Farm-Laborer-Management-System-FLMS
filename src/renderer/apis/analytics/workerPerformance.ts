// workerPerformance.ts - Worker Performance Interfaces and Methods

import type { DashboardResponse } from "../dashboard";


export interface WorkersOverviewData {
  summary: {
    total: number;
    active: number;
    inactive: number;
    onLeave: number;
    activePercentage: number;
  };
  financial: {
    totalDebt: number;
    averageDebt: number;
    topDebtors: Array<{
      id: any;
      name: any;
      totalDebt: number;
      currentBalance: number;
    }>;
  };
  assignments: {
    active: number;
    averagePerWorker: number;
  };
  lastUpdated: Date;
}

export interface WorkerPerformanceData {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  performance: Array<{
    workerId: any;
    workerName: any;
    assignmentsCompleted: number;
    totalLuwang: number;
    totalGrossPay: number;
    totalNetPay: number;
    paymentCount: number;
    productivityScore: number;
  }>;
  metrics: {
    totalWorkers: number;
    totalAssignments: number;
    totalLuwang: number;
    averageLuwangPerWorker: number;
    totalNetPay: number;
    averageNetPay: number;
  };
}

export interface WorkerStatusSummaryData {
  statusBreakdown: Array<{
    status: string;
    count: number;
    percentage: number;
  }>;
  metrics: {
    totalWorkers: number;
    activityRate: number;
    averageTenure: number;
  };
  trends: {
    newWorkers: number;
    statusChanges: number;
  };
}

export interface TopPerformersData {
  category: string;
  timeFrame: string;
  performers: Array<{
    workerId: any;
    workerName: any;
    metric: string;
    value: number;
    secondaryValue: number;
    secondaryLabel: string;
  }>;
  summary: {
    count: number;
    averageValue: number;
  };
}

export interface WorkerAttendanceData {
  attendanceRecords: Array<{
    date: any;
    totalAssignments: number;
    completedAssignments: number;
    activeAssignments: number;
    completionRate: number;
  }>;
  summary: {
    totalDays: number;
    daysWithAssignments: number;
    attendanceRate: number;
    averageCompletionRate: number;
    period: {
      start: any;
      end: any;
    };
  };
}

// Worker Performance API Methods
export class WorkerPerformanceAPI {
  private async callBackend(method: string, params: any = {}): Promise<DashboardResponse<any>> {
    try {
      if (!window.backendAPI || !window.backendAPI.dashboard) {
        throw new Error("Electron API not available");
      }

      const response = await window.backendAPI.dashboard({
        method,
        params,
      });

      if (response.status) {
        return response;
      }
      throw new Error(response.message || `Failed to execute ${method}`);
    } catch (error: any) {
      throw new Error(error.message || `Failed to execute ${method}`);
    }
  }

  async getWorkersOverview(params: any = {}): Promise<DashboardResponse<WorkersOverviewData>> {
    return this.callBackend("getWorkersOverview", params);
  }

  async getWorkerPerformance(params: any = {}): Promise<DashboardResponse<WorkerPerformanceData>> {
    return this.callBackend("getWorkerPerformance", params);
  }

  async getWorkerStatusSummary(params: any = {}): Promise<DashboardResponse<WorkerStatusSummaryData>> {
    return this.callBackend("getWorkerStatusSummary", params);
  }

  async getTopPerformers(params: any = {}): Promise<DashboardResponse<TopPerformersData>> {
    return this.callBackend("getTopPerformers", params);
  }

  async getWorkerAttendance(params: any = {}): Promise<DashboardResponse<WorkerAttendanceData>> {
    return this.callBackend("getWorkerAttendance", params);
  }
}

export const workerPerformanceAPI = new WorkerPerformanceAPI();