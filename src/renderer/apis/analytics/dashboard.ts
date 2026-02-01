// dashboard.ts - Core Dashboard Types and API

import { BukidAPI } from './bukid';
import { FinancialAPI } from './financial';
import { PitakAPI } from './pitak';
import { WorkerPerformanceAPI } from './workerPerformance';

export interface DashboardResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

export interface DashboardPayload {
  method: string;
  params?: Record<string, any>;
}

// Assignment Analytics Interfaces
export interface AssignmentOverviewData {
  summary: {
    totalAssignments: number;
    activeAssignments: number;
    completedAssignments: number;
    cancelledAssignments: number;
    completionRate: number;
  };
  periodMetrics: {
    today: number;
    thisWeek: number;
    thisMonth: number;
    dailyAverage: number;
  };
  luwangMetrics: {
    total: number;
    average: number;
    maximum: number;
    minimum: number;
    averagePerWorker: number;
  };
  utilization: {
    workers: {
      active: number;
      total: number;
      utilizationRate: number;
    };
    pitaks: {
      active: number;
      total: number;
      utilizationRate: number;
    };
  };
  statusBreakdown: Record<string, {
    count: number;
    totalLuwang: number;
  }>;
  lastUpdated: Date;
}

export interface AssignmentTrendData {
  trendData: Array<{
    date: any;
    newAssignments: number;
    completedAssignments: number;
    cancelledAssignments: number;
  }>;
  metrics: {
    totalAssignments: number;
    completionRate: number;
    averageDailyAssignments: number;
    peakDay: {
      date: any;
      assignments: number;
    };
  };
  projections: {
    nextPeriodEstimate: number;
    confidenceInterval: {
      low: number;
      high: number;
    };
  };
}

export interface LuwangSummaryData {
  overallMetrics: {
    totalLuwang: number;
    averageLuwang: number;
    maxLuwang: number;
    minLuwang: number;
    totalAssignments: number;
  };
  luwangDistribution: Array<{
    range: string;
    count: number;
    percentage: number;
    totalLuwang: number;
  }>;
  trend: Array<{
    date: any;
    totalLuwang: number;
    assignmentCount: number;
    averageLuwang: number;
  }>;
  topLuwangWorkers: Array<{
    workerId: any;
    workerName: any;
    totalLuwang: number;
    assignmentCount: number;
    averageLuwang: number;
  }>;
}

export interface AssignmentCompletionRateData {
  period: {
    start: Date;
    end: Date;
    type: string;
  };
  overallMetrics: {
    totalAssignments: number;
    completedAssignments: number;
    completionRate: number;
    averageCompletionTime: number;
    onTimeCompletionRate: number;
  };
  completionTrend: Array<{
    date: any;
    completed: number;
    total: number;
    completionRate: number;
  }>;
  completionByWorker: Array<{
    workerId: any;
    workerName: any;
    totalAssignments: number;
    completed: number;
    completionRate: number;
    averageTime: number;
  }>;
  incompleteReasons: Record<string, {
    count: number;
    percentage: number;
  }>;
  recommendations: string[];
}

export interface PitakUtilizationData {
  pitakUtilization: Array<{
    pitakId: any;
    location: any;
    bukidName: any;
    totalLuwang: number;
    status: any;
    utilization: {
      totalAssignments: number;
      activeAssignments: number;
      completedAssignments: number;
      totalLuwangAssigned: number;
      utilizationRate: number;
      uniqueWorkers: number;
      lastAssignment: Date | null;
      daysSinceLastAssignment: number | null;
    };
  }>;
  overallMetrics: {
    totalPitaks: number;
    totalLuwang: number;
    totalAssignedLuwang: number;
    overallUtilizationRate: number;
    averageUtilizationRate: number;
    totalAssignments: number;
    totalActiveAssignments: number;
    averageAssignmentsPerPitak: number;
    averageWorkersPerPitak: number;
  };
  categories: {
    high: {
      count: number;
      pitaks: any[];
      percentage: number;
    };
    medium: {
      count: number;
      pitaks: any[];
      percentage: number;
    };
    low: {
      count: number;
      pitaks: any[];
      percentage: number;
    };
    underutilized: {
      count: number;
      pitaks: any[];
      percentage: number;
    };
  };
  mostUtilized: any[];
  needsAttention: any[];
  recommendations: string[];
}

