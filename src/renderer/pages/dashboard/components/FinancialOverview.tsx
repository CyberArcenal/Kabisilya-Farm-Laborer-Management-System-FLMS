// components/Dashboard/components/FinancialOverview.tsx
import React from 'react';
import { BarChart3, DollarSign, Percent, TrendingUp, Calendar, ChevronRight } from "lucide-react";
import { formatCurrency } from "../../../utils/formatters";
import { formatPercentageValue } from "../utils/formatters";

interface FinancialOverviewProps {
  financialData: any;
  navigate: any;
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({
  financialData,
  navigate,
}) => {
  return (
    <div className="windows-card p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title">
          <BarChart3 className="w-5 h-5" />
          Financial Overview
        </h3>
        <button
          onClick={() => navigate("/reports/financial")}
          className="windows-btn windows-btn-secondary text-sm flex items-center"
        >
          View Reports
          <ChevronRight className="w-4 h-4 ml-1" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <DollarSign className="w-5 h-5 mr-2"
                        style={{ color: "var(--accent-gold)" }} />
            <span className="text-sm windows-text">Total Debt</span>
          </div>
          <div className="text-xl font-bold windows-title">
            {formatCurrency(financialData?.debts.totalAmount || 0)}
          </div>
        </div>
        
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <Percent className="w-5 h-5 mr-2"
                     style={{
                       color: financialData?.debts.collectionRate || 0 >= 70
                         ? "var(--accent-green)"
                         : "var(--accent-red)",
                     }} />
            <span className="text-sm windows-text">Collection Rate</span>
          </div>
          <div className="text-xl font-bold windows-title"
               style={{
                 color: financialData?.debts.collectionRate || 0 >= 70
                   ? "var(--accent-green)"
                   : "var(--accent-red)",
               }}>
            {formatPercentageValue(financialData?.debts.collectionRate)}
          </div>
        </div>
        
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <TrendingUp className="w-5 h-5 mr-2"
                        style={{ color: "var(--accent-sky)" }} />
            <span className="text-sm windows-text">Avg. Interest</span>
          </div>
          <div className="text-xl font-bold windows-title">
            {formatPercentageValue(financialData?.debts.averageInterestRate)}
          </div>
        </div>
        
        <div className="p-4 rounded-lg windows-card">
          <div className="flex items-center mb-2">
            <Calendar className="w-5 h-5 mr-2"
                      style={{ color: "var(--accent-purple)" }} />
            <span className="text-sm windows-text">Due Dates</span>
          </div>
          <div className="text-xl font-bold windows-title">
            {financialData?.upcomingDueDates.length || 0}
          </div>
        </div>
      </div>
      
      {financialData?.debtStatusBreakdown && (
        <div>
          <h4 className="font-medium mb-3 windows-title">Debt Status Breakdown</h4>
          <div className="space-y-2">
            {financialData.debtStatusBreakdown.map((status: any, index: number) => (
              <div key={index}
                   className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full mr-2"
                       style={{
                         backgroundColor:
                           status.status === "active"
                             ? "var(--accent-green)"
                             : status.status === "overdue"
                               ? "var(--accent-red)"
                               : "var(--accent-gold)",
                       }}></div>
                  <span className="text-sm capitalize windows-text">
                    {status.status}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm windows-title">
                    {formatCurrency(status.totalBalance)}
                  </span>
                  <span className="px-2 py-1 rounded-full text-xs"
                        style={{
                          background: "var(--card-bg)",
                          color: "var(--text-secondary)",
                        }}>
                    {status.count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};