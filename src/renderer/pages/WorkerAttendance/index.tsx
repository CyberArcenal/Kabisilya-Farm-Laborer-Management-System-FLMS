// components/Attendance/AttendanceDashboard.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Calendar as CalendarIcon,
  BarChart3,
  TrendingUp,
  Download,
  Printer,
  Hash,
  Coffee,
  Home,
  DollarSign,
  Percent,
  RefreshCw,
  ArrowLeft,
  Search,
  Filter,
  User,
  Eye,
  Clock,
  TrendingDown,
  Zap
} from 'lucide-react';
import attendanceAPI, {
  type DailyAttendanceSummary,
  type AttendanceRecord,
  type DateRange,
  type AttendanceStatistics
} from '../../apis/attendance';
import workerAPI from '../../apis/worker';
import { showError, showSuccess } from '../../utils/notification';
import { formatCurrency, formatDate, formatNumber } from '../../utils/formatters';

// Worker selection component
interface WorkerSelectorProps {
  selectedWorkerId: number | null;
  onWorkerSelect: (workerId: number | null) => void;
}

const WorkerSelector: React.FC<WorkerSelectorProps> = ({ selectedWorkerId, onWorkerSelect }) => {
  const [workers, setWorkers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadWorkers();
  }, []);

  const loadWorkers = async () => {
    try {
      setLoading(true);
      const response = await workerAPI.getActiveWorkers({ limit: 100 });
      if (response.status) {
        setWorkers(response.data.workers || []);
      }
    } catch (error) {
      console.error('Failed to load workers:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredWorkers = useMemo(() => {
    if (!searchTerm.trim()) return workers;
    return workers.filter(worker =>
      worker.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [workers, searchTerm]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Select Worker
        </label>
      </div>
      
      <div className="relative mb-3">
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <Search className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <input
          type="text"
          placeholder="Search workers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg text-sm transition-colors"
          style={{
            background: 'var(--card-secondary-bg)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)'
          }}
        />
      </div>

      <div className="max-h-60 overflow-y-auto rounded-lg border"
        style={{ borderColor: 'var(--border-color)' }}>
        <button
          onClick={() => onWorkerSelect(null)}
          className={`w-full p-3 text-left hover:bg-opacity-50 transition-colors flex items-center justify-between ${
            selectedWorkerId === null ? 'bg-blue-50' : ''
          }`}
          style={{
            background: selectedWorkerId === null ? 'var(--accent-sky-light)' : 'transparent',
            borderBottom: '1px solid var(--border-color)'
          }}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">All Workers</span>
          </div>
          <span className="text-xs px-2 py-1 rounded"
            style={{ background: 'var(--card-secondary-bg)', color: 'var(--text-secondary)' }}>
            {workers.length} workers
          </span>
        </button>

        {loading ? (
          <div className="p-4 text-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 mx-auto"
              style={{ borderColor: 'var(--primary-color)' }}></div>
          </div>
        ) : filteredWorkers.length === 0 ? (
          <div className="p-4 text-center" style={{ color: 'var(--text-secondary)' }}>
            No workers found
          </div>
        ) : (
          filteredWorkers.map(worker => (
            <button
              key={worker.id}
              onClick={() => onWorkerSelect(worker.id)}
              className={`w-full p-3 text-left hover:bg-opacity-50 transition-colors flex items-center justify-between ${
                selectedWorkerId === worker.id ? 'bg-blue-50' : ''
              }`}
              style={{
                background: selectedWorkerId === worker.id ? 'var(--accent-sky-light)' : 'transparent',
                borderBottom: '1px solid var(--border-color)',
                color: 'var(--text-primary)'
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ background: 'var(--accent-sky-light)', color: 'var(--accent-sky)' }}>
                  {worker.name.charAt(0)}
                </div>
                <div>
                  <div className="text-sm font-medium">{worker.name}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                    ID: {worker.id}
                  </div>
                </div>
              </div>
              {worker.status === 'active' ? (
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

// Date Range Picker Component
interface DateRangePickerProps {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ dateRange, onDateRangeChange }) => {
  const [customStart, setCustomStart] = useState(dateRange.startDate || '');
  const [customEnd, setCustomEnd] = useState(dateRange.endDate || '');

  const presetRanges = [
    { label: 'Today', days: 0 },
    { label: 'Last 7 Days', days: 7 },
    { label: 'Last 30 Days', days: 30 },
    { label: 'This Month', days: -1 },
    { label: 'Last Month', days: -2 }
  ];

  const applyPreset = (days: number) => {
    const endDate = new Date();
    const startDate = new Date();

    if (days === -1) { // This month
      startDate.setDate(1);
    } else if (days === -2) { // Last month
      endDate.setMonth(endDate.getMonth() - 1);
      endDate.setDate(0);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(1);
    } else {
      startDate.setDate(startDate.getDate() - days);
    }

    onDateRangeChange({
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    });
  };

  const applyCustom = () => {
    if (customStart && customEnd) {
      onDateRangeChange({
        startDate: customStart,
        endDate: customEnd
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <CalendarIcon className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
        <label className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          Date Range
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        {presetRanges.map((preset, index) => (
          <button
            key={index}
            onClick={() => applyPreset(preset.days)}
            className="px-3 py-2 rounded-lg text-sm transition-all duration-200 hover:shadow-md"
            style={{
              background: 'var(--card-secondary-bg)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        <div className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Custom Range
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              Start Date
            </label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="w-full p-2 rounded-lg text-sm transition-colors"
              style={{
                background: 'var(--card-secondary-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
              End Date
            </label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="w-full p-2 rounded-lg text-sm transition-colors"
              style={{
                background: 'var(--card-secondary-bg)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)'
              }}
            />
          </div>
        </div>
        <button
          onClick={applyCustom}
          disabled={!customStart || !customEnd}
          className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md disabled:opacity-50"
          style={{
            background: 'var(--primary-color)',
            color: 'var(--sidebar-text)'
          }}
        >
          Apply Custom Range
        </button>
      </div>
    </div>
  );
};

// Main Attendance Dashboard Component
const AttendanceDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State management
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>({
    startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
      .toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [viewType, setViewType] = useState<'overview' | 'daily' | 'worker-detail'>('overview');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Data states
  const [attendanceData, setAttendanceData] = useState<DailyAttendanceSummary[]>([]);
  const [statistics, setStatistics] = useState<AttendanceStatistics | null>(null);
  const [selectedWorkerData, setSelectedWorkerData] = useState<any>(null);
  const [dailyDetails, setDailyDetails] = useState<Record<string, AttendanceRecord[]>>({});

  // Load statistics
  const loadStatistics = useCallback(async () => {
    try {
      const response = await attendanceAPI.getStatistics(dateRange);
      if (response.status) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    }
  }, [dateRange]);

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
          sortBy: 'assignment_date',
          sortOrder: 'DESC'
        });

        if (response.status) {
          const workerResponse = await workerAPI.getWorkerById(selectedWorkerId);
          if (workerResponse.status) {
            setSelectedWorkerData(workerResponse.data.worker);
          }

          // Group assignments by date
          const groupedByDate: Record<string, AttendanceRecord[]> = {};
          response.data.assignments.forEach((assignment: AttendanceRecord) => {
            const date = assignment.assignment_date.split('T')[0];
            if (!groupedByDate[date]) {
              groupedByDate[date] = [];
            }
            groupedByDate[date].push(assignment);
          });

          setDailyDetails(groupedByDate);
          setAttendanceData([]); // Clear daily summaries for single worker view
        }
      } else {
        // Load all workers daily summaries
        const response = await attendanceAPI.getByDateRange(
          dateRange.startDate || '',
          dateRange.endDate || ''
        );

        if (response.status) {
          setAttendanceData(response.data.daily_summaries || []);
          setSelectedWorkerData(null);
          setDailyDetails({});
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load attendance data');
      console.error('Failed to load attendance:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedWorkerId, dateRange]);

  // Initial load
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          loadStatistics(),
          loadAttendanceData()
        ]);
      } catch (err: any) {
        setError(err.message || 'Failed to load data');
        showError(err.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [loadStatistics, loadAttendanceData]);

  // Handle refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      loadStatistics(),
      loadAttendanceData()
    ]);
  };

  // Handle export
  const handleExport = async () => {
    try {
      const response = await attendanceAPI.exportToCSV({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        format: 'csv',
        includeHeaders: true
      });

      if (response.status) {
        const blob = new Blob([response.data.csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = response.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showSuccess(`Exported ${response.data.recordCount} records successfully`);
      }
    } catch (err: any) {
      showError(err.message || 'Failed to export data');
    }
  };

  // Calculate pagination
  const paginatedAttendance = useMemo(() => {
    if (!attendanceData.length) return [];
    const startIndex = (currentPage - 1) * itemsPerPage;
    return attendanceData.slice(startIndex, startIndex + itemsPerPage);
  }, [attendanceData, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(attendanceData.length / itemsPerPage);

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div
            className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-3 transition-colors duration-300"
            style={{ borderColor: 'var(--primary-color)' }}
          ></div>
          <p className="text-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
            Loading attendance data...
          </p>
        </div>
      </div>
    );
  }

  // Error state with retry option
  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--danger-color)' }} />
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--danger-color)' }}>
          Error Loading Data
        </p>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          {error}
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center mx-auto"
          style={{
            background: 'var(--primary-color)',
            color: 'var(--sidebar-text)'
          }}
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </button>
      </div>
    );
  }

  // Empty state
  const isEmpty = !attendanceData.length && !selectedWorkerData;
  if (isEmpty) {
    return (
      <div className="text-center p-8">
        <Calendar className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-secondary)' }} />
        <p className="text-base font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
          No Attendance Data Found
        </p>
        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          {selectedWorkerId
            ? 'This worker has no attendance records for the selected period.'
            : 'No attendance records found for the selected period.'}
        </p>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md"
          style={{
            background: 'var(--primary-color)',
            color: 'var(--sidebar-text)'
          }}
        >
          Refresh Data
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
          <div className="p-5 rounded-xl"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)'
            }}>
            <WorkerSelector
              selectedWorkerId={selectedWorkerId}
              onWorkerSelect={setSelectedWorkerId}
            />
          </div>

          <div className="p-5 rounded-xl"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)'
            }}>
            <DateRangePicker
              dateRange={dateRange}
              onDateRangeChange={setDateRange}
            />
          </div>

          <div className="p-5 rounded-xl"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border-color)'
            }}>
            <div className="flex items-center gap-2 mb-4">
              <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Quick Actions
              </h3>
            </div>
            <div className="space-y-2">
              <button
                onClick={handleRefresh}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
                style={{
                  background: 'var(--card-secondary-bg)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                Refresh Data
              </button>
              <button
                onClick={handleExport}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
                style={{
                  background: 'var(--card-secondary-bg)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
                }}
              >
                <Download className="w-4 h-4" />
                Export CSV
              </button>
              <button
                onClick={() => window.print()}
                className="w-full px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2"
                style={{
                  background: 'var(--card-secondary-bg)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)'
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
              <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                <CalendarIcon className="w-6 h-6" />
                {selectedWorkerId ? `${selectedWorkerData?.name || 'Worker'}'s Attendance` : 'Attendance Dashboard'}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                {formatDate(dateRange.startDate || '', 'MMM dd, yyyy')} - {formatDate(dateRange.endDate || '', 'MMM dd, yyyy')}
                {selectedWorkerId && ` • Worker ID: ${selectedWorkerId}`}
              </p>
            </div>

            <div className="flex gap-2">
              {['overview', 'daily', 'worker-detail'].map((type) => (
                <button
                  key={type}
                  onClick={() => setViewType(type as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    viewType === type ? '' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{
                    background: viewType === type ? 'var(--primary-color)' : 'var(--card-secondary-bg)',
                    color: viewType === type ? 'var(--sidebar-text)' : 'var(--text-secondary)',
                    border: '1px solid var(--border-color)'
                  }}
                >
                  {type.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Statistics Cards */}
          {statistics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)'
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Total Workers
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {statistics.overview.total_active_workers}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Active in period
                </div>
              </div>

              <div className="p-4 rounded-xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)'
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Total Assignments
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(statistics.overview.total_assignments)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Avg {statistics.overview.average_assignments_per_day.toFixed(1)}/day
                </div>
              </div>

              <div className="p-4 rounded-xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)'
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <Hash className="w-5 h-5" style={{ color: 'var(--accent-sky)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Total LuWang
                  </span>
                </div>
                <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                  {formatNumber(statistics.overview.total_luwang)}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Avg {statistics.overview.average_luwang_per_day.toFixed(1)}/day
                </div>
              </div>

              <div className="p-4 rounded-xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)'
                }}>
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Trend
                  </span>
                </div>
                <div className={`text-2xl font-bold ${statistics.trends.luwang_change.includes('+') ? 'text-green-600' : 'text-red-600'}`}>
                  {statistics.trends.luwang_change}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  vs previous period
                </div>
              </div>
            </div>
          )}

          {/* Content based on view type */}
          {viewType === 'overview' && (
            <div className="p-5 rounded-xl"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)'
              }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}>
                <BarChart3 className="w-5 h-5" />
                Daily Overview
              </h3>

              {attendanceData.length === 0 ? (
                <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No attendance records for this period</p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr style={{ background: 'var(--table-header-bg)' }}>
                          <th className="p-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Date
                          </th>
                          <th className="p-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Workers Present
                          </th>
                          <th className="p-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Total LuWang
                          </th>
                          <th className="p-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Avg LuWang/Worker
                          </th>
                          <th className="p-3 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedAttendance.map((day, index) => (
                          <tr key={index} style={{ borderBottom: '1px solid var(--border-color)' }}>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                                <div>
                                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                    {formatDate(day.date, 'MMM dd, yyyy')}
                                  </div>
                                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {day.day_of_week || new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Users className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
                                <span style={{ color: 'var(--text-primary)' }}>{day.total_workers}</span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="flex items-center gap-2">
                                <Hash className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {formatNumber(day.total_luwang)}
                                </span>
                              </div>
                            </td>
                            <td className="p-3">
                              <div className="text-sm" style={{ color: 'var(--text-primary)' }}>
                                {day.total_workers > 0 ? (day.total_luwang / day.total_workers).toFixed(1) : 0}
                              </div>
                            </td>
                            <td className="p-3">
                              <button
                                onClick={() => {
                                  setViewType('daily');
                                  // Store the selected date for detailed view
                                  sessionStorage.setItem('selectedDate', day.date);
                                }}
                                className="text-xs px-3 py-1 rounded transition-colors hover:shadow-md"
                                style={{
                                  background: 'var(--accent-sky-light)',
                                  color: 'var(--accent-sky)',
                                  border: '1px solid var(--border-color)'
                                }}
                              >
                                View Details
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4 pt-4 border-t"
                      style={{ borderColor: 'var(--border-color)' }}>
                      <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, attendanceData.length)} of {attendanceData.length} days
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                          style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)'
                          }}
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm" style={{ color: 'var(--text-primary)' }}>
                          Page {currentPage} of {totalPages}
                        </span>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                          disabled={currentPage === totalPages}
                          className="px-3 py-1 rounded text-sm transition-colors disabled:opacity-50"
                          style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)'
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

          {viewType === 'worker-detail' && selectedWorkerData && (
            <div className="space-y-6">
              {/* Worker Summary Card */}
              <div className="p-5 rounded-xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)'
                }}>
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold"
                      style={{ background: 'var(--accent-sky-light)', color: 'var(--accent-sky)' }}>
                      {selectedWorkerData.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {selectedWorkerData.name}
                      </h3>
                      <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        ID: {selectedWorkerData.id} • {selectedWorkerData.status.charAt(0).toUpperCase() + selectedWorkerData.status.slice(1)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/worker/view/${selectedWorkerId}`)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center"
                    style={{
                      background: 'var(--card-secondary-bg)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Full Profile
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-3 rounded-lg text-center"
                    style={{
                      background: 'var(--card-secondary-bg)',
                      border: '1px solid var(--border-color)'
                    }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Days Worked
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {Object.keys(dailyDetails).length}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg text-center"
                    style={{
                      background: 'var(--card-secondary-bg)',
                      border: '1px solid var(--border-color)'
                    }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Total LuWang
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {Object.values(dailyDetails).reduce((total, assignments) => 
                        total + assignments.reduce((sum, a) => sum + a.luwang_count, 0), 0)}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg text-center"
                    style={{
                      background: 'var(--card-secondary-bg)',
                      border: '1px solid var(--border-color)'
                    }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Avg LuWang/Day
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {Object.keys(dailyDetails).length > 0 
                        ? (Object.values(dailyDetails).reduce((total, assignments) => 
                            total + assignments.reduce((sum, a) => sum + a.luwang_count, 0), 0) / Object.keys(dailyDetails).length).toFixed(1)
                        : 0}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg text-center"
                    style={{
                      background: 'var(--card-secondary-bg)',
                      border: '1px solid var(--border-color)'
                    }}>
                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                      Current Balance
                    </div>
                    <div className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {formatCurrency(selectedWorkerData.currentBalance)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Worker Attendance Details */}
              <div className="p-5 rounded-xl"
                style={{
                  background: 'var(--card-bg)',
                  border: '1px solid var(--border-color)'
                }}>
                <h3 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                  Daily Attendance
                </h3>
                
                {Object.keys(dailyDetails).length === 0 ? (
                  <div className="text-center py-8" style={{ color: 'var(--text-secondary)' }}>
                    <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No attendance records for this worker in the selected period</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(dailyDetails).map(([date, assignments]) => (
                      <div key={date} className="p-4 rounded-lg"
                        style={{
                          background: 'var(--card-secondary-bg)',
                          border: '1px solid var(--border-color)'
                        }}>
                        <div className="flex justify-between items-center mb-3">
                          <div>
                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {formatDate(date, 'EEEE, MMMM dd, yyyy')}
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                              {assignments.length} assignment(s)
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Hash className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                              {assignments.reduce((sum, a) => sum + a.luwang_count, 0)} LuWang
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          {assignments.map(assignment => (
                            <div key={assignment.id} className="flex justify-between items-center p-2 rounded"
                              style={{ background: 'var(--card-bg)' }}>
                              <div>
                                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {assignment.pitak?.location || 'Unknown Pitak'}
                                </div>
                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                  {assignment.bukid?.name || 'Unknown Bukid'}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                  {assignment.luwang_count} LuWang
                                </div>
                                <div className={`text-xs px-2 py-1 rounded-full inline-block ${assignment.status === 'completed' ? 'status-badge-completed' : 
                                  assignment.status === 'active' ? 'status-badge-active' : 'status-badge-cancelled'}`}>
                                  {assignment.status}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Top Performers */}
          {statistics?.worker_statistics?.top_performers && statistics.worker_statistics.top_performers.length > 0 && (
            <div className="p-5 rounded-xl"
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--border-color)'
              }}>
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2"
                style={{ color: 'var(--text-primary)' }}>
                <Zap className="w-5 h-5" />
                Top Performers
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {statistics.worker_statistics.top_performers.slice(0, 3).map((performer, index) => (
                  <div key={performer.worker_id} className="p-4 rounded-lg"
                    style={{
                      background: 'var(--card-secondary-bg)',
                      border: '1px solid var(--border-color)'
                    }}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                          index === 0 ? 'text-yellow-600 bg-yellow-100' :
                          index === 1 ? 'text-gray-600 bg-gray-100' :
                          'text-orange-600 bg-orange-100'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            {performer.worker_name}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            {performer.kabisilya || 'No Kabisilya'}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedWorkerId(performer.worker_id);
                          setViewType('worker-detail');
                        }}
                        className="text-xs px-2 py-1 rounded transition-colors"
                        style={{
                          background: 'var(--accent-sky-light)',
                          color: 'var(--accent-sky)',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        View
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div className="text-center p-2 rounded"
                        style={{ background: 'var(--card-bg)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          LuWang
                        </div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {formatNumber(performer.total_luwang)}
                        </div>
                      </div>
                      <div className="text-center p-2 rounded"
                        style={{ background: 'var(--card-bg)' }}>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          Assignments
                        </div>
                        <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                          {performer.total_assignments}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="flex justify-between items-center pt-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          Data updated at: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center"
            style={{
              background: 'var(--card-secondary-bg)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)'
            }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center"
            style={{
              background: 'var(--primary-color)',
              color: 'var(--sidebar-text)'
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