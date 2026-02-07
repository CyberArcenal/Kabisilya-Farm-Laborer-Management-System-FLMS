// components/Dashboard/components/QuickStats.tsx (with loading states)
import React from 'react';
import { 
  Users, 
  Package, 
  DollarSign, 
  TrendingUp, 
  ChevronRight, 
  UserCheck,
  CheckCircle,
  Percent,
  Loader2
} from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";
import { formatPercentageValue } from "../utils/formatters";

interface QuickStatsProps {
  workersData: any;
  financialData: any;
  assignmentsData: any;
  navigate: any;
  loading?: boolean;
}

export const QuickStats: React.FC<QuickStatsProps> = ({
  workersData,
  financialData,
  assignmentsData,
  navigate,
  loading = false,
}) => {
  // Navigation functions
  const navigateToWorkers = () => navigate("/workers/list");
  const navigateToAssignments = () => navigate("/farms/assignments");
  const navigateToDebts = () => navigate("/finance/debts");
  const navigateToPaymentHistory = () => navigate("/finance/payments");

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, index) => (
          <div key={index} className="windows-card p-5">
            <div className="animate-pulse">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-lg bg-gray-200 w-12 h-12"></div>
                <div className="w-16 h-6 bg-gray-200 rounded-full"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 w-24 bg-gray-200 rounded mb-4"></div>
              <div className="h-8 w-full bg-gray-200 rounded"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Helper function to get color for percentage badges
  const getPercentageColor = (value: number, thresholds: { good: number; warning: number }) => {
    if (value >= thresholds.good) return { bg: "var(--accent-green-light)", text: "var(--accent-green)" };
    if (value >= thresholds.warning) return { bg: "var(--accent-yellow-light)", text: "var(--accent-yellow)" };
    return { bg: "var(--accent-red-light)", text: "var(--accent-red)" };
  };

  const workersPercentageColor = getPercentageColor(workersData?.summary.activePercentage || 0, { good: 70, warning: 50 });
  const assignmentsPercentageColor = getPercentageColor(assignmentsData?.summary.completionRate || 0, { good: 80, warning: 60 });
  const debtCollectionColor = getPercentageColor(financialData?.debts.collectionRate || 0, { good: 70, warning: 50 });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Workers Card */}
      <div className="windows-card p-5 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div 
            className="p-3 rounded-lg transition-colors duration-200" 
            style={{ background: "var(--accent-green-light)" }}
          >
            <Users 
              className="w-6 h-6" 
              style={{ color: "var(--accent-green)" }} 
            />
          </div>
          <span 
            className="px-3 py-1 rounded-full text-xs font-medium flex items-center transition-colors duration-200"
            style={{
              background: workersPercentageColor.bg,
              color: workersPercentageColor.text,
            }}
          >
            <UserCheck className="w-3 h-3 mr-1" />
            {formatPercentageValue(workersData?.summary.activePercentage)}
          </span>
        </div>
        <h3 
          className="text-3xl font-bold mb-1 windows-title transition-colors duration-200"
          onClick={navigateToWorkers}
          style={{ color: "var(--text-primary)" }}
        >
          {workersData?.summary.total?.toLocaleString() || 0}
        </h3>
        <p 
          className="text-sm mb-4 windows-text"
          style={{ color: "var(--text-secondary)" }}
        >
          Total Workers
          <span className="block text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            {workersData?.summary.active || 0} active • {workersData?.summary.inactive || 0} inactive
          </span>
        </p>
        <button
          onClick={navigateToWorkers}
          className="windows-btn windows-btn-secondary text-sm flex items-center w-full justify-center hover:bg-accent-green-light transition-all duration-200 group"
        >
          Manage Workers
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Active Assignments Card */}
      <div className="windows-card p-5 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div 
            className="p-3 rounded-lg transition-colors duration-200" 
            style={{ background: "var(--accent-sky-light)" }}
          >
            <Package 
              className="w-6 h-6" 
              style={{ color: "var(--accent-sky)" }} 
            />
          </div>
          <span 
            className="px-3 py-1 rounded-full text-xs font-medium flex items-center transition-colors duration-200"
            style={{
              background: assignmentsPercentageColor.bg,
              color: assignmentsPercentageColor.text,
            }}
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            {formatPercentageValue(assignmentsData?.summary.completionRate)}
          </span>
        </div>
        <h3 
          className="text-3xl font-bold mb-1 windows-title transition-colors duration-200"
          onClick={navigateToAssignments}
          style={{ color: "var(--text-primary)" }}
        >
          {assignmentsData?.summary.activeAssignments?.toLocaleString() || 0}
        </h3>
        <p 
          className="text-sm mb-4 windows-text"
          style={{ color: "var(--text-secondary)" }}
        >
          Active Assignments
          <span className="block text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            {assignmentsData?.summary.pendingAssignments || 0} pending • {assignmentsData?.summary.completedAssignments || 0} completed
          </span>
        </p>
        <button
          onClick={navigateToAssignments}
          className="windows-btn windows-btn-secondary text-sm flex items-center w-full justify-center hover:bg-accent-sky-light transition-all duration-200 group"
        >
          View All Assignments
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Total Debt Card */}
      <div className="windows-card p-5 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div 
            className="p-3 rounded-lg transition-colors duration-200" 
            style={{ background: "var(--accent-gold-light)" }}
          >
            <DollarSign 
              className="w-6 h-6" 
              style={{ color: "var(--accent-gold)" }} 
            />
          </div>
          <span 
            className="px-3 py-1 rounded-full text-xs font-medium flex items-center transition-colors duration-200"
            style={{
              background: debtCollectionColor.bg,
              color: debtCollectionColor.text,
            }}
          >
            <Percent className="w-3 h-3 mr-1" />
            {formatPercentageValue(financialData?.debts.collectionRate)} collected
          </span>
        </div>
        <h3 
          className="text-3xl font-bold mb-1 windows-title transition-colors duration-200"
          onClick={navigateToDebts}
          style={{ color: "var(--text-primary)" }}
        >
          {formatCurrency(financialData?.debts.totalBalance || 0)}
        </h3>
        <p 
          className="text-sm mb-4 windows-text"
          style={{ color: "var(--text-secondary)" }}
        >
          Outstanding Debt
          <span className="block text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            {financialData?.debts.totalDebtors || 0} debtors • {financialData?.debts.overdueDebts || 0} overdue
          </span>
        </p>
        <button
          onClick={navigateToDebts}
          className="windows-btn windows-btn-secondary text-sm flex items-center w-full justify-center hover:bg-accent-gold-light transition-all duration-200 group"
        >
          Manage Debts
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* This Month's Pay Card */}
      <div className="windows-card p-5 hover:shadow-lg transition-all duration-200 hover:scale-[1.02] cursor-pointer">
        <div className="flex justify-between items-start mb-4">
          <div 
            className="p-3 rounded-lg transition-colors duration-200" 
            style={{ background: "var(--accent-earth-light)" }}
          >
            <TrendingUp 
              className="w-6 h-6" 
              style={{ color: "var(--accent-earth)" }} 
            />
          </div>
          <span 
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors duration-200"
            style={{
              background: (financialData?.payments.growthRate || 0) >= 0 
                ? "var(--accent-green-light)" 
                : "var(--accent-red-light)",
              color: (financialData?.payments.growthRate || 0) >= 0 
                ? "var(--accent-green)" 
                : "var(--accent-red)",
            }}
          >
            {(financialData?.payments.growthRate || 0) >= 0 ? '↑' : '↓'}
            {formatPercentageValue(Math.abs(financialData?.payments.growthRate || 0))}
          </span>
        </div>
        <h3 
          className="text-3xl font-bold mb-1 windows-title transition-colors duration-200"
          onClick={navigateToPaymentHistory}
          style={{ color: "var(--text-primary)" }}
        >
          {formatCurrency(financialData?.payments.currentMonth?.net || 0)}
        </h3>
        <p 
          className="text-sm mb-4 windows-text"
          style={{ color: "var(--text-secondary)" }}
        >
          This Month's Net Pay
          <span className="block text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
            Gross: {formatCurrency(financialData?.payments.currentMonth?.gross || 0)}
          </span>
        </p>
        <button
          onClick={navigateToPaymentHistory}
          className="windows-btn windows-btn-secondary text-sm flex items-center w-full justify-center hover:bg-accent-earth-light transition-all duration-200 group"
        >
          Payment History
          <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};