// Real-Time Dashboard Interfaces
export interface LiveDashboardData {
  timestamp: string;
  overview: {
    assignments: {
      today: number;
      completed: number;
      active: number;
      completionRate: number;
    };
    workers: {
      totalActive: number;
      withAssignments: number;
      utilizationRate: number;
    };
    financial: {
      todayPayments: number;
      todayPaymentCount: number;
      activeDebts: number;
      totalDebtBalance: number;
    };
    resources: {
      activePitaks: number;
    };
  };
  recentActivities: Array<{
    type: string;
    id: any;
    workerName: any;
    pitakLocation?: any;
    luwangCount?: number;
    netPay?: number;
    status: any;
    timestamp: any;
    action: string;
  }>;
  alerts: Array<{
    type: string;
    title: string;
    message: string;
    priority: string;
    timestamp?: Date;
    details?: any[];
  }>;
  quickStats: {
    averageAssignmentTime: number;
    averagePaymentAmount: number;
    debtCollectionRate: number;
  };
}

export interface TodayStatsData {
  assignments: {
    total: number;
    completed: number;
    active: number;
    completionRate: number;
  };
  payments: {
    totalAmount: number;
    count: number;
    average: number;
  };
  workers: {
    active: number;
    withAssignments: number;
    utilizationRate: number;
  };
  hourlyDistribution: {
    assignments: Array<{
      hour: number;
      assignments: number;
    }>;
    payments: Array<{
      hour: number;
      amount: number;
    }>;
  };
  recommendations: string[];
}

export interface RealTimeAssignmentsData {
  activeAssignments: Array<{
    id: any;
    workerName: any;
    pitakLocation: any;
    luwangCount: number;
    status: any;
    startTime: any;
    duration: number;
  }>;
  recentCompletions: Array<{
    id: any;
    workerName: any;
    pitakLocation: any;
    luwangCount: number;
    completionTime: any;
  }>;
  metrics: {
    totalActive: number;
    averageDuration: number;
    completionRate: number;
  };
}

export interface RecentPaymentsData {
  recentPayments: Array<{
    id: any;
    workerName: any;
    netPay: number;
    grossPay: number;
    deductions: number;
    timestamp: any;
  }>;
  summary: {
    totalPayments: number;
    totalAmount: number;
    averagePayment: number;
  };
}

export interface PendingDebtsData {
  pendingDebts: Array<{
    id: any;
    workerName: any;
    amount: number;
    balance: number;
    dueDate: Date;
    daysOverdue: number;
  }>;
  summary: {
    totalPending: number;
    totalBalance: number;
    overdueCount: number;
  };
}

export interface SystemHealthData {
  database: {
    status: string;
    uptime: number;
  };
  memory: any;
  platform: string;
  nodeVersion: string;
  entityCounts: {
    workers: number;
    activeAssignments: number;
    pendingDebts: number;
  };
  timestamp: string;
}

export interface AuditSummaryData {
  summary: Array<{
    action: any;
    count: number;
    first: any;
    last: any;
  }>;
  total: number;
  period: {
    start: any;
    end: any;
  };
}

export interface RecentActivitiesData {
  activities: Array<{
    id: any;
    action: any;
    actor: any;
    details: any;
    timestamp: any;
  }>;
  total: number;
}

export interface NotificationsData {
  notifications: Array<{
    id: any;
    type: any;
    context: any;
    timestamp: any;
    isUnread: boolean;
  }>;
  unreadCount: number;
  total: number;
}

// Mobile Dashboard Interfaces
export interface MobileDashboardData {
  timestamp: string;
  overviewCards: Array<{
    title: string;
    value: number;
    icon: string;
    color: string;
    trend: string | null;
    subValue?: string;
    format?: string;
  }>;
  quickStats: {
    completionRate: number;
    activeAssignments: number;
    pendingDebts: number;
    totalDebtBalance: number;
    averagePayment: number;
  };
  recentActivities: Array<{
    id: any;
    type: string;
    workerName: any;
    action: string;
    luwangCount: number;
    status: any;
    time: string;
  }>;
  todaysTopWorkers: Array<{
    workerName: any;
    assignmentCount: number;
    totalLuwang: number;
  }>;
  alerts: Array<{
    type: string;
    title: string;
    message: string;
    priority: string;
  }>;
  lastUpdated: string;
}

export interface QuickStatsData {
  overallHealth: string;
  keyMetrics: {
    activeWorkers: number;
    activeAssignments: number;
    pendingDebts: number;
    todayPayments: number;
    completionRate: number;
  };
  priorityActions: string[];
}

