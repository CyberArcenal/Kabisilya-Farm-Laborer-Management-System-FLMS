// components/Assignment/AssignmentTablePage.tsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Download, AlertCircle, RefreshCw } from "lucide-react";
import AssignmentStats from "./components/AssignmentStats";
import AssignmentFilters from "./components/AssignmentFilters";
import AssignmentBulkActions from "./components/AssignmentBulkActions";
import AssignmentTableView from "./components/AssignmentTableView";
import AssignmentGridView from "./components/AssignmentGridView";
import AssignmentPagination from "./components/AssignmentPagination";
import { useAssignmentData } from "./hooks/useAssignmentData";
import { useAssignmentActions } from "./hooks/useAssignmentActions";
import ViewSingleAssignmentDialog from "../View/Dialogs/ViewSingleAssignmentDialog";
import AssignmentFormDialog from "../Dialogs/Form";
import AddAssignmentNoteDialog from "../Dialogs/AddAssignmentNoteDialog";
import UpdateLuWangCountDialog from "../Dialogs/UpdateLuWangCountDialog";
import type { Assignment } from "../../../apis/assignment";
import assignmentAPI from "../../../apis/assignment";
import { showApiError } from "../../../utils/notification";

const AssignmentTablePage: React.FC = () => {
  const navigate = useNavigate();

  const {
    assignments,
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
    workerFilter,
    setWorkerFilter,
    pitakFilter,
    setPitakFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    viewMode,
    setViewMode,
    selectedAssignments,
    setSelectedAssignments,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    fetchAssignments,
    handleRefresh,
    setCurrentPage,
    clearFilters,
  } = useAssignmentData();

  const {
    handleDeleteAssignment,
    handleUpdateStatus,
    handleCancelAssignment,
    handleBulkDelete,
    handleExportCSV,
  } = useAssignmentActions(
    assignments,
    fetchAssignments,
    selectedAssignments,

    {
      statusFilter,
      workerFilter,
      pitakFilter,
      dateFrom,
      dateTo,
    },
  );

  // Dialog states
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<
    number | null
  >(null);

  // Form dialog states
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [formDialogMode, setFormDialogMode] = useState<"add" | "edit">("add");
  const [formDialogAssignmentId, setFormDialogAssignmentId] = useState<
    number | null
  >(null);

  const [showAddNoteDialog, setShowAddNoteDialog] = useState(false);
  const [selectedAssignment, setSelectedAssignment] =
    useState<Assignment | null>(null);

  const [showUpdateDialog, setShowUpdateDialog] = useState(false);

  // View Dialog handlers
  const openViewDialog = (id: number) => {
    setSelectedAssignmentId(id);
    setIsViewDialogOpen(true);
  };

  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedAssignmentId(null);
  };

  // Form Dialog handlers
  const openFormDialog = (mode: "add" | "edit", id?: number) => {
    setFormDialogMode(mode);
    setFormDialogAssignmentId(id || null);
    setIsFormDialogOpen(true);
  };

  const closeFormDialog = () => {
    setIsFormDialogOpen(false);
    setFormDialogAssignmentId(null);
    setFormDialogMode("add");
  };

  const handleFormSuccess = () => {
    fetchAssignments(); // Refresh the data
    closeFormDialog();
  };

  const handleCreateAssignment = () => {
    openFormDialog("add");
  };

  const handleEditAssignment = (id: number) => {
    openFormDialog("edit", id);
  };

  // Delete handler with dialog integration
  const handleDeleteWithDialog = async (id: number) => {
    // If the dialog is open for this assignment, close it first
    if (selectedAssignmentId === id && isViewDialogOpen) {
      closeViewDialog();
    }
    if (formDialogAssignmentId === id && isFormDialogOpen) {
      closeFormDialog();
    }
    await handleDeleteAssignment(id);
  };

  // Update status handler with dialog integration
  const handleUpdateStatusWithDialog = async (
    id: number,
    currentStatus: string,
  ) => {
    // If the dialog is open for this assignment, close it first
    if (selectedAssignmentId === id && isViewDialogOpen) {
      closeViewDialog();
    }
    if (formDialogAssignmentId === id && isFormDialogOpen) {
      closeFormDialog();
    }
    await handleUpdateStatus(id, currentStatus);
  };

  // Cancel handler with dialog integration
  const handleCancelWithDialog = async (id: number) => {
    // If the dialog is open for this assignment, close it first
    if (selectedAssignmentId === id && isViewDialogOpen) {
      closeViewDialog();
    }
    if (formDialogAssignmentId === id && isFormDialogOpen) {
      closeFormDialog();
    }
    await handleCancelAssignment(id);
  };

  const toggleSelectAll = () => {
    if (selectedAssignments.length === assignments.length) {
      setSelectedAssignments([]);
    } else {
      setSelectedAssignments(assignments.map((a) => a.id));
    }
  };

  const toggleSelectAssignment = (id: number) => {
    setSelectedAssignments((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Loading skeleton similar to Kabisilya
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
                    "Date",
                    "Worker",
                    "Pitak",
                    "LuWang",
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
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-32"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-32"></div>
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

  // Error state - similar to Kabisilya
  if (error && !assignments.length && !loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="p-6 bg-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1
                className="text-2xl font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <FileText className="w-6 h-6" />
                Assignment Management
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
              Error Loading Assignment Data
            </p>
            <p className="text-sm mb-6 text-gray-600">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center mx-auto"
              style={{
                background: "var(--primary-color)",
                color: "var(--sidebar-text)",
              }}
            >
              Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleAddNote = async (id: number, name: string) => {
    try {
      const response = assignmentAPI.getAssignmentById(id);
      if (!response) return;
      setSelectedAssignment((await response).data);
      setShowAddNoteDialog(true);
    } catch (error: any) {
      showApiError(error, "Failed to fetch assignment details");
    }
  };

  const handleNoteSuccess = async () => {
    await fetchAssignments();
  };

  const handleUpdateSuccess = async () => {
    await fetchAssignments();
  };

  function handleReassignWorker(id: number): void {
    throw new Error("Function not implemented.");
  }

  const handleUpdateLuWang = async (id: number) => {
    try {
      const response = assignmentAPI.getAssignmentById(id);
      if (!response) return;
      setSelectedAssignment((await response).data);
      setShowUpdateDialog(true);
    } catch (error: any) {
      showApiError(error, "Failed to fetch assignment details");
    }
  };

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
                <FileText className="w-6 h-6" />
                Assignment Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage worker assignments, track luwang counts, and monitor
                assignment status
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleExportCSV}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" />
                Export
              </button>

              <button
                onClick={handleCreateAssignment}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center"
                style={{
                  background: "var(--primary-color)",
                  color: "var(--sidebar-text)",
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                New Assignment
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="h-full p-6">
            {/* Stats Cards */}
            <div className="mb-6">
              <AssignmentStats stats={stats} />
            </div>

            {/* Filters */}
            <div className="mb-6">
              <AssignmentFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleRefresh={handleRefresh}
                refreshing={refreshing}
                workerFilter={workerFilter}
                setWorkerFilter={setWorkerFilter}
                pitakFilter={pitakFilter}
                setPitakFilter={setPitakFilter}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                clearFilters={clearFilters}
                handleStatusFilterChange={handleStatusFilterChange}
              />
            </div>

            {/* Bulk Actions */}
            {selectedAssignments.length > 0 && (
              <div className="mb-6">
                <AssignmentBulkActions
                  selectedCount={selectedAssignments.length}
                  onBulkDelete={handleBulkDelete}
                  onClearSelection={() => setSelectedAssignments([])}
                />
              </div>
            )}

            {/* Loading State */}
            {loading && !refreshing && (
              <div className="mb-6">{renderLoadingSkeleton()}</div>
            )}

            {/* Table or Grid View */}
            {!loading && assignments.length === 0 ? (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 bg-white">
                <div className="text-center p-8">
                  <FileText
                    className="w-16 h-16 mx-auto mb-4 opacity-20"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">
                    No Assignments Found
                  </h3>
                  <p className="text-sm mb-6 max-w-md mx-auto text-gray-600">
                    {searchQuery
                      ? `No results found for "${searchQuery}". Try a different search term.`
                      : "No assignments have been created yet. Get started by creating your first assignment."}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={handleCreateAssignment}
                      className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md inline-flex items-center"
                      style={{
                        background: "var(--primary-color)",
                        color: "var(--sidebar-text)",
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Assignment
                    </button>
                  )}
                </div>
              </div>
            ) : !loading && assignments.length > 0 ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                  {viewMode === "table" ? (
                    <AssignmentTableView
                      assignments={assignments}
                      selectedAssignments={selectedAssignments}
                      toggleSelectAll={toggleSelectAll}
                      toggleSelectAssignment={toggleSelectAssignment}
                      onView={openViewDialog}
                      onEdit={handleEditAssignment}
                      onDelete={handleDeleteWithDialog}
                      onUpdateStatus={handleUpdateStatusWithDialog}
                      onCancel={handleCancelWithDialog}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                      onAddNote={handleAddNote}
                      onReassignWorker={handleReassignWorker}
                      onUpdateLuWang={handleUpdateLuWang}
                    />
                  ) : (
                    <div className="p-6">
                      <AssignmentGridView
                        assignments={assignments}
                        selectedAssignments={selectedAssignments}
                        toggleSelectAssignment={toggleSelectAssignment}
                        onView={openViewDialog}
                        onEdit={handleEditAssignment}
                        onUpdateStatus={handleUpdateStatusWithDialog}
                        onCancel={handleCancelWithDialog}
                        onDelete={handleDeleteWithDialog}
                      />
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <AssignmentPagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      totalItems={totalItems}
                      limit={20}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Assignment View Dialog */}
      {isViewDialogOpen && selectedAssignmentId && (
        <ViewSingleAssignmentDialog
          assignmentId={selectedAssignmentId}
          onClose={closeViewDialog}
          onEdit={() => {
            closeViewDialog();
            handleEditAssignment(selectedAssignmentId);
          }}
          onDelete={() => handleDeleteWithDialog(selectedAssignmentId)}
        />
      )}

      {/* Assignment Form Dialog */}
      {isFormDialogOpen && (
        <AssignmentFormDialog
          id={formDialogAssignmentId || undefined}
          mode={formDialogMode}
          onClose={closeFormDialog}
          onSuccess={handleFormSuccess}
        />
      )}

      {showAddNoteDialog && selectedAssignment && (
        <AddAssignmentNoteDialog
          assignmentId={selectedAssignment.id}
          assignmentName={selectedAssignment.name}
          onClose={() => setShowAddNoteDialog(false)}
          onSuccess={handleNoteSuccess}
          initialNoteType="general"
        />
      )}

      {showUpdateDialog && selectedAssignment && (
        <UpdateLuWangCountDialog
          assignmentId={selectedAssignment?.id}
          assignmentName={`Assignment #${selectedAssignment.id}`}
          currentLuWang={selectedAssignment.luwangCount}
          workerName={selectedAssignment.worker?.name}
          pitakName={selectedAssignment.pitak?.name}
          assignmentDate={selectedAssignment.assignmentDate}
          onClose={() => setShowUpdateDialog(false)}
          onSuccess={handleUpdateSuccess}
        />
      )}
    </>
  );
};

export default AssignmentTablePage;
