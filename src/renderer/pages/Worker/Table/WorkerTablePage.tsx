// components/Worker/WorkerTablePage.tsx
import React, { useState, useCallback, useEffect } from "react";
import {
  Users,
  Plus,
  Download,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  BarChart2,
} from "lucide-react";
import WorkerStats from "./components/WorkerStats";
import { useWorkerData } from "./hooks/useWorkerData";
import WorkerFormDialog from "./Dialogs/WorkerFormDialog";
import { useWorkerActions } from "./hooks/useWorkerActions";
import WorkerFilters from "./components/WorkerFilters";
import WorkerBulkActions from "./components/WorkerBulkActions";
import WorkerTableView from "./components/WorkerTableView";
import WorkerPagination from "./components/WorkerPagination";
import WorkerGridView from "./components/WorkerGridView";
import WorkerViewDialog from "./Dialogs/WorkerViewDialog";
import { dialogs } from "../../../utils/dialogs";
import workerAPI from "../../../apis/worker";

// Define type for worker with financial data
export interface WorkerWithFinancial {
  id: number;
  name: string;
  contact: string | null;
  email: string | null;
  address: string | null;
  status: "active" | "inactive" | "on-leave" | "terminated";
  hireDate: string | Date | null;
  createdAt: string | Date;
  updatedAt: string | Date;
  totalDebt?: number;
  totalPaid?: number;
  currentBalance?: number;
}

