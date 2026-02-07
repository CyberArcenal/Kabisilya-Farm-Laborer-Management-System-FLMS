// components/Dashboard/components/DashboardHeader.tsx
import React from 'react';
import { RefreshCw, Sun, CloudRain } from "lucide-react";

interface DashboardHeaderProps {
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  defaultSession: any;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  refreshing,
  onRefresh,
  defaultSession,
}) => {
  // Season indicator
  const getCurrentSeason = () => {
    const month = new Date().getMonth();
    if (month >= 5 && month <= 10)
      return {
        name: "Rainy Season",
        icon: CloudRain,
        color: "var(--accent-sky)",
      };
    return { name: "Dry Season", icon: Sun, color: "var(--accent-gold)" };
  };

  const currentSeason = getCurrentSeason();

  // Format season type
  const formatSeasonType = (seasonType: string) => {
    switch (seasonType?.toLowerCase()) {
      case "tag-ulan":
        return "Tag-ulan";
      case "tag-araw":
        return "Tag-araw";
      default:
        return seasonType || "Custom";
    }
  };

  return (
    <div className="flex justify-between items-center mb-2">
      <div>
        <h1 className="text-2xl font-bold windows-title">
          Dashboard Overview
        </h1>
        <p className="text-sm windows-text">
          Real-time farm operations monitoring
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="windows-btn windows-btn-secondary flex items-center"
        >
          <RefreshCw
            className={`w-4 h-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
        
        {/* Season Indicator */}
        <div
          className="px-3 py-1 rounded-full text-sm flex items-center"
          style={{
            background: "var(--card-secondary-bg)",
            color: currentSeason.color,
            border: `1px solid ${currentSeason.color}20`,
          }}
        >
          {React.createElement(currentSeason.icon, {
            className: "w-4 h-4 mr-2",
          })}
          {currentSeason.name}
        </div>

        {/* Session Indicator */}
        {defaultSession && (
          <div
            className="px-3 py-1 rounded-full text-sm"
            style={{
              background: "var(--primary-light)",
              color: "var(--primary-color)",
              border: "1px solid var(--primary-color)20",
            }}
          >
            {formatSeasonType(defaultSession.seasonType)} {defaultSession.year}
          </div>
        )}
      </div>
    </div>
  );
};