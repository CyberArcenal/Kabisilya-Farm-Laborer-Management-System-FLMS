// financial.ts - Financial Analytics Interfaces and Methods

import type { DashboardResponse } from "../dashboard";

export interface FinancialOverviewData {
  payments: {
    currentMonth: {
      gross: number;
      net: number;
      debtDeductions: number;
      count: number;
      averageNet: number;
    };
    previousMonth: {
      gross: number;
      net: number;
    };
    growthRate: number;
  };
  debts: {
    totalCount: number;
    totalAmount: number;
    totalBalance: number;
    totalPaid: number;
    collectionRate: number;
    averageInterestRate: number;
  };
  debtStatusBreakdown: Array<{
    status: any;
    count: number;
    totalBalance: number;
    totalAmount: number;
  }>;
  upcomingDueDates: Array<{
    debtId: any;
    dueDate: Date;
    balance: number;
    originalAmount: number;
    workerName: any;
    daysUntilDue: number;
  }>;
  timestamp: Date;
}

export interface DebtSummaryData {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  overallMetrics: {
    totalDebts: number;
    totalAmount: number;
    totalBalance: number;
    averageAmount: number;
    averageBalance: number;
    averageInterestRate: number;
  };
  debtStatusBreakdown: Array<{
    status: any;
    count: number;
    totalAmount: number;
    averageAmount: number;
  }>;
  overdueDebts: Array<{
    id: any;
    amount: number;
    balance: number;
    daysOverdue: number;
    workerName: any;
    status: any;
  }>;
  debtTrend: Array<{
    date: any;
    newDebts: number;
    paidDebts: number;
    totalAmount: number;
  }>;
  recommendations: string[];
}

export interface PaymentSummaryData {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  overallMetrics: {
    totalPayments: number;
    totalGross: number;
    totalNet: number;
    totalDeductions: number;
    averageGross: number;
    averageNet: number;
  };
  paymentTrend: Array<{
    date: any;
    totalNet: number;
    paymentCount: number;
    averageNet: number;
  }>;
  deductionBreakdown: {
    totalDebtDeductions: number;
    totalOtherDeductions: number;
    debtDeductionRate: number;
  };
  topPayers: Array<{
    workerId: any;
    workerName: any;
    totalNet: number;
    paymentCount: number;
    averageNet: number;
  }>;
  recommendations: string[];
}

export interface RevenueTrendData {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  trendData: Array<{
    date: any;
    revenue: number;
    payments: number;
    averageRevenue: number;
  }>;
  metrics: {
    totalRevenue: number;
    totalPayments: number;
    averageDailyRevenue: number;
    peakRevenueDay: {
      date: any;
      revenue: number;
    };
    growthRate: number;
  };
  projections: {
    nextPeriodEstimate: number;
    confidenceInterval: {
      low: number;
      high: number;
    };
  };
  anomalies: Array<{
    date: any;
    revenue: number;
    expected: number;
    deviation: number;
    type: string;
  }>;
}

export interface DebtCollectionRateData {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  overallMetrics: {
    totalDebtAmount: number;
    totalCollected: number;
    totalBalance: number;
    collectionRate: number;
    averageCollectionPerDebt: number;
    debtsCount: number;
  };
  collectionByAge: Array<{
    ageBucket: string;
    totalAmount: number;
    totalCollected: number;
    remainingBalance: number;
    collectionRate: number;
    debtCount: number;
  }>;
  dailyTrend: Array<{
    date: any;
    collected: number;
    paymentCount: number;
  }>;
  collectionEfficiency: {
    averageDailyCollection: number;
    bestCollectionDay: {
      date: any;
      collected: number;
    };
    totalCollectionDays: number;
  };
  problematicDebts: Array<{
    id: any;
    amount: number;
    collected: number;
    balance: number;
    ageInDays: number;
    collectionRate: number;
    status: any;
  }>;
  recommendations: string[];
}

// Financial Analytics API Methods
export class FinancialAPI {
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

  async getFinancialOverview(params: any = {}): Promise<DashboardResponse<FinancialOverviewData>> {
    return this.callBackend("getFinancialOverview", params);
  }

  async getDebtSummary(params: any = {}): Promise<DashboardResponse<DebtSummaryData>> {
    return this.callBackend("getDebtSummary", params);
  }

  async getPaymentSummary(params: any = {}): Promise<DashboardResponse<PaymentSummaryData>> {
    return this.callBackend("getPaymentSummary", params);
  }

  async getRevenueTrend(params: any = {}): Promise<DashboardResponse<RevenueTrendData>> {
    return this.callBackend("getRevenueTrend", params);
  }

  async getDebtCollectionRate(params: any = {}): Promise<DashboardResponse<DebtCollectionRateData>> {
    return this.callBackend("getDebtCollectionRate", params);
  }
}

export const financialAPI = new FinancialAPI();