// components/Dashboard/components/WorkerPerformance.tsx
import React from 'react';
import { UserCheck, DollarSign, CheckCircle, Package, ChevronRight } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";
import { formatPercentageValue, formatDecimal } from "../utils/formatters";

interface WorkerPerformanceProps {
  workersData: any;
  assignmentsData: any;
  navigate: any;
}

export const WorkerPerformance: React.FC<WorkerPerformanceProps> = ({
  workersData,
  assignmentsData,
  navigate,
}) => {
  return (
    <div className="windows-card p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title">
          <UserCheck className="w-5 h-5" />
          Worker Performance
        </h3>
        <button
          onClick={() => navigate("/workers")}
          className="windows-btn windows-btn-secondary text-sm flex items-center"
        >
          Manage Workers
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <UserCheck className="w-5 h-5 mr-2"
                       style={{ color: "var(--accent-green)" }} />
            <span className="text-sm windows-text">Active Workers</span>
          </div>
          <div className="text-xl font-bold windows-title">
            {workersData?.summary.active || 0}
          </div>
        </div>
        
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <DollarSign className="w-5 h-5 mr-2"
                        style={{ color: "var(--accent-gold)" }} />
            <span className="text-sm windows-text">Avg. Debt</span>
          </div>
          <div className="text-xl font-bold windows-title">
            {formatCurrency(workersData?.financial.averageDebt || 0)}
          </div>
        </div>
        
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <CheckCircle className="w-5 h-5 mr-2"
                         style={{
                           color: assignmentsData?.summary.completionRate || 0 >= 80
                             ? "var(--accent-green)"
                             : "var(--accent-yellow)",
                         }} />
            <span className="text-sm windows-text">Completion Rate</span>
          </div>
          <div className="text-xl font-bold windows-title"
               style={{
                 color: assignmentsData?.summary.completionRate || 0 >= 80
                   ? "var(--accent-green)"
                   : "var(--accent-yellow)",
               }}>
            {formatPercentageValue(assignmentsData?.summary.completionRate)}
          </div>
        </div>
        
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <Package className="w-5 h-5 mr-2"
                     style={{ color: "var(--accent-sky)" }} />
            <span className="text-sm windows-text">Avg. Assignments</span>
          </div>
          <div className="text-xl font-bold windows-title">
            {formatDecimal(assignmentsData?.luwangMetrics.averagePerWorker)}
          </div>
        </div>
      </div>
      
      {workersData?.financial.topDebtors && (
        <div>
          <h4 className="font-medium mb-3 windows-title">Top Debtors</h4>
          <div className="space-y-2">
            {workersData.financial.topDebtors.slice(0, 3).map((debtor: any, index: number) => (
              <div key={index}
                   className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer windows-card"
                   onClick={() => navigate(`/workers/view/${debtor.id}`)}>
                <div>
                  <div className="font-medium text-sm windows-title">
                    {debtor.name}
                  </div>
                  <div className="text-xs windows-text">
                    Balance: {formatCurrency(debtor.currentBalance)}
                  </div>
                </div>
                <div className="font-semibold text-sm windows-title"
                     style={{ color: "var(--accent-gold)" }}>
                  {formatCurrency(debtor.totalDebt)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};