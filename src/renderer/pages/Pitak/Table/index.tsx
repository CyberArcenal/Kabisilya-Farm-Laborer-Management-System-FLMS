import React from 'react';
import {
  MapPin, Plus, Download, AlertCircle, RefreshCw
} from 'lucide-react';
import PitakStats from './components/PitakStats';
import PitakFilters from './components/PitakFilters';
import PitakBulkActions from './components/PitakBulkActions';
import PitakTableView from './components/PitakTableView';
import PitakGridView from './components/PitakGridView';
import PitakPagination from './components/PitakPagination';
import AssignmentDialog from './dialogs/AssignmentDialog';
import BulkAssignDialog from './dialogs/BulkAssignDialog';
import LuWangUpdateDialog from './dialogs/LuWangUpdateDialog';
import ExportDialog from './dialogs/ExportDialog';
// Import new dialogs
import { usePitakData } from './hooks/usePitakData';
import { usePitakActions } from './hooks/usePitakActions';
import ViewMultipleAssignmentsDialog from '../../Assignment/View/Dialogs/ViewMultipleAssignmentsDialog';
import AssignmentHistoryDialog from '../../Assignment/View/Dialogs/CreateAssignmentHistoryDialog';
import ViewSingleAssignmentDialog from '../../Assignment/View/Dialogs/ViewSingleAssignmentDialog';
import PitakFormDialog from '../Dialogs/Form';
import PitakViewDialog from '../Dialogs/View';
import ViewAssignedWorkersDialog from '../../Assignment/View/Dialogs/ViewAssignedWorkersDialog';

