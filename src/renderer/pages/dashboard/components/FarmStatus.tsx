// components/Dashboard/components/FarmStatus.tsx
import React from 'react';
import { Sprout, MapPin, Users } from "lucide-react";
import { formatPercentageValue } from "../utils/formatters";

interface FarmStatusProps {
  assignmentsData: any;
}

export const FarmStatus: React.FC<FarmStatusProps> = ({ assignmentsData }) => {
  return (
    <div className="windows-card p-5">
      <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 windows-title">
        <Sprout className="w-5 h-5" />
        Farm Status
      </h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center p-3 rounded-lg"
             style={{ background: "var(--card-secondary-bg)" }}>
          <div className="flex items-center">
            <MapPin className="w-5 h-5 mr-3"
                    style={{ color: "var(--accent-green)" }} />
            <span className="text-sm windows-text">Active Pitaks</span>
          </div>
          <span className="font-semibold windows-title">
            {assignmentsData?.utilization.pitaks.active || 0}/
            {assignmentsData?.utilization.pitaks.total || 0}
          </span>
        </div>
        
        <div className="flex justify-between items-center p-3 rounded-lg"
             style={{ background: "var(--card-secondary-bg)" }}>
          <div className="flex items-center">
            <Users className="w-5 h-5 mr-3"
                   style={{ color: "var(--accent-sky)" }} />
            <span className="text-sm windows-text">Worker Utilization</span>
          </div>
          <span className="font-semibold windows-title">
            {formatPercentageValue(
              (assignmentsData?.utilization.workers.utilizationRate || 0) * 100
            )}
          </span>
        </div>
      </div>
    </div>
  );
};