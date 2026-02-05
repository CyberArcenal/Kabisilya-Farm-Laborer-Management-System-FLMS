// components/User/UserTablePage.tsx
import React, { useState } from "react";
import {
  Users,
  UserPlus,
  Download,
  ChevronUp,
  ChevronDown,
  BarChart2,
} from "lucide-react";
import { useUserData } from "./hooks/useUserData";
import { showError, showSuccess, showToast } from "../../../utils/notification";
import userAPI from "../../../apis/user";
import { useUserActions } from "./hooks/useUserActions";
import UserFilters from "./components/UserFilters";
import UserStats from "./components/UserStats";
import UserBulkActions from "./components/UserBulkActions";
import UserTableView from "./components/UserTableView";
import UserGridView from "./components/UserGridView";
import UserPagination from "./components/UserPagination";
import UserFormDialog from "./Dialogs/UserFormDialog";
import UserViewDialog from "./Dialogs/UserViewDialog";

const UserTablePage: React.FC = () => {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const {
    users,
    stats,
    loading,
    refreshing,
    error,
    currentPage,
    totalPages,
    totalItems,
    searchQuery,
    setSearchQuery,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    viewMode,
    setViewMode,
    selectedUsers,
    setSelectedUsers,
    fetchUsers,
    handleRefresh,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
  } = useUserData();

  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [dialogMode, setDialogMode] = useState<"add" | "edit">("add");
  const [showStats, setShowStats] = useState(false);
  const {
    handleDeleteUser,
    handleBulkDelete,
    handleUpdateStatus,
    handleUpdateRole,
    handleResetPassword,
  } = useUserActions(users, fetchUsers, selectedUsers);

  // Dialog handlers
  const openCreateDialog = () => {
    setDialogMode("add");
    setSelectedUserId(null);
    setIsFormDialogOpen(true);
  };

  const openEditDialog = (id: number) => {
    setDialogMode("edit");
    setSelectedUserId(id);
    setIsFormDialogOpen(true);
  };

  const openViewDialog = (id: number) => {
    setSelectedUserId(id);
    setIsViewDialogOpen(true);
  };

  const closeFormDialog = () => {
    setIsFormDialogOpen(false);
    setSelectedUserId(null);
  };

  const closeViewDialog = () => {
    setIsViewDialogOpen(false);
    setSelectedUserId(null);
  };

  const handleFormSuccess = async () => {
    await fetchUsers();
    closeFormDialog();
  };

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map((u) => u.id));
    }
  };

  const toggleSelectUser = (id: number) => {
    setSelectedUsers((prev) =>
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

  const handleRoleFilterChange = (role: string) => {
    setRoleFilter(role);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setRoleFilter("all");
    setStatusFilter("all");
    setDateFrom("");
    setDateTo("");
    setSearchQuery("");
    setCurrentPage(1);
  };

  // In UserTablePage.tsx, add this function
  const handleExportCSV = async () => {
    try {
      showToast("Exporting to CSV...", "info");

      const response = await userAPI.exportUsersToCSV(
        statusFilter === "inactive",
        roleFilter !== "all" ? [roleFilter] : [],
        dateFrom || undefined,
        dateTo || undefined,
      );

      if (response.status) {
        // Create download link
        const link = document.createElement("a");
        const blob = new Blob([response.data.csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.download = response.data.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showSuccess(`Exported ${response.data.count} records to CSV`);
      } else {
        throw new Error(response.message);
      }
    } catch (err: any) {
      showError(err.message || "Failed to export CSV");
    }
  };

  // Loading skeleton
  const renderLoadingSkeleton = () => {
    // Similar to Kabisilya loading skeleton
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
                  "Created",
                  "Username",
                  "Name & Email",
                  "Role",
                  "Status",
                  "Last Login",
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
                  {[...Array(7)].map((_, i) => (
                    <td key={i} className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-32"></div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  // Error state
  if (error && !users.length && !loading) {
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
                User Management
              </h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 max-w-md">
            <div
              className="w-16 h-16 mx-auto mb-4"
              style={{ color: "var(--danger-color)" }}
            >
              ⚠️
            </div>
            <p
              className="text-base font-semibold mb-2"
              style={{ color: "var(--danger-color)" }}
            >
              Error Loading User Data
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
                User Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage system users, roles, permissions, and access control
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
                <UserPlus className="w-4 h-4 mr-2" />
                New User
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="h-full">
            {/* Stats Cards */}
            {showStats && (
              <div className="mb-6">
                <UserStats stats={stats} />
              </div>
            )}

            {/* Filters */}
            <div className="mb-6">
              <UserFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                roleFilter={roleFilter}
                setRoleFilter={handleRoleFilterChange}
                statusFilter={statusFilter}
                setStatusFilter={handleStatusFilterChange}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleRefresh={handleRefresh}
                refreshing={refreshing}
                clearFilters={clearFilters}
                showAdvancedFilters={showAdvancedFilters}
                setShowAdvancedFilters={setShowAdvancedFilters}
              />
            </div>

            {/* Bulk Actions */}
            {selectedUsers.length > 0 && (
              <div className="mb-6">
                <UserBulkActions
                  selectedCount={selectedUsers.length}
                  onBulkDelete={handleBulkDelete}
                  onClearSelection={() => setSelectedUsers([])}
                />
              </div>
            )}

            {/* Loading State */}
            {loading && !refreshing && (
              <div className="mb-6">{renderLoadingSkeleton()}</div>
            )}

            {/* Table or Grid View */}
            {!loading && users.length === 0 ? (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 bg-white">
                <div className="text-center p-8">
                  <Users
                    className="w-16 h-16 mx-auto mb-4 opacity-20"
                    style={{ color: "var(--text-secondary)" }}
                  />
                  <h3 className="text-lg font-semibold mb-2 text-gray-800">
                    No Users Found
                  </h3>
                  <p className="text-sm mb-6 max-w-md mx-auto text-gray-600">
                    {searchQuery
                      ? `No results found for "${searchQuery}". Try a different search term.`
                      : "No users have been created yet. Get started by creating your first user."}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={openCreateDialog}
                      className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md inline-flex items-center bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create First User
                    </button>
                  )}
                </div>
              </div>
            ) : !loading && users.length > 0 ? (
              <>
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                  {viewMode === "table" ? (
                    <UserTableView
                      users={users}
                      selectedUsers={selectedUsers}
                      toggleSelectAll={toggleSelectAll}
                      toggleSelectUser={toggleSelectUser}
                      onView={openViewDialog}
                      onEdit={openEditDialog}
                      onDelete={handleDeleteUser}
                      onUpdateStatus={handleUpdateStatus}
                      onUpdateRole={handleUpdateRole}
                      onResetPassword={handleResetPassword}
                      sortBy={sortBy}
                      sortOrder={sortOrder}
                      onSort={handleSort}
                    />
                  ) : (
                    <div className="p-6">
                      <UserGridView
                        users={users}
                        selectedUsers={selectedUsers}
                        toggleSelectUser={toggleSelectUser}
                        onView={openViewDialog}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteUser}
                        onUpdateStatus={handleUpdateStatus}
                      />
                    </div>
                  )}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <UserPagination
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

      {/* User Form Dialog */}
      {isFormDialogOpen && (
        <UserFormDialog
          id={selectedUserId || undefined}
          mode={dialogMode}
          onClose={closeFormDialog}
          onSuccess={handleFormSuccess}
        />
      )}

      {/* User View Dialog */}
      {isViewDialogOpen && selectedUserId && (
        <UserViewDialog
          userId={selectedUserId}
          onClose={closeViewDialog}
          onEdit={openEditDialog}
        />
      )}
    </>
  );
};

export default UserTablePage;
