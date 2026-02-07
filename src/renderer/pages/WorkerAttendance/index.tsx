// components/Attendance/AttendanceDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Hash,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Clock,
  User,
  Home,
  DollarSign,
  Percent,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Zap,
  TrendingDown,
} from "lucide-react";
import attendanceAPI, {
  type DailyAttendanceSummary,
  type AttendanceRecord,
  type DateRange,
  type AttendanceStatistics,
  type AttendanceFilterParams,
} from "../../apis/attendance";
import workerAPI, { type WorkerData } from "../../apis/worker";
import { showError, showSuccess } from "../../utils/notification";
import {
  formatCurrency,
  formatDate,
  formatNumber,
} from "../../utils/formatters";

// ============================================================================
// COMPONENT: WorkerSelector
// ============================================================================
interface WorkerSelectorProps {
  selectedWorkerId: number | null;
  onWorkerSelect: (workerId: number | null) => void;
}

const WorkerSelector: React.FC<WorkerSelectorProps> = ({
  selectedWorkerId,
  onWorkerSelect,
}) => {
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const response = await workerAPI.getActiveWorkers({ limit: 100 });
      if (response.status && response.data) {
        setWorkers(response.data.workers || []);
      }
    } catch (error) {
      console.error("Failed to load workers:", error);
      showError("Failed to load workers");
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    if (!searchTerm.trim()) return workers;
    return workers.filter(
      (worker) =>
        worker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (worker.contact &&
          worker.contact.toLowerCase().includes(searchTerm.toLowerCase())),
    );
  }, [workers, searchTerm]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4" style={{ color: "var(--text-secondary)" }} />
        <label
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Select Worker
        </label>
      </div>

      <div className="relative">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Search
            className="w-4 h-4"
            style={{ color: "var(--text-tertiary)" }}
          />
        </div>
        <input
          type="text"
          placeholder="Search workers by name or contact..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
          style={{
            background: "var(--input-bg)",
            color: "var(--text-primary)",
            border: "1px solid var(--input-border)",
          }}
        />
      </div>

      <div
        className="border rounded-lg overflow-hidden max-h-64 overflow-y-auto"
        style={{ borderColor: "var(--border-color)" }}
      >
        <button
          onClick={() => onWorkerSelect(null)}
          className={`w-full p-3 text-left transition-colors flex items-center justify-between ${
            selectedWorkerId === null ? "bg-blue-50 dark:bg-blue-900/20" : ""
          }`}
          style={{
            background:
              selectedWorkerId === null
                ? "var(--accent-sky-light)"
                : "transparent",
            borderBottom: "1px solid var(--border-color)",
          }}
        >
          <div className="flex items-center gap-2">
            <Users
              className="w-4 h-4"
              style={{ color: "var(--accent-green)" }}
            />
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              All Workers
            </span>
          </div>
          <span
            className="text-xs px-2 py-1 rounded"
            style={{
              background: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
            }}
          >
            {workers.length} workers
          </span>
        </button>

        {loading ? (
          <div className="p-4 text-center">
            <div
              className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto"
              style={{ borderColor: "var(--primary-color)" }}
            ></div>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div
            className="p-4 text-center text-sm"
            style={{ color: "var(--text-secondary)" }}
          >
            No workers found
          </div>
        ) : (
          filteredWorkers.map((worker) => (
            <button
              key={worker.id}
              onClick={() => onWorkerSelect(worker.id)}
              className={`w-full p-3 text-left transition-colors flex items-center justify-between ${
                selectedWorkerId === worker.id
                  ? "bg-blue-50 dark:bg-blue-900/20"
                  : ""
              }`}
              style={{
                background:
                  selectedWorkerId === worker.id
                    ? "var(--accent-sky-light)"
                    : "transparent",
                borderBottom: "1px solid var(--border-color)",
              }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{
                    background: "var(--accent-sky-light)",
                    color: "var(--accent-sky)",
                  }}
                >
                  {worker.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-left">
                  <div
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {worker.name}
                  </div>
                  {worker.contact && (
                    <div
                      className="text-xs"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {worker.contact}
                    </div>
                  )}
                </div>
              </div>
              <div
                className={`w-2 h-2 rounded-full ${
                  worker.status === "active"
                    ? "bg-green-500"
                    : worker.status === "inactive"
                      ? "bg-gray-400"
                      : "bg-yellow-500"
                }`}
              ></div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: DateRangePicker
// ============================================================================
interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({
  dateRange,
  onDateRangeChange,
}) => {
  const [customStart, setCustomStart] = useState(dateRange.startDate || "");
  const [customEnd, setCustomEnd] = useState(dateRange.endDate || "");

  const presetRanges = [
    { label: "Today", days: 0 },
    { label: "Last 7 Days", days: 7 },
    { label: "Last 30 Days", days: 30 },
    { label: "This Month", days: -1 },
    { label: "Last Month", days: -2 },
  ];

  const applyPreset = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();

    if (days === -1) {
      // This month
      startDate.setDate(1);
    } else if (days === -2) {
      // Last month
      endDate.setMonth(endDate.getMonth() - 1);
      endDate.setDate(0);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(1);
    } else {
      startDate.setDate(startDate.getDate() - days);
    }

    onDateRangeChange({
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
    });

    setCustomStart(startDate.toISOString().split("T")[0]);
    setCustomEnd(endDate.toISOString().split("T")[0]);
  };

  const applyCustom = () => {
    if (customStart && customEnd) {
      onDateRangeChange({
        startDate: customStart,
        endDate: customEnd,
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <CalendarIcon
          className="w-4 h-4"
          style={{ color: "var(--text-secondary)" }}
        />
        <label
          className="text-sm font-medium"
          style={{ color: "var(--text-primary)" }}
        >
          Date Range
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {presetRanges.map((preset, index) => (
          <button
            key={index}
            onClick={() => applyPreset(preset.days)}
            className="px-3 py-2 rounded-lg text-sm transition-all hover:shadow-sm"
            style={{
              background: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div
          className="text-sm font-medium"
          style={{ color: "var(--text-secondary)" }}
        >
          Custom Range
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label
              className="text-xs block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              Start Date
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full p-2 rounded-lg text-sm"
              style={{
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>
          <div>
            <label
              className="text-xs block mb-1"
              style={{ color: "var(--text-secondary)" }}
            >
              End Date
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full p-2 rounded-lg text-sm"
              style={{
                background: "var(--input-bg)",
                color: "var(--text-primary)",
                border: "1px solid var(--input-border)",
              }}
            />
          </div>
        </div>
        <button
          onClick={applyCustom}
          disabled={!customStart || !customEnd}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: "var(--primary-color)",
            color: "white",
          }}
        >
          Apply Custom Range
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT: WorkerAttendanceCard
// ============================================================================
interface WorkerAttendanceCardProps {
  worker: any;
  assignments: AttendanceRecord[];
  onViewDetails: (workerId: number) => void;
}

const WorkerAttendanceCard: React.FC<WorkerAttendanceCardProps> = ({
  worker,
  assignments,
  onViewDetails,
}) => {
  const totalLuwang = assignments.reduce((sum, a) => sum + a.luwang_count, 0);
  const workDays = new Set(
    assignments.map((a) => a.assignment_date.split("T")[0]),
  ).size;
  const avgLuwangPerDay =
    workDays > 0 ? (totalLuwang / workDays).toFixed(1) : "0";

  const recentAssignments = assignments.slice(0, 3);

  return (
    <div
      className="p-4 rounded-xl windows-card"
      style={{ background: "var(--card-bg)" }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{
              background: "var(--accent-sky-light)",
              color: "var(--accent-sky)",
            }}
          >
            {worker.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h4
              className="font-medium"
              style={{ color: "var(--text-primary)" }}
            >
              {worker.name}
            </h4>
            <div className="flex items-center gap-2 mt-1">
              <div
                className={`text-xs px-2 py-1 rounded-full ${
                  worker.status === "active"
                    ? "status-badge-active"
                    : "status-badge-inactive"
                }`}
              >
                {worker.status}
              </div>
              {worker.contact && (
                <div
                  className="text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {worker.contact}
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => onViewDetails(worker.id)}
          className="text-xs px-3 py-1 rounded transition-colors hover:shadow-sm"
          style={{
            background: "var(--accent-sky-light)",
            color: "var(--accent-sky)",
            border: "1px solid var(--border-color)",
          }}
        >
          <Eye className="w-3 h-3 inline mr-1" />
          View
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-3">
        <div
          className="text-center p-2 rounded"
          style={{ background: "var(--card-secondary-bg)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Days Worked
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {workDays}
          </div>
        </div>
        <div
          className="text-center p-2 rounded"
          style={{ background: "var(--card-secondary-bg)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Total LuWang
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {totalLuwang}
          </div>
        </div>
        <div
          className="text-center p-2 rounded"
          style={{ background: "var(--card-secondary-bg)" }}
        >
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            Avg/Day
          </div>
          <div
            className="text-lg font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {avgLuwangPerDay}
          </div>
        </div>
      </div>

      {recentAssignments.length > 0 && (
        <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
          <div className="mb-1 font-medium">Recent Work:</div>
          <div className="space-y-1">
            {recentAssignments.map((assignment, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="truncate" style={{ maxWidth: "70%" }}>
                  {formatDate(assignment.assignment_date, "MMM dd")} -{" "}
                  {assignment.pitak?.location || "Unknown"}
                </div>
                <div className="flex items-center gap-1">
                  <Hash className="w-3 h-3" />
                  <span>{assignment.luwang_count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: AttendanceDashboard
// ============================================================================
const AttendanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State management
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString()
      .split("T")[0],
    endDate: new Date().toISOString().split("T")[0],
  });
  const [viewType, setViewType] = useState<"overview" | "worker-detail">(
    "overview",
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  // Data states
  const [attendanceData, setAttendanceData] = useState<
    DailyAttendanceSummary[]
  >([]);
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(
    null,
  );
  const [workersData, setWorkersData] = useState<WorkerData[]>([]);
  const [workerAssignments, setWorkerAssignments] = useState<
    Record<number, AttendanceRecord[]>
  >({});
  const [selectedWorkerDetails, setSelectedWorkerDetails] = useState<any>(null);
  const [selectedWorkerAssignments, setSelectedWorkerAssignments] = useState<
    AttendanceRecord[]
  >([]);

  // Load workers
  const loadWorkers = useCallback(async () => {
    try {
      const response = await workerAPI.getActiveWorkers({ limit: 100 });
      if (response.status && response.data) {
        setWorkersData(response.data.workers || []);
      }
    } catch (error) {
      console.error("Failed to load workers:", error);
    }
  }, []);

  // Load attendance data
  const loadAttendanceData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (selectedWorkerId) {
        // Load single worker attendance
        const response = await attendanceAPI.getByWorker(selectedWorkerId, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          sortBy: "assignment_date",
          sortOrder: "DESC",
        });

        if (response.status) {
          setSelectedWorkerAssignments(response.data.assignments || []);

          // Get worker details
          const workerResponse =
            await workerAPI.getWorkerById(selectedWorkerId);
          if (workerResponse.status && workerResponse.data) {
            setSelectedWorkerDetails(workerResponse.data.worker);
          }
        }
      } else {
        // Load all workers daily summaries
        const response = await attendanceAPI.getByDateRange(
          dateRange.startDate || "",
          dateRange.endDate || "",
        );

        if (response.status) {
          setAttendanceData(response.data.daily_summaries || []);

          // Process assignments by worker
          const assignmentsByWorker: Record<number, AttendanceRecord[]> = {};
          response.data.raw_assignments?.forEach(
            (assignment: AttendanceRecord) => {
              const workerId = assignment.worker.id;
              if (!assignmentsByWorker[workerId]) {
                assignmentsByWorker[workerId] = [];
              }
              assignmentsByWorker[workerId].push(assignment);
            },
          );
          setWorkerAssignments(assignmentsByWorker);
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to load attendance data");
      console.error("Failed to load attendance:", err);
      showError("Failed to load attendance data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedWorkerId, dateRange]);

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const response = await attendanceAPI.getStatistics(dateRange);
      if (response.status) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error("Failed to load statistics:", error);
    }
  }, [dateRange]);

  // Initial load
  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadWorkers(),
          loadStatistics(),
          loadAttendanceData(),
        ]);
      } catch (err: any) {
        setError(err.message || "Failed to load data");
        showError("Failed to load data");
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, [loadWorkers, loadStatistics, loadAttendanceData]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadWorkers(), loadStatistics(), loadAttendanceData()]);
    showSuccess("Data refreshed successfully");
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await attendanceAPI.exportToCSV({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: "csv",
        includeHeaders: true,
      });

      if (response.status) {
        const blob = new Blob([response.data.csvData], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        showSuccess(
          `Exported ${response.data.recordCount} records successfully`,
        );
      }
    } catch (err: any) {
      showError(err.message || "Failed to export data");
    }
  };

  // Handle worker selection for details
  const handleViewWorkerDetails = (workerId: number) => {
    setSelectedWorkerId(workerId);
    setViewType("worker-detail");
  };

  // Calculate worker summary for cards
  const getWorkerSummary = (workerId: number) => {
    const assignments = workerAssignments[workerId] || [];
    const totalLuwang = assignments.reduce((sum, a) => sum + a.luwang_count, 0);
    const workDays = new Set(
      assignments.map((a) => a.assignment_date.split("T")[0]),
    ).size;
    const avgLuwangPerDay =
      workDays > 0 ? (totalLuwang / workDays).toFixed(1) : "0";

    return {
      assignments,
      totalLuwang,
      workDays,
      avgLuwangPerDay,
    };
  };

  // Get paginated workers
  const paginatedWorkers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return workersData.slice(startIndex, startIndex + itemsPerPage);
  }, [workersData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(workersData.length / itemsPerPage);

  // Loading state
  if (loading && !refreshing) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-3"
            style={{ borderColor: "var(--primary-color)" }}
          ></div>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Loading attendance data...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle
          className="w-12 h-12 mx-auto mb-3"
          style={{ color: "var(--danger-color)" }}
        />
        <p
          className="text-base font-semibold mb-1"
          style={{ color: "var(--danger-color)" }}
        >
          Error Loading Data
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md flex items-center mx-auto"
          style={{
            background: "var(--primary-color)",
            color: "white",
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  const isEmpty = workersData.length === 0 && !selectedWorkerId;
  if (isEmpty) {
    return (
      <div className="text-center p-8">
        <Calendar
          className="w-12 h-12 mx-auto mb-3"
          style={{ color: "var(--text-secondary)" }}
        />
        <p
          className="text-base font-semibold mb-1"
          style={{ color: "var(--text-primary)" }}
        >
          No Workers Found
        </p>
        <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
          Add workers first to track their attendance
        </p>
        <button
          onClick={() => navigate("/workers")}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md"
          style={{
            background: "var(--primary-color)",
            color: "white",
          }}
        >
          Go to Workers Management
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left Panel - Filters */}
        <div className="lg:w-1/4 space-y-6">
          <div className="p-5 rounded-xl windows-card">
            <WorkerSelector
              selectedWorkerId={selectedWorkerId}
              onWorkerSelect={setSelectedWorkerId}
            />
          </div>

          <div className="p-5 rounded-xl windows-card">
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          <div className="p-5 rounded-xl windows-card">
            <div className="flex items-center gap-2 mb-4">
              <Filter
                className="w-4 h-4"
                style={{ color: "var(--text-secondary)" }}
              />
              <h3
                className="text-sm font-medium"
                style={{ color: "var(--text-primary)" }}
              >
                Quick Actions
              </h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleRefresh}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md flex items-center justify-center gap-2"
                style={{
                  background: "var(--card-secondary-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <RefreshCw
                  className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
                />
                Refresh Data
              </button>
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md flex items-center justify-center gap-2"
                style={{
                  background: "var(--card-secondary-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md flex items-center justify-center gap-2"
                style={{
                  background: "var(--card-secondary-bg)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                <Printer className="w-4 h-4" />
                Print Report
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel - Main Content */}
        <div className="lg:w-3/4 space-y-6">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1
                className="text-2xl font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <CalendarIcon className="w-6 h-6" />
                {selectedWorkerId
                  ? `${selectedWorkerDetails?.name || "Worker"}'s Attendance`
                  : "Worker Attendance"}
              </h1>
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                {formatDate(dateRange.startDate || "", "MMM dd, yyyy")} -{" "}
                {formatDate(dateRange.endDate || "", "MMM dd, yyyy")}
                {selectedWorkerId && ` • Worker ID: ${selectedWorkerId}`}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setViewType("overview")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  viewType === "overview" ? "" : "opacity-70 hover:opacity-100"
                }`}
                style={{
                  background:
                    viewType === "overview"
                      ? "var(--primary-color)"
                      : "var(--card-secondary-bg)",
                  color:
                    viewType === "overview" ? "white" : "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                }}
              >
                Overview
              </button>
              {selectedWorkerId && (
                <button
                  onClick={() => setViewType("worker-detail")}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    viewType === "worker-detail"
                      ? ""
                      : "opacity-70 hover:opacity-100"
                  }`}
                  style={{
                    background:
                      viewType === "worker-detail"
                        ? "var(--primary-color)"
                        : "var(--card-secondary-bg)",
                    color:
                      viewType === "worker-detail"
                        ? "white"
                        : "var(--text-secondary)",
                    border: "1px solid var(--border-color)",
                  }}
                >
                  Worker Details
                </button>
              )}
            </div>
          </div>

          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl windows-card">
                <div className="flex items-center gap-2 mb-2">
                  <Users
                    className="w-5 h-5"
                    style={{ color: "var(--accent-green)" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Total Workers
                  </span>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {statistics.overview.total_active_workers}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Active in period
                </div>
              </div>

              <div className="p-4 rounded-xl windows-card">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle
                    className="w-5 h-5"
                    style={{ color: "var(--accent-gold)" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Total Assignments
                  </span>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatNumber(statistics.overview.total_assignments)}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Avg{" "}
                  {statistics.overview.average_assignments_per_day.toFixed(1)}
                  /day
                </div>
              </div>

              <div className="p-4 rounded-xl windows-card">
                <div className="flex items-center gap-2 mb-2">
                  <Hash
                    className="w-5 h-5"
                    style={{ color: "var(--accent-sky)" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Total LuWang
                  </span>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {formatNumber(statistics.overview.total_luwang)}
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Avg {statistics.overview.average_luwang_per_day.toFixed(1)}
                  /day
                </div>
              </div>

              <div className="p-4 rounded-xl windows-card">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp
                    className="w-5 h-5"
                    style={{ color: "var(--accent-gold)" }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-primary)" }}
                  >
                    Attendance Rate
                  </span>
                </div>
                <div
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {statistics.overview.total_active_workers > 0
                    ? Math.round(
                        (statistics.overview.total_assignments /
                          (statistics.overview.total_active_workers * 30)) *
                          100,
                      )
                    : 0}
                  %
                </div>
                <div
                  className="text-xs mt-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Overall participation
                </div>
              </div>
            </div>
          )}

          {/* Main Content */}
          {viewType === "overview" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3
                  className="text-lg font-bold flex items-center gap-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  <Users className="w-5 h-5" />
                  Workers Attendance ({workersData.length} workers)
                </h3>
                <div
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Showing {paginatedWorkers.length} workers
                </div>
              </div>

              {paginatedWorkers.length === 0 ? (
                <div
                  className="text-center py-12"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No workers found</p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {paginatedWorkers.map((worker) => {
                      const summary = getWorkerSummary(worker.id);
                      return (
                        <WorkerAttendanceCard
                          key={worker.id}
                          worker={worker}
                          assignments={summary.assignments}
                          onViewDetails={handleViewWorkerDetails}
                        />
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div
                      className="flex justify-between items-center mt-6 pt-6 border-t"
                      style={{ borderColor: "var(--border-color)" }}
                    >
                      <div
                        className="text-sm"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                        {Math.min(
                          currentPage * itemsPerPage,
                          workersData.length,
                        )}{" "}
                        of {workersData.length} workers
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() =>
                            setCurrentPage((prev) => Math.max(1, prev - 1))
                          }
                          disabled={currentPage === 1}
                          className="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: "var(--card-secondary-bg)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          Previous
                        </button>
                        <span
                          className="px-3 py-1 text-sm"
                          style={{ color: "var(--text-primary)" }}
                        >
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() =>
                            setCurrentPage((prev) =>
                              Math.min(totalPages, prev + 1),
                            )
                          }
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          style={{
                            background: "var(--card-secondary-bg)",
                            color: "var(--text-secondary)",
                            border: "1px solid var(--border-color)",
                          }}
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {viewType === "worker-detail" && selectedWorkerDetails && (
            <div className="space-y-6">
              {/* Worker Details Card */}
              <div className="p-5 rounded-xl windows-card">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div
                      className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                      style={{
                        background: "var(--accent-sky-light)",
                        color: "var(--accent-sky)",
                      }}
                    >
                      {selectedWorkerDetails.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3
                        className="text-xl font-bold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {selectedWorkerDetails.name}
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <div
                          className={`text-xs px-3 py-1 rounded-full ${selectedWorkerDetails.status === "active" ? "status-badge-active" : "status-badge-inactive"}`}
                        >
                          {selectedWorkerDetails.status}
                        </div>
                        {selectedWorkerDetails.contact && (
                          <div
                            className="text-xs px-3 py-1 rounded-full"
                            style={{
                              background: "var(--card-secondary-bg)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            {selectedWorkerDetails.contact}
                          </div>
                        )}
                        {selectedWorkerDetails.hireDate && (
                          <div
                            className="text-xs px-3 py-1 rounded-full"
                            style={{
                              background: "var(--card-secondary-bg)",
                              color: "var(--text-secondary)",
                            }}
                          >
                            Hired:{" "}
                            {formatDate(
                              selectedWorkerDetails.hireDate,
                              "MMM dd, yyyy",
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      navigate(`/workers/view/${selectedWorkerId}`)
                    }
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md flex items-center"
                    style={{
                      background: "var(--card-secondary-bg)",
                      color: "var(--text-secondary)",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Profile
                  </button>
                </div>

                {/* Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div
                    className="p-3 rounded-lg text-center"
                    style={{ background: "var(--card-secondary-bg)" }}
                  >
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Days Worked
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {
                        new Set(
                          selectedWorkerAssignments.map(
                            (a) => a.assignment_date.split("T")[0],
                          ),
                        ).size
                      }
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-lg text-center"
                    style={{ background: "var(--card-secondary-bg)" }}
                  >
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total Assignments
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedWorkerAssignments.length}
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-lg text-center"
                    style={{ background: "var(--card-secondary-bg)" }}
                  >
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Total LuWang
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedWorkerAssignments.reduce(
                        (sum, a) => sum + a.luwang_count,
                        0,
                      )}
                    </div>
                  </div>
                  <div
                    className="p-3 rounded-lg text-center"
                    style={{ background: "var(--card-secondary-bg)" }}
                  >
                    <div
                      className="text-xs mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Avg LuWang/Day
                    </div>
                    <div
                      className="text-xl font-bold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedWorkerAssignments.length > 0
                        ? (
                            selectedWorkerAssignments.reduce(
                              (sum, a) => sum + a.luwang_count,
                              0,
                            ) /
                            new Set(
                              selectedWorkerAssignments.map(
                                (a) => a.assignment_date.split("T")[0],
                              ),
                            ).size
                          ).toFixed(1)
                        : 0}
                    </div>
                  </div>
                </div>

                {/* Recent Assignments */}
                <h4
                  className="text-lg font-bold mb-4"
                  style={{ color: "var(--text-primary)" }}
                >
                  Recent Assignments ({selectedWorkerAssignments.length})
                </h4>

                {selectedWorkerAssignments.length === 0 ? (
                  <div
                    className="text-center py-8"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>
                      No attendance records for this worker in the selected
                      period
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full windows-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Pitak</th>
                          <th>Bukid</th>
                          <th>LuWang</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedWorkerAssignments
                          .slice(0, 10)
                          .map((assignment) => (
                            <tr key={assignment.id}>
                              <td style={{ color: "var(--text-primary)" }}>
                                {formatDate(
                                  assignment.assignment_date,
                                  "MMM dd, yyyy",
                                )}
                              </td>
                              <td style={{ color: "var(--text-primary)" }}>
                                {assignment.pitak?.location || "Unknown"}
                              </td>
                              <td style={{ color: "var(--text-primary)" }}>
                                {assignment.bukid?.name || "Unknown"}
                              </td>
                              <td style={{ color: "var(--text-primary)" }}>
                                <div className="flex items-center gap-1">
                                  <Hash className="w-4 h-4" />
                                  {assignment.luwang_count}
                                </div>
                              </td>
                              <td>
                                <span
                                  className={`text-xs px-2 py-1 rounded-full ${
                                    assignment.status === "completed"
                                      ? "status-badge-completed"
                                      : assignment.status === "active"
                                        ? "status-badge-active"
                                        : "status-badge-cancelled"
                                  }`}
                                >
                                  {assignment.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        className="flex justify-between items-center pt-6 border-t"
        style={{ borderColor: "var(--border-color)" }}
      >
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Data updated: {new Date().toLocaleDateString()}{" "}
          {new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate("/dashboard")}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md flex items-center"
            style={{
              background: "var(--card-secondary-bg)",
              color: "var(--text-secondary)",
              border: "1px solid var(--border-color)",
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:shadow-md flex items-center"
            style={{
              background: "var(--primary-color)",
              color: "white",
            }}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttendanceDashboard;
