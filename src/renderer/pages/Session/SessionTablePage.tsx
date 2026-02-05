// components/Session/SessionTablePage.tsx
import React, { useState } from "react";
import { Calendar, Plus, Download, AlertCircle, Filter, BarChart2, ChevronUp, ChevronDown } from "lucide-react";
import { useSessionData } from "./hooks/useSessionData";
import SessionFormDialog from "./Dialogs/SessionFormDialog";
import { useSessionActions } from "./hooks/useSessionActions";
import { dialogs } from "../../utils/dialogs";
import SessionStats from "./components/SessionStats";
import SessionFilters from "./components/SessionFilters";
import SessionBulkActions from "./components/SessionBulkActions";
import SessionTableView from "./components/SessionTableView";
import SessionGridView from "./components/SessionGridView";
import SessionPagination from "./components/SessionPagination";
import SessionViewDialog from "./Dialogs/SessionViewDialog";

const SessionTablePage: React.FC = () => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    sessions,
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
    selectedSessions,
    setSelectedSessions,
    fetchSessions,
    handleRefresh,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    yearFilter,
    setYearFilter,
    seasonTypeFilter,
    setSeasonTypeFilter,
  } = useSessionData();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(
    null,
  );
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [showStats, setShowStats] = useState(false);
  const {
    handleDeleteSession,
    handleBulkDelete,
    handleExportCSV,
    handleCloseSession,
    handleArchiveSession,
    handleDuplicateSession,
    handleActivateSession,
  } = useSessionActions(sessions, fetchSessions, selectedSessions);

  // Dialog handlers
  const openCreateDialog = () => {
    setDialogMode("add");
    setSelectedSessionId(null);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (id: number) => {
    closeViewDialog();
    setDialogMode("edit");
    setSelectedSessionId(id);
    setIsFormDialogOpen(true);
  };

  const openViewDialog = (id: number) => {
    setSelectedSessionId(id);
    setIsViewDialogOpen(true);
  };

  const closeFormDialog = async () => {
  
    setIsFormDialogOpen(false);
    setSelectedSessionId(null);
  };

  const closeViewDialog = async () => {
    setIsViewDialogOpen(false);
    setSelectedSessionId(null);
  };

  const handleFormSuccess = async () => {
    await fetchSessions();
    closeFormDialog();
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedSessions.length === sessions.length) {
      setSelectedSessions([]);
    } else {
      setSelectedSessions(sessions.map((s) => s.id));
    }
  };

  const toggleSelectSession = (id: number) => {
    setSelectedSessions((prev) =>
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
    setStatusFilter(status as "all" | "active" | "closed" | "archived");
    setCurrentPage(1);
  };

  const handleYearFilterChange = (year: number | "all") => {
    setYearFilter(year);
    setCurrentPage(1);
  };

  const handleSeasonTypeFilterChange = (seasonType: string) => {
    setSeasonTypeFilter(seasonType);
    setCurrentPage(1);
  };

  // Loading skeleton instead of full page spinner
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
                    "Year",
                    "Season Type",
                    "Start Date",
                    "End Date",
                    "Status",
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
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-8"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-16"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-16"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-6 bg-gray-100 rounded-full animate-pulse w-16"></div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {[...Array(4)].map((_, i) => (
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
                  {[...Array(4)].map((_, i) => (
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

  // Error state
  if (error && !sessions.length && !loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="p-6 bg-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1
                className="text-2xl font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Calendar className="w-6 h-6" />
                Session Management
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
              Error Loading Session Data
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
                <Calendar className="w-6 h-6" />
                Session Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage farming seasons, assign bukids, and track worker
                assignments
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
                New Session
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
                <SessionStats stats={stats} />
              </div>
            )}

            {/* Filters */}
            <div className="mb-6">
              <SessionFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={(status) => {
                  setStatusFilter(
                    status as "all" | "active" | "closed" | "archived",
                  );
                }}
                yearFilter={yearFilter}
                setYearFilter={setYearFilter}
                seasonTypeFilter={seasonTypeFilter}
                setSeasonTypeFilter={setSeasonTypeFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleRefresh={handleRefresh}
                refreshing={refreshing}
                handleStatusFilterChange={handleStatusFilterChange}
                handleYearFilterChange={handleYearFilterChange}
                handleSeasonTypeFilterChange={handleSeasonTypeFilterChange}
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
            {selectedSessions.length > 0 && (
              <div className="mb-6">
                <SessionBulkActions
                  selectedCount={selectedSessions.length}
                  onBulkDelete={handleBulkDelete}
                  onClearSelection={() => setSelectedSessions([])}
                />
              </div>
            )}

            {/* Loading State */}
            {loading && !refreshing && (
              <div className="mb-6">{renderLoadingSkeleton()}</div>
            )}

            {/* Table or Grid View */}
            {!loading && sessions.length === 0 ? (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 bg-white">
                <div className="text-center p-8">
                  <Calendar
                    className="w-16 h-16 mx-auto mb-4 opacity-20"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">
                    No Sessions Found
                  </h3>
                  <p className="text-sm mb-6 max-w-md mx-auto text-gray-600">
                    {searchQuery ||
                    statusFilter !== "all" ||
                    yearFilter !== "all" ||
                    seasonTypeFilter !== "all"
                      ? "No sessions match your current filters. Try adjusting your search criteria."
                      : "No sessions have been created yet. Get started by creating your first farming season."}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={openCreateDialog}
                      className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md inline-flex items-center bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Session
                    </button>
                  )}
                </div>
              </div>
            ) : !loading && sessions.length > 0 ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                  {viewMode === "table" ? (
                    <SessionTableView
                      sessions={sessions}
                      selectedSessions={selectedSessions}
                      toggleSelectAll={toggleSelectAll}
                      toggleSelectSession={toggleSelectSession}
                      onView={openViewDialog}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteSession}
                      onClose={handleCloseSession}
                      onArchive={handleArchiveSession}
                      onDuplicate={handleDuplicateSession}
                      onActivate={handleActivateSession}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  ) : (
                    <div className="p-6">
                      <SessionGridView
                        sessions={sessions}
                        selectedSessions={selectedSessions}
                        toggleSelectSession={toggleSelectSession}
                        onView={openViewDialog}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteSession}
                        onClose={handleCloseSession}
                        onArchive={handleArchiveSession}
                        onDuplicate={handleDuplicateSession}
                        onActivate={handleActivateSession}
                      />
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <SessionPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      limit={10}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Session Form Dialog */}
      {isFormDialogOpen && (
        <SessionFormDialog
          id={selectedSessionId || undefined}
          mode={dialogMode}
          onClose={closeFormDialog}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* Session View Dialog */}
      {isViewDialogOpen && selectedSessionId && (
        <SessionViewDialog
          id={selectedSessionId}
          onClose={closeViewDialog}
          onEdit={openEditDialog}
        />
      )}
    </>
  );
};

export default SessionTablePage;
