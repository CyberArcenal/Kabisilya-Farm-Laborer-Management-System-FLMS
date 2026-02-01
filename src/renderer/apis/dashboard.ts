// dashboardAPI.ts - API for Farm Dashboard Management

export interface DashboardResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

// ==================== BUKID ANALYTICS INTERFACES ====================
export interface BukidOverviewData {
  summary: {
    totalBukids: number;
    activeBukids: number;
    inactiveBukids: number;
  };
  distribution: Array<{
    bukidId: any;
    bukidName: any;
    pitakCount: number;
  }>;
  production: Array<{
    bukidId: any;
    bukidName: any;
    totalLuwang: number;
  }>;
}

export interface BukidDetailsData {
  bukidInfo: {
    id: any;
    name: any;
    location?: any;
    createdAt: any;
    updatedAt: any;
  };
  pitaks: Array<{
    id: any;
    location: any;
    status: any;
    totalAssignments: number;
    activeAssignments: number;
    completedAssignments: number;
    totalLuwang: number;
    workers: string[];
  }>;
  assignments: {
    total: number;
    active: number;
    completed: number;
    cancelled: number;
    byMonth: Array<{
      month: string;
      assignments: number;
      luwang: number;
    }>;
  };
  financials: {
    totalPayments: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    byStatus: Record<string, number>;
  };
  workers: Array<{
    id: any;
    name: any;
    status: any;
    assignmentCount: number;
    totalLuwang: number;
  }>;
  summary: {
    totalPitaks: number;
    activePitaks: number;
    totalWorkers: number;
    totalLuwang: number;
    totalPayments: number;
  };
}

export interface BukidProductionTrendData {
  interval: string;
  trend: Array<{
    period: string;
    totalLuwang: number;
    assignmentCount: number;
    averageLuwang: number;
  }>;
  summary: {
    totalPeriods: number;
    totalLuwang: number;
    totalAssignments: number;
  };
}

export interface BukidWorkerDistributionData {
  workersPerPitak: Array<{
    pitakId: any;
    pitakLocation: any;
    status: any;
    workerCount: number;
    workerNames: string[];
  }>;
  pitaksPerWorker: Array<{
    workerId: any;
    workerName: any;
    status: any;
    pitakCount: number;
    pitakLocations: string[];
  }>;
  summary: {
    totalPitaks: number;
    totalWorkers: number;
    avgWorkersPerPitak: number;
    avgPitaksPerWorker: number;
  };
}

export interface BukidFinancialSummaryData {
  payments: Array<{
    id: any;
    grossPay: number;
    manualDeduction: number;
    netPay: number;
    status: any;
    paymentDate: any;
    workerName: any;
    pitakLocation: any;
  }>;
  summary: {
    totalPayments: number;
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    totalLuwang: number;
    averagePayPerLuwang: number;
    deductionRate: number;
  };
  byStatus: Record<string, { count: number; amount: number }>;
  timeline: Array<{
    month: string;
    count: number;
    grossPay: number;
    netPay: number;
    deductions: number;
  }>;
}

export interface CompareBukidsData {
  bukids: Array<{
    bukidId: any;
    name: any;
    metrics: {
      pitaks: number;
      totalAssignments: number;
      activeAssignments: number;
      totalLuwang: number;
      totalPayments: number;
      totalGrossPay: number;
      totalNetPay: number;
      totalDeductions: number;
      efficiency: number;
    };
    rankings: Record<string, {
      value: number;
      rank: number;
      percentile: number;
    }>;
  }>;
  summary: {
    totalBukids: number;
    averagePitaks: number;
    averageLuwang: number;
    averageEfficiency: number;
  };
}

// ==================== PITAK PRODUCTIVITY INTERFACES ====================
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

// Existing interfaces (Worker Analytics, Financial Analytics, etc.) remain the same...
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

// Financial Analytics Interfaces
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
export interface BukidAnalyticsParams {
  bukidId?: string | number;
  timeRange?: string;
  startDate?: string;
  endDate?: string;
  interval?: string;
}
export interface DashboardPayload {
  method: string;
  params?: Record<string, any>;
}

class DashboardAPI {
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

  // Worker Analytics Methods
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

  // Financial Analytics Methods
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

  // ==================== BUKID ANALYTICS METHODS ====================
  async getBukidOverview(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidOverviewData>> {
    return this.callBackend("getBukidOverview", params);
  }

  async getBukidDetails(params: BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidDetailsData>> {
    return this.callBackend("getBukidDetails", params);
  }

  async getBukidProductionTrend(params:BukidAnalyticsParams = {}): Promise<DashboardResponse<BukidProductionTrendData>> {
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

  // ==================== PITAK PRODUCTIVITY METHODS ====================
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
}

const dashboardAPI = new DashboardAPI();

export default dashboardAPI;