export interface WorkerQuickViewData {
  workerInfo: {
    name: any;
    status: any;
    totalAssignments: number;
    totalLuwang: number;
    totalDebt: number;
    currentBalance: number;
  };
  performance: {
    completionRate: number;
    averageLuwang: number;
    performanceScore: number;
    recentCompletionRate: number;
    category: string;
  };
  recentActivity: {
    assignments: Array<{
      id: any;
      pitakLocation: any;
      luwangCount: number;
      status: any;
      date: any;
    }>;
    debts: Array<{
      id: any;
      amount: number;
      balance: number;
      dateIncurred: any;
      status: any;
    }>;
    payments: Array<{
      id: any;
      netPay: number;
      grossPay: number;
      deductions: number;
      date: any;
    }>;
  };
  alerts: Array<{
    type: string;
    message: string;
    priority: string;
  }>;
  summary: {
    lastUpdated: string;
    overallStatus: string;
  };
}

class DashboardAPI {
  private bukidAPI: BukidAPI;
  private financialAPI: FinancialAPI;
  private pitakAPI: PitakAPI;
  private workerPerformanceAPI: WorkerPerformanceAPI;

  constructor() {
    this.bukidAPI = new BukidAPI();
    this.financialAPI = new FinancialAPI();
    this.pitakAPI = new PitakAPI();
    this.workerPerformanceAPI = new WorkerPerformanceAPI();
  }

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

  // Assignment Analytics Methods
  async getAssignmentOverview(params: any = {}): Promise<DashboardResponse<AssignmentOverviewData>> {
    return this.callBackend("getAssignmentOverview", params);
  }

  async getAssignmentTrend(params: any = {}): Promise<DashboardResponse<AssignmentTrendData>> {
    return this.callBackend("getAssignmentTrend", params);
  }

  async getLuwangSummary(params: any = {}): Promise<DashboardResponse<LuwangSummaryData>> {
    return this.callBackend("getLuwangSummary", params);
  }

  async getAssignmentCompletionRate(params: any = {}): Promise<DashboardResponse<AssignmentCompletionRateData>> {
    return this.callBackend("getAssignmentCompletionRate", params);
  }

  async getPitakUtilization(params: any = {}): Promise<DashboardResponse<PitakUtilizationData>> {
    return this.callBackend("getPitakUtilization", params);
  }

  // Real-Time Dashboard Methods
  async getLiveDashboard(params: any = {}): Promise<DashboardResponse<LiveDashboardData>> {
    return this.callBackend("getLiveDashboard", params);
  }

  async getTodayStats(params: any = {}): Promise<DashboardResponse<TodayStatsData>> {
    return this.callBackend("getTodayStats", params);
  }

  async getRealTimeAssignments(params: any = {}): Promise<DashboardResponse<RealTimeAssignmentsData>> {
    return this.callBackend("getRealTimeAssignments", params);
  }

  async getRecentPayments(params: any = {}): Promise<DashboardResponse<RecentPaymentsData>> {
    return this.callBackend("getRecentPayments", params);
  }

  async getPendingDebts(params: any = {}): Promise<DashboardResponse<PendingDebtsData>> {
    return this.callBackend("getPendingDebts", params);
  }

  async getSystemHealth(params: any = {}): Promise<DashboardResponse<SystemHealthData>> {
    return this.callBackend("getSystemHealth", params);
  }

  async getAuditSummary(params: any = {}): Promise<DashboardResponse<AuditSummaryData>> {
    return this.callBackend("getAuditSummary", params);
  }

  async getRecentActivities(params: any = {}): Promise<DashboardResponse<RecentActivitiesData>> {
    return this.callBackend("getRecentActivities", params);
  }

  async getNotifications(params: any = {}): Promise<DashboardResponse<NotificationsData>> {
    return this.callBackend("getNotifications", params);
  }

  // Mobile Dashboard Methods
  async getMobileDashboard(params: any = {}): Promise<DashboardResponse<MobileDashboardData>> {
    return this.callBackend("getMobileDashboard", params);
  }

  async getQuickStats(params: any = {}): Promise<DashboardResponse<QuickStatsData>> {
    return this.callBackend("getQuickStats", params);
  }

  async getWorkerQuickView(params: any = {}): Promise<DashboardResponse<WorkerQuickViewData>> {
    return this.callBackend("getWorkerQuickView", params);
  }

  // Expose the specialized APIs
  get bukid() {
    return this.bukidAPI;
  }

  get financial() {
    return this.financialAPI;
  }

  get pitak() {
    return this.pitakAPI;
  }

  get worker() {
    return this.workerPerformanceAPI;
  }
}

const dashboardAPI = new DashboardAPI();

export default dashboardAPI;