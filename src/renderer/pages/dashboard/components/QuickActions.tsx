// components/Dashboard/components/QuickActions.tsx
import React from 'react';
import { Plus, Package, DollarSign, TrendingUp } from "lucide-react";

export interface QuickActionProps {
  onClick?: (index: number) => void;
  onAssignWork?: () => void;
  onRecordPayment?: () => void;
  onViewReports?: () => void;
  onNewWorker?: () => void;
}

export const QuickActions: React.FC<QuickActionProps> = ({
  onClick,
  onNewWorker,
  onAssignWork,
  onRecordPayment,
  onViewReports,
}) => {
  const quickActions = [
    { label: "New Worker", icon: Plus, color: "green", handler: onNewWorker },
    { label: "Assign Work", icon: Package, color: "blue", handler: onAssignWork },
    { label: "Record Payment", icon: DollarSign, color: "gold", handler: onRecordPayment },
    { label: "View Reports", icon: TrendingUp, color: "purple", handler: onViewReports },
  ];

  const colorClasses = {
    green: {
      bg: "var(--accent-green-light)",
      border: "var(--accent-green)",
      text: "var(--accent-green-dark)",
    },
    blue: {
      bg: "var(--accent-sky-light)",
      border: "var(--accent-sky)",
      text: "var(--accent-sky-dark)",
    },
    gold: {
      bg: "var(--accent-gold-light)",
      border: "var(--accent-gold)",
      text: "var(--accent-gold-dark)",
    },
    purple: {
      bg: "var(--accent-purple-light)",
      border: "var(--accent-purple)",
      text: "var(--accent-purple-dark)",
    },
  };

  return (
    <div className="lg:col-span-2">
      <h3 className="text-lg font-semibold mb-4 windows-title">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {quickActions.map((action, index) => {
          const Icon = action.icon;
          const colors = colorClasses[action.color as keyof typeof colorClasses];

          return (
            <button
              key={index}
              onClick={() => {
                if (onClick) onClick(index);
                if (action.handler) action.handler();
              }}
              className="windows-btn windows-btn-secondary p-4 flex flex-col items-center justify-center hover:scale-105 transition-all duration-200"
              style={{
                background: colors.bg,
                border: `1px solid ${colors.border}20`,
                color: colors.text,
              }}
            >
              <Icon className="w-6 h-6 mb-2" />
              <span className="text-sm font-medium text-center windows-text">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};