const PitakTablePage: React.FC = () => {
  const {
    pitaks,
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
    selectedPitaks,
    setSelectedPitaks,
    fetchPitaks,
    handleRefresh,
    setCurrentPage
  } = usePitakData();

  const {
    showAssignmentDialog,
    setShowAssignmentDialog,
    showBulkAssignDialog,
    setShowBulkAssignDialog,
    showLuWangUpdateDialog,
    setShowLuWangUpdateDialog,
    showExportDialog,
    setShowExportDialog,
    // New dialog states
    showSingleAssignmentDialog,
    setShowSingleAssignmentDialog,
    showMultipleAssignmentsDialog,
    setShowMultipleAssignmentsDialog,
    showAssignmentHistoryDialog,
    setShowAssignmentHistoryDialog,
    // View Dialog states
    showViewDialog,
    setShowViewDialog,
    selectedViewPitakId,
    setSelectedViewPitakId,
    selectedAssignmentId,
    selectedPitakId,
    assignmentData,
    setAssignmentData,
    bulkOperationData,
    setBulkOperationData,
    luwangUpdateData,
    setLuWangUpdateData,
    handleCreatePitak,
    handleViewPitak,
    handleEditPitak,
    handleDeletePitak,
    handleAssignWorker,
    handleSubmitAssignment,
    handleUpdateLuWang,
    handleSubmitLuWangUpdate,
    handleBulkAssign,
    handleSubmitBulkAssign,
    handleBulkStatusChange,
    handleBulkDelete,
    handleExport,
    handleViewReport,
    handleViewAssignedWorkers,
    handleMarkAsHarvested,
    handleUpdatePitakStatus,
    // New functions
    handleViewAssignmentDialog,
    handleViewPitakAssignmentsDialog,


    isFormDialogOpen,
    openCreateDialog,
    openEditDialog,
    closeFormDialog,
    selectPitakId,
    dialogMode,
    setIsFormDialogOpen,
    setSelectPitakId,
    setDialogMode,


    showAssignedWorkersDialog,
    setShowAssignedWorkersDialog,
    selectedPitakForWorkers,
    setSelectedPitakForWorkers,
  } = usePitakActions(pitaks, fetchPitaks);

  // Loading skeleton similar to Kabisilya and Assignment
  const renderLoadingSkeleton = () => {
    if (viewMode === 'table') {
      return (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ background: 'var(--table-header-bg)' }}>
                  <th className="p-4 text-left">
                    <div className="w-4 h-4 bg-gray-200 rounded animate-pulse"></div>
                  </th>
                  {['Location', 'Code', 'Total LuWang', 'Assigned LuWang', 'Available LuWang', 'Status', 'Actions'].map((header) => (
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
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-20"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-4 bg-gray-100 rounded animate-pulse w-24"></div>
                    </td>
                    <td className="p-4">
                      <div className="h-6 bg-gray-100 rounded-full animate-pulse w-16"></div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {[...Array(6)].map((_, i) => (
                          <div key={i} className="w-6 h-6 bg-gray-100 rounded animate-pulse"></div>
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
  if (error && !pitaks.length && !loading) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <div className="p-6 bg-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                <MapPin className="w-6 h-6" /> Pitak Management
              </h1>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center p-8 bg-white rounded-xl border border-gray-200 max-w-md">
            <AlertCircle className="w-16 h-16 mx-auto mb-4 text-red-500" />
            <p className="text-base font-semibold mb-2 text-gray-900">Error Loading Pitak Data</p>
            <p className="text-sm mb-6 text-gray-600">{error}</p>
            <button
              onClick={handleRefresh}
              className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center mx-auto bg-blue-600 text-white hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" /> Retry Loading
            </button>
          </div>
        </div>
      </div>
    );
  }

  const toggleSelectAll = () => {
    setSelectedPitaks(selectedPitaks.length === pitaks.length ? [] : pitaks.map(p => p.id));
  };

  const toggleSelectPitak = (id: number) => {
    setSelectedPitaks(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleAssignWorkerWithData = (pitakId: number) => {
    const pitak = pitaks.find(p => p.id === pitakId);
    if (!pitak) return;
    handleAssignWorker(pitakId, pitak);
  };

  const handleUpdateLuWangWithData = (pitakId: number) => {
    const pitak = pitaks.find(p => p.id === pitakId);
    if (!pitak) return;
    handleUpdateLuWang(pitakId, pitak.totalLuwang);
  };

  const handleDeletePitakWithData = (id: number) => {
    const pitak = pitaks.find(p => p.id === id);
    handleDeletePitak(id, pitak?.location as string);
  };

  const handleMarkAsHarvestedWithData = (id: number) => {
    const pitak = pitaks.find(p => p.id === id);
    handleMarkAsHarvested(id, pitak?.location as string);
  };

  const handleUpdatePitakStatusWithData = (id: number, currentStatus: string) => {
    const pitak = pitaks.find(p => p.id === id);
    handleUpdatePitakStatus(id, currentStatus, pitak?.location as string);
  };

  const handleBulkAssignWithData = () => {
    if (selectedPitaks.length === 0) return;
    handleBulkAssign(selectedPitaks);
  };

  const handleBulkDeleteWithData = () => {
    if (selectedPitaks.length === 0) return;
    handleBulkDelete(selectedPitaks);
  };

  const handleBulkActivateWithData = () => {
    if (selectedPitaks.length === 0) return;
    handleBulkStatusChange('active', selectedPitaks);
  };

  const handleBulkDeactivateWithData = () => {
    if (selectedPitaks.length === 0) return;
    handleBulkStatusChange('inactive', selectedPitaks);
  };

  return (
    <>
      <div className="flex flex-col h-screen bg-gray-50">
        {/* Header */}
        <div className="p-6 bg-white border-b border-gray-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900">
                <MapPin className="w-6 h-6" /> Pitak Management
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage planting areas, track luwang capacity, and monitor utilization
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowExportDialog(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              >
                <Download className="w-4 h-4 mr-2" /> Export
              </button>
              <button
                onClick={openCreateDialog}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center bg-blue-600 text-white hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" /> New Pitak
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1">
          <div className="h-full p-6">
            {/* Stats */}
            <div className="mb-6">
              <PitakStats stats={stats} />
            </div>

            {/* Filters */}
            <div className="mb-6">
              <PitakFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                statusFilter={statusFilter}
                setStatusFilter={setStatusFilter}
                viewMode={viewMode}
                setViewMode={setViewMode}
                handleRefresh={handleRefresh}
                refreshing={refreshing}
              />
            </div>

            {/* Bulk Actions */}
            {selectedPitaks.length > 0 && (
              <div className="mb-6">
                <PitakBulkActions
                  selectedCount={selectedPitaks.length}
                  onBulkAssign={handleBulkAssignWithData}
                  onBulkActivate={handleBulkActivateWithData}
                  onBulkDeactivate={handleBulkDeactivateWithData}
                  onBulkDelete={handleBulkDeleteWithData}
                  onClearSelection={() => setSelectedPitaks([])}
                />
              </div>
            )}

            {/* Loading State */}
            {loading && !refreshing && (
              <div className="mb-6">
                {renderLoadingSkeleton()}
              </div>
            )}

            {/* Main Content */}
            {!loading && pitaks.length === 0 ? (
              <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 bg-white">
                <div className="text-center p-8">
                  <MapPin className="w-16 h-16 mx-auto mb-4 opacity-20 text-gray-400" />
                  <h3 className="text-lg font-semibold mb-2 text-gray-900">No Pitak Found</h3>
                  <p className="text-sm mb-6 max-w-md mx-auto text-gray-600">
                    {searchQuery ? `No results found for "${searchQuery}". Try a different search term.` : 'No pitak have been created yet. Get started by creating your first pitak.'}
                  </p>
                  {!searchQuery && (
                    <button
                      onClick={openCreateDialog}
                      className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md inline-flex items-center bg-blue-600 text-white hover:bg-blue-700"
                    >
                      <Plus className="w-4 h-4 mr-2" /> Create First Pitak
                    </button>
                  )}
                </div>
              </div>
            ) : !loading && pitaks.length > 0 ? (
              <>
                {viewMode === 'table' ? (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                    <PitakTableView
                      pitaks={pitaks}
                      selectedPitaks={selectedPitaks}
                      toggleSelectAll={toggleSelectAll}
                      toggleSelectPitak={toggleSelectPitak}
                      onView={handleViewPitak} // This now opens the view dialog
                      onEdit={handleEditPitak}
                      onAssign={handleAssignWorkerWithData}
                      onDelete={handleDeletePitakWithData}
                      onUpdateLuWang={handleUpdateLuWangWithData}
                      onViewAssignedWorkers={handleViewAssignedWorkers}
                      onViewReport={handleViewReport}
                      onMarkAsHarvested={handleMarkAsHarvestedWithData}
                      onUpdateStatus={handleUpdatePitakStatusWithData}
                      // Pass new props
                      onViewAssignment={handleViewAssignmentDialog}
                      onViewPitakAssignments={handleViewPitakAssignmentsDialog}
                    />
                  </div>
                ) : (
                  <div className="mb-6">
                    <PitakGridView
                      pitaks={pitaks}
                      selectedPitaks={selectedPitaks}
                      toggleSelectPitak={toggleSelectPitak}
                      onView={handleViewPitak} // This now opens the view dialog
                      onEdit={handleEditPitak}
                      onAssign={handleAssignWorkerWithData}
                    />
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <PitakPagination
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

        {/* Existing Dialogs */}
        {showAssignmentDialog && (
          <AssignmentDialog
            data={assignmentData}
            onChange={setAssignmentData}
            onSubmit={handleSubmitAssignment}
            onClose={() => setShowAssignmentDialog(false)}
          />
        )}

        {showBulkAssignDialog && (
          <BulkAssignDialog
            selectedCount={selectedPitaks.length}
            data={bulkOperationData}
            onChange={setBulkOperationData}
            onSubmit={() => handleSubmitBulkAssign(selectedPitaks, bulkOperationData)}
            onClose={() => setShowBulkAssignDialog(false)}
          />
        )}

        {showLuWangUpdateDialog && (
          <LuWangUpdateDialog
            data={luwangUpdateData}
            onChange={setLuWangUpdateData}
            onSubmit={handleSubmitLuWangUpdate}
            onClose={() => setShowLuWangUpdateDialog(false)}
          />
        )}

        {showExportDialog && (
          <ExportDialog
            onExport={handleExport}
            onClose={() => setShowExportDialog(false)}
          />
        )}

        {/* Pitak View Dialog */}
        {showViewDialog && selectedViewPitakId && (
          <PitakViewDialog
            id={selectedViewPitakId}
            onClose={() => setShowViewDialog(false)}
            onEdit={(id) => {
              setShowViewDialog(false);
              openEditDialog(id);
            }}
          />
        )}

        {/* New Assignment Viewing Dialogs */}
        {showSingleAssignmentDialog && (
          <ViewSingleAssignmentDialog
            assignmentId={selectedAssignmentId}
            onClose={() => setShowSingleAssignmentDialog(false)}
            onEdit={() => {
              setShowSingleAssignmentDialog(false);
              // Handle edit functionality
              // navigate(`/assignments/edit/${selectedAssignmentId}`);
            }}
            onDelete={() => {
              setShowSingleAssignmentDialog(false);
              // Handle delete functionality
              // showConfirm dialog for deletion
            }}
            onViewHistory={() => {
              setShowSingleAssignmentDialog(false);
              setShowAssignmentHistoryDialog(true);
            }}
          />
        )}

        {showMultipleAssignmentsDialog && (
          <ViewMultipleAssignmentsDialog
            pitakId={selectedPitakId}
            onClose={() => setShowMultipleAssignmentsDialog(false)}
            onViewAssignment={(id) => {
              setShowMultipleAssignmentsDialog(false);
              handleViewAssignmentDialog(id);
            }}
          />
        )}

        {showAssignmentHistoryDialog && (
          <AssignmentHistoryDialog
            assignmentId={selectedAssignmentId}
            onClose={() => setShowAssignmentHistoryDialog(false)}
          />
        )}

        {/* Pitak Form Dialog */}
        {isFormDialogOpen && (
          <PitakFormDialog
            id={selectPitakId || undefined}
            mode={dialogMode}
            onClose={closeFormDialog}
            onSuccess={() => {
              // Refresh data
              fetchPitaks();
              closeFormDialog();
            }}
          />
        )}

        {showAssignedWorkersDialog && selectedPitakForWorkers && (
          <ViewAssignedWorkersDialog
            pitakId={selectedPitakForWorkers.id}
            pitakLocation={selectedPitakForWorkers.location}
            onClose={() => setShowAssignedWorkersDialog(false)}
            onViewAssignment={handleViewAssignmentDialog}
          />
        )}
      </div>
    </>
  );
};

export default PitakTablePage;