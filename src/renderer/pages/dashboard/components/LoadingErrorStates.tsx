// components/Dashboard/components/LoadingErrorStates.tsx
import React from 'react';
import { AlertTriangle, RefreshCw } from "lucide-react";

export const LoadingState: React.FC = () => {
  return (
    <div className="flex items-center justify-center h-96">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-3 transition-colors duration-300"
             style={{ borderColor: "var(--primary-color)" }}></div>
        <p className="text-sm transition-colors duration-300"
           style={{ color: "var(--text-secondary)" }}>
          Loading dashboard data...
        </p>
      </div>
    </div>
  );
};

interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

export const ErrorState: React.FC<ErrorStateProps> = ({ error, onRetry }) => {
  return (
    <div className="text-center p-8">
      <AlertTriangle className="w-12 h-12 mx-auto mb-3"
                     style={{ color: "var(--danger-color)" }} />
      <p className="text-base font-semibold mb-1"
         style={{ color: "var(--danger-color)" }}>
        Error Loading Dashboard
      </p>
      <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
        {error}
      </p>
      <button onClick={onRetry}
              className="windows-btn windows-btn-primary px-4 py-2 text-sm font-medium">
        <RefreshCw className="w-4 h-4 inline mr-1" />
        Retry
      </button>
    </div>
  );
};