const WorkerTablePage: React.FC = () => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [workersWithFinancials, setWorkersWithFinancials] = useState<WorkerWithFinancial[]>([]);
  const [loadingFinancials, setLoadingFinancials] = useState(false);

  const {
    workers,
    stats,
    loading,
    refreshing,
    error,
    currentPage,
    totalPages,
    totalItems,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    selectedWorkers,
    setSelectedWorkers,
    fetchWorkers,
    handleRefresh,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    limit,
  } = useWorkerData();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [showStats, setShowStats] = useState(false);
  const {
    handleDeleteWorker,
    handleBulkDelete,
    handleExportCSV,
    handleUpdateStatus,
    handleGenerateReport,
    handleImportCSV,
  } = useWorkerActions(workersWithFinancials, fetchWorkers, selectedWorkers);

  // Fetch financial data for workers
  const fetchWorkersFinancialData = useCallback(async () => {
    if (!workers.length) {
      setWorkersWithFinancials([]);
      return;
    }

    setLoadingFinancials(true);
    try {
      const workersWithData = await Promise.all(
        workers.map(async (worker) => {
          try {
            // Use the workerAPI to get financial summary
            const response = await workerAPI.getWorkerSummary(worker.id);
            if (response.status && response.data?.summary?.financial) {
              return {
                ...worker,
                totalDebt: response.data.summary.financial.totalDebt || 0,
                totalPaid: response.data.summary.financial.totalPaid || 0,
                currentBalance: response.data.summary.financial.currentBalance || 0,
              };
            }
          } catch (error) {
            console.error(`Failed to fetch financial data for worker ${worker.id}:`, error);
          }
          return {
            ...worker,
            totalDebt: 0,
            totalPaid: 0,
            currentBalance: 0,
          };
        })
      );
      setWorkersWithFinancials(workersWithData);
    } catch (error) {
      console.error("Failed to fetch workers financial data:", error);
      setWorkersWithFinancials(workers.map(w => ({
        ...w,
        totalDebt: 0,
        totalPaid: 0,
        currentBalance: 0,
      })));
    } finally {
      setLoadingFinancials(false);
    }
  }, [workers]);

  // Update financial data when workers change
  useEffect(() => {
    if (!loading && workers.length > 0) {
      fetchWorkersFinancialData();
    } else {
      setWorkersWithFinancials(workers.map(w => ({
        ...w,
        totalDebt: 0,
        totalPaid: 0,
        currentBalance: 0,
      })));
    }
  }, [workers, loading, fetchWorkersFinancialData]);

  // Dialog handlers
  const openCreateDialog = () => {
    setDialogMode("add");
    setSelectedWorkerId(null);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (id: number) => {
    setDialogMode("edit");
    setSelectedWorkerId(id);
    setIsFormDialogOpen(true);
  };

  const openViewDialog = (id: number) => {
    setSelectedWorkerId(id);
    setIsViewDialogOpen(true);
  };

  const closeFormDialog = () => {
    setIsFormDialogOpen(false);
    setSelectedWorkerId(null);
  };

  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedWorkerId(null);
  };

  const handleFormSuccess = async () => {
    await fetchWorkers();
    closeFormDialog();
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedWorkers.length === workersWithFinancials.length) {
      setSelectedWorkers([]);
    } else {
      setSelectedWorkers(workersWithFinancials.map((w) => w.id));
    }
  };

  const toggleSelectWorker = (id: number) => {
    setSelectedWorkers((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "ASC" ? "DESC" : "ASC");
    } else {
      setSortBy(field);
      setSortOrder("ASC");
    }
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Loading skeleton
  const renderLoadingSkeleton = () => {
    if (viewMode === "table") {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: "var(--table-header-bg)" }}>
                  <th className="p-4 text-left">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  {[
                    "Name",
                    "Contact",
                    "Hire Date",
                    "Status",
                    "Financial",
                    "Kabisilya",
                    "Actions",
                  ].map((header) => (
                    <th key={header} className="p-4 text-left">
                      <div className="h-4 bg-gray-200 rounded animate-pulse w-24"></div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, index) => (
                  <tr key={index} className="border-b border-gray-200">
                    <td className="p-4">
                      <div className="w-4 h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-lg animate-pulse"></div>
                        <div>
                          <div className="h-4 bg-gray-100 rounded animate-pulse w-32 mb-1"></div>
                          <div className="h-3 bg-gray-100 rounded animate-pulse w-16"></div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-20"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-16"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-20"></div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {[...Array(5)].map((_, i) => (
                          <div
                            key={i}
                            className="w-6 h-6 bg-gray-100 rounded animate-pulse"
                          ></div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, index) => (
            <div
              key={index}
              className="p-5 rounded-xl bg-white border border-gray-200 animate-pulse"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div className="h-4 bg-gray-100 rounded w-full"></div>
                <div className="h-4 bg-gray-100 rounded w-5/6"></div>
                <div className="h-4 bg-gray-100 rounded w-4/6"></div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="h-8 bg-gray-100 rounded"></div>
                <div className="h-8 bg-gray-100 rounded"></div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <div className="h-3 bg-gray-100 rounded w-12"></div>
                <div className="flex gap-2">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="w-6 h-6 bg-gray-100 rounded"></div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }
  };

  // Combined loading state
  const isLoading = loading || loadingFinancials;

  // Error state
  if (error && !workers.length && !loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="p-6 bg-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1
                className="text-2xl font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Users className="w-6 h-6" />
                Worker Management
              </h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 max-w-md">
            <AlertCircle
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: "var(--danger-color)" }}
            />
            <p
              className="text-base font-semibold mb-2"
              style={{ color: "var(--danger-color)" }}
            >
              Error Loading Worker Data
            </p>
            <p className="text-sm mb-6 text-gray-600">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center mx-auto bg-blue-600 text-white hover:bg-blue-700"
            >
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1
                className="text-2xl font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Users className="w-6 h-6" />
                Worker Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage worker information, track debts and payments, and monitor
                worker status
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <BarChart2 className="w-4 h-4 mr-2" />
                {showStats ? (
                  <>
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Hide Stats
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4 mr-1" />
                    Show Stats
                  </>
                )}
              </button>
              <button
                onClick={handleImportCSV}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                Import CSV
              </button>

              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                onClick={openCreateDialog}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                New Worker
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="h-full p-6">
            {/* Stats Cards */}
            {showStats && (
              <div className="mb-6">
                <WorkerStats stats={stats} />
              </div>
            )}

            {/* Filters */}
            <div className="mb-6">
              <WorkerFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleRefresh={handleRefresh}
                refreshing={refreshing}
                handleStatusFilterChange={handleStatusFilterChange}
                sortBy={sortBy}
                setSortBy={setSortBy}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                setCurrentPage={setCurrentPage}
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
              />
            </div>

            {/* Bulk Actions */}
            {selectedWorkers.length > 0 && (
              <div className="mb-6">
                <WorkerBulkActions
                  selectedCount={selectedWorkers.length}
                  onBulkDelete={handleBulkDelete}
                  onClearSelection={() => setSelectedWorkers([])}
                />
              </div>
            )}

            {/* Loading State */}
            {isLoading && !refreshing && (
              <div className="mb-6">{renderLoadingSkeleton()}</div>
            )}

            {/* Table or Grid View */}
            {!isLoading && workersWithFinancials.length === 0 ? (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 bg-white">
                <div className="text-center p-8">
                  <Users
                    className="w-16 h-16 mx-auto mb-4 opacity-20"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">
                    No Workers Found
                  </h3>
                  <p className="text-sm mb-6 max-w-md mx-auto text-gray-600">
                    {searchQuery
                      ? `No results found for "${searchQuery}". Try a different search term.`
                      : "No workers have been created yet. Get started by creating your first worker."}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={openCreateDialog}
                      className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md inline-flex items-center bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Worker
                    </button>
                  )}
                </div>
              </div>
            ) : !isLoading && workersWithFinancials.length > 0 ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                  {viewMode === "table" ? (
                    <WorkerTableView
                      workers={workersWithFinancials}
                      selectedWorkers={selectedWorkers}
                      toggleSelectAll={toggleSelectAll}
                      toggleSelectWorker={toggleSelectWorker}
                      onView={openViewDialog}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteWorker}
                      onUpdateStatus={handleUpdateStatus}
                      onGenerateReport={handleGenerateReport}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  ) : (
                    <div className="p-6">
                      <WorkerGridView
                        workers={workersWithFinancials}
                        selectedWorkers={selectedWorkers}
                        toggleSelectWorker={toggleSelectWorker}
                        onView={openViewDialog}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteWorker}
                        onUpdateStatus={handleUpdateStatus}
                        onGenerateReport={handleGenerateReport}
                      />
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <WorkerPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      limit={limit}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Worker Form Dialog */}
      {isFormDialogOpen && (
        <WorkerFormDialog
          id={selectedWorkerId || undefined}
          mode={dialogMode}
          onClose={async () => {
            if (
              !(await dialogs.confirm({
                title: "Close Form",
                message:
                  "Are you sure you want to close the form? Any unsaved changes will be lost.",
              }))
            )
              return;

            closeFormDialog();
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Worker View Dialog */}
      {isViewDialogOpen && selectedWorkerId && (
        <WorkerViewDialog
          workerId={selectedWorkerId}
          onClose={closeViewDialog}
          onEdit={openEditDialog}
        />
      )}
    </>
  );
};

export default WorkerTablePage;