// components/Bukid/BukidTablePage.tsx (corrected version)
import React, { useState } from 'react';
import { Home, Plus, Download, AlertCircle, RefreshCw } from 'lucide-react';
import BukidStats from './components/BukidStats';
import BukidFilters from './components/BukidFilters';
import BukidBulkActions from './components/BukidBulkActions';
import BukidTableView from './components/BukidTableView';
import BukidGridView from './components/BukidGridView';
import BukidPagination from './components/BukidPagination';
import { useBukidData } from './hooks/useBukidData';
import { useBukidActions } from './hooks/useBukidActions';
import BukidFormDialog from '../Dialogs/Form';
import BukidViewDialog from '../Dialogs/View';
import AddNoteDialog from '../Dialogs/AddNoteDialog';
import ViewStatsDialog from '../Dialogs/ViewStatsDialog';
import PlaceholderDialog from '../Dialogs/PlaceholderDialog';
import { dialogs } from '../../../utils/dialogs';

const BukidTablePage: React.FC = () => {
    const {
        bukids,
        summary,
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
        selectedBukids,
        setSelectedBukids,
        fetchBukids,
        handleRefresh,
        setCurrentPage,
        sortBy,
        setSortBy,
        sortOrder,
        setSortOrder
    } = useBukidData();

    const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
    const [isAddNoteDialogOpen, setIsAddNoteDialogOpen] = useState(false);
    const [isViewStatsDialogOpen, setIsViewStatsDialogOpen] = useState(false);
    const [isBulkUpdateDialogOpen, setIsBulkUpdateDialogOpen] = useState(false);
    const [isBulkCreateDialogOpen, setIsBulkCreateDialogOpen] = useState(false);
    const [isImportCSVDialogOpen, setIsImportCSVDialogOpen] = useState(false);

    const [selectedBukidId, setSelectedBukidId] = useState<number | null>(null);
    const [selectedBukidName, setSelectedBukidName] = useState<string>('');
    const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');

    const {
        handleDeleteBukid,
        handleUpdateStatus,
        handleBulkDelete,
        handleExportCSV,
        handleAddNote,
        handleViewStats,
        handleBulkUpdate,
        handleBulkCreate,
        handleImportCSV,
        handleExportSingleCSV, // Renamed to avoid conflict
    } = useBukidActions(
        bukids,
        fetchBukids,
        selectedBukids,
        statusFilter,
    );

    // Dialog handlers
    const openCreateDialog = () => {
        setDialogMode('add');
        setSelectedBukidId(null);
        setIsFormDialogOpen(true);
    };

    const openEditDialog = (id: number) => {
        setDialogMode('edit');
        setSelectedBukidId(id);
        setIsFormDialogOpen(true);
    };

    const openViewDialog = (id: number) => {
        setSelectedBukidId(id);
        setIsViewDialogOpen(true);
    };

    const openAddNoteDialog = (id: number) => {
        const bukid = bukids.find(b => b.id === id);
        setSelectedBukidId(id);
        setSelectedBukidName(bukid?.name || '');
        setIsAddNoteDialogOpen(true);
    };

    const openViewStatsDialog = (id: number) => {
        setSelectedBukidId(id);
        setIsViewStatsDialogOpen(true);
    };

    const openBulkUpdateDialog = (id: number) => {
        setSelectedBukidId(id);
        setIsBulkUpdateDialogOpen(true);
    };

    const openBulkCreateDialog = (id: number) => {
        setSelectedBukidId(id);
        setIsBulkCreateDialogOpen(true);
    };

    const openImportCSVDialog = (id: number) => {
        setSelectedBukidId(id);
        setIsImportCSVDialogOpen(true);
    };

    // Removed openExportSingleDialog since it's handled directly by handleExportSingleCSV

    const closeFormDialog = async () => {
        setIsFormDialogOpen(false);
        setSelectedBukidId(null);
    };

    const closeViewDialog = async () => {
        setIsViewDialogOpen(false);
        setSelectedBukidId(null);
    };

    const closeAddNoteDialog = () => {
        setIsAddNoteDialogOpen(false);
        setSelectedBukidId(null);
        setSelectedBukidName('');
    };

    const closeViewStatsDialog = () => {
        setIsViewStatsDialogOpen(false);
        setSelectedBukidId(null);
    };

    const closeBulkUpdateDialog = () => {
        setIsBulkUpdateDialogOpen(false);
        setSelectedBukidId(null);
    };

    const closeBulkCreateDialog = () => {
        setIsBulkCreateDialogOpen(false);
        setSelectedBukidId(null);
    };

    const closeImportCSVDialog = () => {
        setIsImportCSVDialogOpen(false);
        setSelectedBukidId(null);
    };

    const handleFormSuccess = async (bukid: any) => {
        await fetchBukids();
        closeFormDialog();
    };

    const handleAddNoteSuccess = async () => {
        await fetchBukids();
        closeAddNoteDialog();
    };

    // Selection handlers
    const toggleSelectAll = () => {
        if (selectedBukids.length === bukids.length) {
            setSelectedBukids([]);
        } else {
            setSelectedBukids(bukids.map(b => b.id!));
        }
    };

    const toggleSelectBukid = (id: number) => {
        setSelectedBukids(prev =>
            prev.includes(id)
                ? prev.filter(item => item !== id)
                : [...prev, id]
        );
    };

    const handleSort = (field: string) => {
        if (sortBy === field) {
            setSortOrder(sortOrder === 'ASC' ? 'DESC' : 'ASC');
        } else {
            setSortBy(field);
            setSortOrder('ASC');
        }
        setCurrentPage(1);
    };

    const handleStatusFilterChange = (status: string) => {
        setStatusFilter(status);
        setCurrentPage(1);
    };

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
                                    {['Name', 'Location', 'Kabisilya', 'Area (ha)', 'Status', 'Actions'].map((header) => (
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
                                            <div className="h-4 bg-gray-100 rounded animate-pulse w-40"></div>
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
                                                {[...Array(5)].map((_, i) => (
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

    // Error state - similar to Kabisilya and Assignment
    if (error && !bukids.length && !loading) {
        return (
            <div className="flex flex-col h-screen bg-gray-50">
                <div className="p-6 bg-white">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Home className="w-6 h-6" />
                                Bukid Management
                            </h1>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center p-6">
                    <div className="text-center p-8 bg-white rounded-xl border border-gray-200 max-w-md">
                        <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--danger-color)' }} />
                        <p className="text-base font-semibold mb-2" style={{ color: 'var(--danger-color)' }}>
                            Error Loading Bukid Data
                        </p>
                        <p className="text-sm mb-6 text-gray-600">{error}</p>
                        <button
                            onClick={handleRefresh}
                            className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center mx-auto"
                            style={{
                                background: 'var(--primary-color)',
                                color: 'var(--sidebar-text)'
                            }}
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
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
                            <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Home className="w-6 h-6" />
                                Bukid Management
                            </h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Manage farm lands, track assignments, and monitor productivity
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
                                onClick={openCreateDialog}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex items-center"
                                style={{
                                    background: 'var(--primary-color)',
                                    color: 'var(--sidebar-text)'
                                }}
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                New Bukid
                            </button>
                        </div>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden">
                    <div className="h-full overflow-y-auto p-6">
                        {/* Stats Cards */}
                        <div className="mb-6">
                            <BukidStats stats={stats} summary={summary} />
                        </div>

                        {/* Filters */}
                        <div className="mb-6">
                            <BukidFilters
                                searchQuery={searchQuery}
                                setSearchQuery={setSearchQuery}
                                statusFilter={statusFilter}
                                setStatusFilter={setStatusFilter}
                                viewMode={viewMode}
                                setViewMode={setViewMode}
                                handleRefresh={handleRefresh}
                                refreshing={refreshing}
                                handleStatusFilterChange={handleStatusFilterChange}
                            />
                        </div>

                        {/* Bulk Actions */}
                        {selectedBukids.length > 0 && (
                            <div className="mb-6">
                                <BukidBulkActions
                                    selectedCount={selectedBukids.length}
                                    onBulkDelete={handleBulkDelete}
                                    onClearSelection={() => setSelectedBukids([])}
                                />
                            </div>
                        )}

                        {/* Loading State */}
                        {loading && !refreshing && (
                            <div className="mb-6">
                                {renderLoadingSkeleton()}
                            </div>
                        )}

                        {/* Table or Grid View */}
                        {!loading && bukids.length === 0 ? (
                            <div className="flex items-center justify-center h-64 rounded-xl border-2 border-dashed border-gray-300 bg-white">
                                <div className="text-center p-8">
                                    <Home className="w-16 h-16 mx-auto mb-4 opacity-20 text-gray-400" />
                                    <h3 className="text-lg font-semibold mb-2 text-gray-800">
                                        No Bukid Found
                                    </h3>
                                    <p className="text-sm mb-6 max-w-md mx-auto text-gray-600">
                                        {searchQuery
                                            ? `No results found for "${searchQuery}". Try a different search term.`
                                            : 'No bukid have been created yet. Get started by creating your first bukid.'}
                                    </p>
                                    {!searchQuery && (
                                        <button
                                            onClick={openCreateDialog}
                                            className="px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md inline-flex items-center"
                                            style={{
                                                background: 'var(--primary-color)',
                                                color: 'var(--sidebar-text)'
                                            }}
                                        >
                                            <Plus className="w-4 h-4 mr-2" />
                                            Create First Bukid
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : !loading && bukids.length > 0 ? (
                            <>
                                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-6">
                                    {viewMode === 'table' ? (
                                        <BukidTableView
                                            bukids={bukids}
                                            summary={summary}
                                            selectedBukids={selectedBukids}
                                            toggleSelectAll={toggleSelectAll}
                                            toggleSelectBukid={toggleSelectBukid}
                                            onView={openViewDialog}
                                            onEdit={openEditDialog}
                                            onDelete={handleDeleteBukid}
                                            onUpdateStatus={handleUpdateStatus}
                                            onAddNote={openAddNoteDialog}
                                            onViewStats={openViewStatsDialog}
                                            onImportCSV={openImportCSVDialog}
                                            onExportCSV={handleExportSingleCSV}
                                            sortBy={sortBy}
                                            sortOrder={sortOrder}
                                            onSort={handleSort}
                                        />
                                    ) : (
                                        <div className="p-6">
                                            <BukidGridView
                                                bukids={bukids}
                                                summary={summary}
                                                selectedBukids={selectedBukids}
                                                toggleSelectBukid={toggleSelectBukid}
                                                onView={openViewDialog}
                                                onEdit={openEditDialog}
                                                onUpdateStatus={handleUpdateStatus}
                                                onDelete={handleDeleteBukid}
                                            />
                                        </div>
                                    )}
                                </div>

                                {/* Pagination */}
                                {totalPages > 1 && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-4">
                                        <BukidPagination
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

            {/* Existing Dialogs */}
            {isFormDialogOpen && (
                <BukidFormDialog
                    id={selectedBukidId || undefined}
                    mode={dialogMode}
                    onClose={async () => { if (!await dialogs.confirm({ title: 'Close Bukid View', message: 'Are you sure you want to close the bukid view?' })) return; closeFormDialog(); }}
                    onSuccess={handleFormSuccess}
                />
            )}

            {isViewDialogOpen && selectedBukidId && (
                <BukidViewDialog
                    id={selectedBukidId}
                    onClose={closeViewDialog}
                    onEdit={openEditDialog}
                />
            )}

            {/* New Dialogs */}
            {isAddNoteDialogOpen && selectedBukidId && selectedBukidName && (
                <AddNoteDialog
                    id={selectedBukidId}
                    bukidName={selectedBukidName}
                    onClose={closeAddNoteDialog}
                    onSuccess={handleAddNoteSuccess}
                />
            )}

            {isViewStatsDialogOpen && selectedBukidId && (
                <ViewStatsDialog
                    id={selectedBukidId}
                    onClose={closeViewStatsDialog}
                    onEdit={openEditDialog}
                />
            )}

            {isBulkUpdateDialogOpen && selectedBukidId && (
                <PlaceholderDialog
                    title="Bulk Update"
                    message="The bulk update feature allows you to update multiple records at once with predefined templates."
                    featureName="Bulk Update"
                    onClose={closeBulkUpdateDialog}
                />
            )}

            {isBulkCreateDialogOpen && selectedBukidId && (
                <PlaceholderDialog
                    title="Bulk Create"
                    message="Create multiple records simultaneously using CSV upload or template-based entry."
                    featureName="Bulk Create"
                    onClose={closeBulkCreateDialog}
                />
            )}

            {isImportCSVDialogOpen && selectedBukidId && (
                <PlaceholderDialog
                    title="Import CSV"
                    message="Import data from CSV files with automatic validation and error handling."
                    featureName="CSV Import"
                    onClose={closeImportCSVDialog}
                />
            )}
        </>
    );
};

export default BukidTablePage;