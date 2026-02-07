// components/Dashboard/components/TodaysActivity.tsx
import React from 'react';
import { Activity, Package, DollarSign, Users, MapPin } from "lucide-react";
import { formatDate, formatCurrency } from "../../../utils/formatters";

interface TodaysActivityProps {
  liveData: any;
}

export const TodaysActivity: React.FC<TodaysActivityProps> = ({ liveData }) => {
  const today = new Date();

  return (
    <div className="lg:col-span-2 windows-card p-5">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title">
          <Activity className="w-5 h-5" />
          Today's Activity
        </h3>
        <span
          className="px-3 py-1 rounded-full text-sm"
          style={{
            background: "var(--primary-light)",
            color: "var(--primary-color)",
          }}
        >
          {formatDate(today, "MMM dd, yyyy")}
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center p-4 rounded-lg"
             style={{ background: "var(--card-secondary-bg)" }}>
          <Package className="w-8 h-8 mx-auto mb-2"
                   style={{ color: "var(--accent-sky)" }} />
          <div className="text-2xl font-bold mb-1 windows-title">
            {liveData?.overview.assignments.today || 0}
          </div>
          <div className="text-sm windows-text">Today's Assignments</div>
        </div>

        <div className="text-center p-4 rounded-lg"
             style={{ background: "var(--card-secondary-bg)" }}>
          <DollarSign className="w-8 h-8 mx-auto mb-2"
                      style={{ color: "var(--accent-green)" }} />
          <div className="text-2xl font-bold mb-1 windows-title">
            {formatCurrency(liveData?.overview.financial.todayPayments || 0)}
          </div>
          <div className="text-sm windows-text">Today's Payments</div>
        </div>

        <div className="text-center p-4 rounded-lg"
             style={{ background: "var(--card-secondary-bg)" }}>
          <Users className="w-8 h-8 mx-auto mb-2"
                 style={{ color: "var(--accent-purple)" }} />
          <div className="text-2xl font-bold mb-1 windows-title">
            {liveData?.overview.workers.totalActive || 0}
          </div>
          <div className="text-sm windows-text">Active Workers</div>
        </div>

        <div className="text-center p-4 rounded-lg"
             style={{ background: "var(--card-secondary-bg)" }}>
          <MapPin className="w-8 h-8 mx-auto mb-2"
                  style={{ color: "var(--accent-earth)" }} />
          <div className="text-2xl font-bold mb-1 windows-title">
            {liveData?.overview.resources.activePitaks || 0}
          </div>
          <div className="text-sm windows-text">Active Pitaks</div>
        </div>
      </div>
    </div>
  );
};