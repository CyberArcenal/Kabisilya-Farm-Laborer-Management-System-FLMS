// components/Dashboard/DashboardPage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDashboardData } from "./hooks/useDashboardData";
import { QuickStats } from "./components/QuickStats";
import { WeatherWidget } from "./components/WeatherWidget";
import { ErrorState, LoadingState } from "./components/LoadingErrorStates";
import { DashboardHeader } from "./components/DashboardHeader";
import { QuickActions } from "./components/QuickActions";
import { TodaysActivity } from "./components/TodaysActivity";
import { FarmStatus } from "./components/FarmStatus";
import { FinancialOverview } from "./components/FinancialOverview";
import { WorkerPerformance } from "./components/WorkerPerformance";
import WorkerFormDialog from "../Worker/Table/Dialogs/WorkerFormDialog";
import { dialogs } from "../../utils/dialogs";
import AssignmentFormDialog from "../Assignment/Dialogs/Form";

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const {
    loading,
    error,
    refreshing,
    workersData,
    financialData,
    assignmentsData,
    liveData,
    defaultSession,
    fetchDashboardData,
    handleRefresh,
  } = useDashboardData();
  const [isWorkerFormDialogOpen, setIsWorkerFormDialogOpen] = useState(false);
  const [isFormDialogOpen, setIsAssigmentFormDialogOpen] = useState(false);

  if (loading) {
    return <LoadingState />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchDashboardData} />;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Dashboard Header */}
      <DashboardHeader
        refreshing={refreshing}
        onRefresh={handleRefresh}
        defaultSession={defaultSession}
      />

      {/* Quick Stats Grid */}
      <QuickStats
        workersData={workersData}
        financialData={financialData}
        assignmentsData={assignmentsData}
        navigate={navigate}
      />

      {/* Weather and Quick Actions Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <WeatherWidget />
        <QuickActions
          onAssignWork={() => {
            setIsAssigmentFormDialogOpen(true);
          }}
          onNewWorker={() => {
            setIsWorkerFormDialogOpen(true);
          }}
          onRecordPayment={() => {
            navigate("/finance/history");
          }}
          onViewReports={() => {
            navigate("/analytics/bukid");
          }}
        />
      </div>

      {/* Today's Overview and Farm Status */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <TodaysActivity liveData={liveData} />
        <FarmStatus assignmentsData={assignmentsData} />
      </div>

      {/* Financial Overview and Worker Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FinancialOverview financialData={financialData} navigate={navigate} />
        <WorkerPerformance
          workersData={workersData}
          assignmentsData={assignmentsData}
          navigate={navigate}
        />
      </div>

      {/* Assignment Form Dialog */}
      {isFormDialogOpen && (
        <AssignmentFormDialog
          workerIds={[]}
          onClose={() => setIsAssigmentFormDialogOpen(false)}
          onSuccess={() => {
            setIsAssigmentFormDialogOpen(false);
            fetchDashboardData(); // Refresh dashboard data after form success
          }}
          isReassignment={false}
          reassignmentAssignmentId={undefined}
        />
      )}
      {/* Worker Form Dialog */}
      {isWorkerFormDialogOpen && (
        <WorkerFormDialog
          id={undefined}
          mode={"add"}
          onClose={async () => {
            if (
              !(await dialogs.confirm({
                title: "Close Form",
                message:
                  "Are you sure you want to close the form? Any unsaved changes will be lost.",
              }))
            )
              return;

            setIsWorkerFormDialogOpen(false);
          }}
          onSuccess={() => {
            setIsWorkerFormDialogOpen(false);
            fetchDashboardData(); // Refresh dashboard data after form success
          }}
        />
      )}
    </div>
  );
};

export default DashboardPage;
