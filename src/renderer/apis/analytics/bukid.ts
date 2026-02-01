// bukid.ts - Bukid Analytics Interfaces and Methods

import type { DashboardResponse } from "../dashboard";

export interface BukidAnalyticsParams {
  bukidId?: string | number;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  interval?: string;
  bukidIds?: (string | number)[];
  metrics?: string[];
}

// ==================== BUKID ANALYTICS INTERFACES ====================

// Base Bukid Info
export interface BukidInfo {
  id: string;
  name: string;
  location?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  pitaks?: any[];
}

export interface BukidOverviewData {
  summary: {
    totalBukids: number;
    activeBukids: number;
    inactiveBukids: number;
  };
  distribution: Array<{
    bukidId: string;
    bukidName: string;
    pitakCount: number;
  }>;
  production: Array<{
    bukidId: string;
    bukidName: string;
    totalLuwang: number;
  }>;
}

export interface PitakStat {
  id: string;
  location: string;
  status: string;
  totalAssignments: number;
  activeAssignments: number;
  completedAssignments: number;
  totalLuwang: number;
  workers: string[];
}

export interface AssignmentStat {
  total: number;
  active: number;
  completed: number;
  cancelled: number;
  byMonth: Array<{
    month: string;
    assignments: number;
    luwang: number;
  }>;
}

export interface FinancialStat {
  totalPayments: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  byStatus: Record<string, number>;
}

export interface WorkerStat {
  id: string;
  name: string;
  status: string;
  assignmentCount: number;
  totalLuwang: number;
}

export interface BukidDetailsData {
  bukidInfo: BukidInfo;
  pitaks: PitakStat[];
  assignments: AssignmentStat;
  financials: FinancialStat;
  workers: WorkerStat[];
  summary: {
    totalPitaks: number;
    activePitaks: number;
    totalWorkers: number;
    totalLuwang: number;
    totalPayments: number;
  };
}

export interface ProductionTrendItem {
  period: string;
  totalLuwang: number;
  assignmentCount: number;
  averageLuwang: number;
}

export interface BukidProductionTrendData {
  interval: string;
  trend: ProductionTrendItem[];
  summary: {
    totalPeriods: number;
    totalLuwang: number;
    totalAssignments: number;
  };
}

export interface WorkersPerPitak {
  pitakId: string;
  pitakLocation: string;
  status: string;
  workerCount: number;
  workerNames: string[];
}

export interface PitaksPerWorker {
  workerId: string;
  workerName: string;
  status: string;
  pitakCount: number;
  pitakLocations: string[];
}

export interface BukidWorkerDistributionData {
  workersPerPitak: WorkersPerPitak[];
  pitaksPerWorker: PitaksPerWorker[];
  summary: {
    totalPitaks: number;
    totalWorkers: number;
    avgWorkersPerPitak: number;
    avgPitaksPerWorker: number;
  };
}

export interface PaymentDetail {
  id: string;
  grossPay: number;
  manualDeduction: number;
  netPay: number;
  status: string;
  paymentDate: Date;
  workerName: string;
  pitakLocation: string;
}

export interface PaymentByStatus {
  [status: string]: {
    count: number;
    amount: number;
  };
}

export interface MonthlyPayment {
  month: string;
  count: number;
  grossPay: number;
  netPay: number;
  deductions: number;
}

export interface BukidFinancialSummaryData {
  payments: PaymentDetail[];
  summary: {
    totalPayments: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    totalLuwang: number;
    averagePayPerLuwang: number;
    deductionRate: number;
  };
  byStatus: PaymentByStatus;
  timeline: MonthlyPayment[];
}

export interface BukidMetric {
  pitaks: number;
  totalAssignments: number;
  activeAssignments: number;
  totalLuwang: number;
  totalPayments: number;
  totalGrossPay: number;
  totalNetPay: number;
  totalDeductions: number;
  efficiency: number;
}

export interface BukidRanking {
  value: number;
  rank: number;
  percentile: number;
}

export interface BukidComparisonItem {
  bukidId: string;
  name: string;
  metrics: BukidMetric;
  rankings: Record<string, BukidRanking>;
}

export interface CompareBukidsData {
  bukids: BukidComparisonItem[];
  summary: {
    totalBukids: number;
    averagePitaks: number;
    averageLuwang: number;
    averageEfficiency: number;
  };
}

// Bukid Analytics API Methods
export class BukidAPI {
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

  async getBukidOverview(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidOverviewData>> {
    return this.callBackend("getBukidOverview", params);
  }

  async getBukidDetails(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidDetailsData>> {
    return this.callBackend("getBukidDetails", params);
  }

  async getBukidProductionTrend(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidProductionTrendData>> {
    return this.callBackend("getBukidProductionTrend", params);
  }

  async getBukidWorkerDistribution(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidWorkerDistributionData>> {
    return this.callBackend("getBukidWorkerDistribution", params);
  }

  async getBukidFinancialSummary(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidFinancialSummaryData>> {
    return this.callBackend("getBukidFinancialSummary", params);
  }

  async compareBukids(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<CompareBukidsData>> {
    return this.callBackend("compareBukids", params);
  }
}

export const bukidAPI = new BukidAPI();