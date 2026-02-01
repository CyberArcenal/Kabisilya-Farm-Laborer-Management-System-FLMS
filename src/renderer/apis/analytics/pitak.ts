// pitak.ts - Pitak Productivity Interfaces and Methods

import type { DashboardResponse } from "../dashboard";

export interface PitakProductivityOverviewData {
  summary: {
    totalPitaks: number;
    activePitaks: number;
    harvestedPitaks: number;
    totalCompletedLuwang: number;
    averageCompletionRate: number;
    averageUtilization: number;
  };
  pitaks: Array<{
    pitakId: any;
    location: any;
    status: any;
    totalLuwang: number;
    bukidName: any;
    metrics: {
      completedLuwang: number;
      activeLuwang: number;
      totalAssignments: number;
      completionRate: number;
      averageLuwangPerAssignment: number;
      utilization: number;
    };
  }>;
  financial: {
    totalPayments: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    avgGrossPay: number;
    avgNetPay: number;
    deductionRate: number;
  };
  topPerformers: Array<{
    pitakId: any;
    location: any;
    completionRate: number;
    utilization: number;
    score: number;
  }>;
}

export interface PitakProductivityDetailsData {
  pitakInfo: {
    id: any;
    location: any;
    status: any;
    totalLuwang: number;
    bukid: any;
    createdAt: any;
    updatedAt: any;
  };
  productivity: {
    assignments: {
      totalAssignments: number;
      completedAssignments: number;
      activeAssignments: number;
      cancelledAssignments: number;
      completionRate: number;
      luwangProductivity: {
        total: number;
        completed: number;
        pending: number;
        completionRate: number;
      };
    };
    workers: Array<{
      workerId: any;
      workerName: any;
      assignmentCount: number;
      totalLuwang: number;
      avgLuwang: number;
    }>;
    timeline: Array<{
      period: string;
      metrics: {
        totalLuwang: number;
        assignmentCount: number;
        completedAssignments: number;
        activeAssignments: number;
        avgLuwangPerAssignment: number;
        completionRate: number;
        productivityIndex: number;
      };
    }>;
    kpis: {
      landUtilization: number;
      assignmentEfficiency: number;
      luwangPerDay: number;
      workerTurnover: number;
      costPerLuwang: number;
    };
  };
  financial: {
    summary: {
      totalPayments: number;
      totalGrossPay: number;
      totalNetPay: number;
      totalDeductions: number;
      avgGrossPay: number;
      avgNetPay: number;
      deductionRate: number;
    };
  };
  recommendations: Array<{
    priority: string;
    area: string;
    recommendation: string;
    target: string;
  }>;
}

export interface PitakProductionTimelineData {
  timeline: Array<{
    period: string;
    metrics: {
      totalLuwang: number;
      assignmentCount: number;
      completedAssignments: number;
      activeAssignments: number;
      avgLuwangPerAssignment: number;
      completionRate: number;
      productivityIndex: number;
    };
  }>;
  trendAnalysis: {
    overallTrend: number;
    volatility: number;
    growthRate: number;
    consistency: string;
    trendType: string;
  };
  summary: {
    totalPeriods: number;
    averageLuwangPerPeriod: number;
    averageProductivityIndex: number;
    trendDirection: string;
  };
}

export interface PitakWorkerProductivityData {
  workers: Array<{
    workerId: any;
    workerName: any;
    workerStatus: any;
    assignments: {
      total: number;
      completed: number;
      active: number;
      completionRate: number;
    };
    luwang: {
      total: number;
      completed: number;
      pending: number;
      avgPerAssignment: number;
      completionRate: number;
    };
    timeline: {
      firstAssignment: any;
      lastAssignment: any;
      daysActive: number;
    };
    productivityScore: number;
  }>;
  summary: {
    totalWorkers: number;
    averageCompletionRate: number;
    averageLuwangPerWorker: number;
    topPerformer: any;
    efficiencyDistribution: {
      high: number;
      medium: number;
      low: number;
      averageScore: number;
      distribution: number[];
    };
  };
  benchmarks: {
    highEfficiency: number;
    mediumEfficiency: number;
    lowEfficiency: number;
  };
}

export interface PitakEfficiencyAnalysisData {
  pitakInfo: {
    id: any;
    location: any;
    totalLuwang: number;
    status: any;
  };
  efficiencyMetrics: {
    landEfficiency: number;
    laborEfficiency: number;
    costEfficiency: number;
    timeEfficiency: number;
    resourceUtilization: number;
  };
  historicalTrends: {
    periods: number;
    trend: string;
    improvementRate: number;
    consistency: string;
  };
  benchmarks: {
    average: number;
    top25: number;
    median: number;
    current: number;
    percentile: number;
  };
  insights: Array<{
    type: string;
    message: string;
    suggestion: string;
  }>;
  recommendations: Array<{
    priority: string;
    action: string;
    details: string;
    expectedImpact: string;
  }>;
  score: number;
}

export interface ComparePitaksProductivityData {
  pitaks: Array<{
    pitakId: any;
    info: {
      location: any;
      status: any;
      bukid: any;
    };
    productivity: Record<string, any>;
    efficiency: Record<string, any>;
    financial: Record<string, any>;
    scores: {
      productivity: number;
      efficiency: number;
      financial: number;
      overall: number;
    };
    rankings: {
      overallRank: number;
      percentile: number;
    };
  }>;
  summary: {
    averageScore: number;
    bestPerformer: any;
    worstPerformer: any;
    consistency: {
      score: number;
      rating: string;
      stdDev: number;
    };
  };
  insights: Array<{
    type: string;
    message: string;
    highlight?: string;
    suggestion?: string;
  }>;
  metricsComparison: Record<string, {
    average: number;
    range: {
      min: number;
      max: number;
    };
    standardDeviation: number;
  }>;
}

// Pitak Productivity API Methods
export class PitakAPI {
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

  async getPitakProductivityOverview(params: any = {}): Promise<DashboardResponse<PitakProductivityOverviewData>> {
    return this.callBackend("getPitakProductivityOverview", params);
  }

  async getPitakProductivityDetails(params: any = {}): Promise<DashboardResponse<PitakProductivityDetailsData>> {
    return this.callBackend("getPitakProductivityDetails", params);
  }

  async getPitakProductionTimeline(params: any = {}): Promise<DashboardResponse<PitakProductionTimelineData>> {
    return this.callBackend("getPitakProductionTimeline", params);
  }

  async getPitakWorkerProductivity(params: any = {}): Promise<DashboardResponse<PitakWorkerProductivityData>> {
    return this.callBackend("getPitakWorkerProductivity", params);
  }

  async getPitakEfficiencyAnalysis(params: any = {}): Promise<DashboardResponse<PitakEfficiencyAnalysisData>> {
    return this.callBackend("getPitakEfficiencyAnalysis", params);
  }

  async comparePitaksProductivity(params: any = {}): Promise<DashboardResponse<ComparePitaksProductivityData>> {
    return this.callBackend("comparePitaksProductivity", params);
  }
}

export const pitakAPI = new PitakAPI();