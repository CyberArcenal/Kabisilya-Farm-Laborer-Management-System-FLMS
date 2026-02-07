import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type {
  AssignmentOverviewData,
  FinancialOverviewData,
  LiveDashboardData,
  WorkersOverviewData,
} from "../../../apis/dashboard";
import type { DefaultSessionData } from "../../../apis/system_config";
import { workerPerformanceAPI } from "../../../apis/analytics/workerPerformance";
import { financialAPI } from "../../../apis/analytics/financial";
import dashboardAPI from "../../../apis/dashboard";
import systemConfigAPI from "../../../apis/system_config";

export const useDashboardData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [workersData, setWorkersData] = useState<WorkersOverviewData | null>(
    null,
  );
  const [financialData, setFinancialData] =
    useState<FinancialOverviewData | null>(null);
  const [assignmentsData, setAssignmentsData] =
    useState<AssignmentOverviewData | null>(null);
  const [liveData, setLiveData] = useState<LiveDashboardData | null>(null);
  const [defaultSession, setDefaultSession] =
    useState<DefaultSessionData | null>(null);
  const [loadingSession, setLoadingSession] = useState(true);

  const fetchDefaultSession = useCallback(async () => {
    try {
      setLoadingSession(true);
      const response = await systemConfigAPI.getDefaultSessionData();
      if (response.status && response.data) {
        setDefaultSession(response.data);
      } else {
        console.warn("No default session found or error fetching session data");
      }
    } catch (error) {
      console.error("Error fetching default session:", error);
    } finally {
      setLoadingSession(false);
    }
  }, []);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [workersRes, financialRes, assignmentsRes, liveRes] =
        await Promise.all([
          workerPerformanceAPI.getWorkersOverview(),
          financialAPI.getFinancialOverview(),
          dashboardAPI.getAssignmentOverview(),
          dashboardAPI.getLiveDashboard(),
        ]);

      if (workersRes.status) setWorkersData(workersRes.data);
      if (financialRes.status) setFinancialData(financialRes.data);
      if (assignmentsRes.status) setAssignmentsData(assignmentsRes.data);
      if (liveRes.status) setLiveData(liveRes.data);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to fetch dashboard data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);
      await Promise.all([fetchDashboardData(), fetchDefaultSession()]);
    } catch (err: any) {
      setError(err.message);
      console.error("Failed to refresh dashboard data:", err);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDashboardData, fetchDefaultSession]);

  useEffect(() => {
    const initializeData = async () => {
      await Promise.all([fetchDashboardData(), fetchDefaultSession()]);
    };
    initializeData();
  }, [fetchDashboardData, fetchDefaultSession]);

  return {
    loading: loading || loadingSession,
    error,
    refreshing,
    workersData,
    financialData,
    assignmentsData,
    liveData,
    defaultSession,
    fetchDashboardData,
    handleRefresh,
  };
};
