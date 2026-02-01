// components/Assignment/hooks/useAssignmentActions.ts
import assignmentAPI from '../../../../apis/assignment';
import type { Assignment, AssignmentFilters } from '../../../../apis/assignment';
import { showError, showSuccess, showToast } from '../../../../utils/notification';
import { dialogs, showConfirm } from '../../../../utils/dialogs';

export const useAssignmentActions = (
    assignments: Assignment[],
    refreshData: () => Promise<void>,
    selectedAssignments: number[],
    filters: {
        statusFilter: string;
        workerFilter: number | null;
        pitakFilter: number | null;
        dateFrom: string;
        dateTo: string;
    }
) => {
    const handleDeleteAssignment = async (id: number) => {
        const assignment = assignments.find(a => a.id === id);
        const confirmed = await showConfirm({
            title: 'Delete Assignment',
            message: `Are you sure you want to delete this assignment?`,
            icon: 'danger',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            showToast('Deleting assignment...', 'info');
            const response = await assignmentAPI.deleteAssignment(id);

            if (response.status) {
                showSuccess('Assignment deleted successfully');
                await refreshData();
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to delete assignment');
        }
    };

    const handleUpdateStatus = async (id: number, currentStatus: string) => {
        const newStatus = currentStatus;
        const action = newStatus === 'active' ? 'activate' : 'complete';

        const confirmed = await showConfirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Assignment`,
            message: `Are you sure you want to ${action} this assignment?`,
            icon: 'warning',
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            showToast(`${action.charAt(0).toUpperCase() + action.slice(1)}ing assignment...`, 'info');
            const response = await assignmentAPI.updateAssignmentStatus(id, newStatus as any);

            if (response.status) {
                showSuccess(`Assignment ${action}d successfully`);
                await refreshData();
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || `Failed to ${action} assignment`);
        }
    };

    const handleCancelAssignment = async (id: number) => {
        const confirmed = await showConfirm({
            title: 'Cancel Assignment',
            message: 'Are you sure you want to cancel this assignment?',
            icon: 'warning',
            confirmText: 'Cancel Assignment',
            cancelText: 'Keep Active'
        });

        if (!confirmed) return;

        try {
            showToast('Cancelling assignment...', 'info');
            const response = await assignmentAPI.cancelAssignment(id, 'Cancelled by user');

            if (response.status) {
                showSuccess('Assignment cancelled successfully');
                await refreshData();
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to cancel assignment');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedAssignments.length === 0) return;

        const confirmed = await showConfirm({
            title: 'Bulk Delete Confirmation',
            message: `Are you sure you want to delete ${selectedAssignments.length} selected assignment(s)? This action cannot be undone.`,
            icon: 'danger',
            confirmText: 'Delete All',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            showToast('Deleting selected assignments...', 'info');
            const results = await Promise.allSettled(
                selectedAssignments.map(id => assignmentAPI.deleteAssignment(id))
            );

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.status);
            const failed = results.filter(r => r.status === 'rejected' || !r.value?.status);

            if (failed.length === 0) {
                showSuccess(`Successfully deleted ${successful.length} assignment(s)`);
            } else {
                showError(`Deleted ${successful.length} assignment(s), failed to delete ${failed.length} assignment(s)`);
            }

            await refreshData();
        } catch (err: any) {
            showError(err.message || 'Failed to delete assignments');
        }
    };

    const handleExportCSV = async () => {
        if(!await dialogs.confirm({title: 'Export Assignments to CSV', message: 'Do you want to export the current assignments to a CSV file?'}))return;
        try {
            showToast('Exporting to CSV...', 'info');
            const filterParams: AssignmentFilters = {
                status: filters.statusFilter !== 'all' ? filters.statusFilter as any : undefined,
                workerId: filters.workerFilter || undefined,
                pitakId: filters.pitakFilter || undefined,
                dateFrom: filters.dateFrom || undefined,
                dateTo: filters.dateTo || undefined
            };
            
            const response = await assignmentAPI.exportAssignmentsToCSV(filterParams);

            if (response.status) {
                const link = document.createElement('a');
                const blob = new Blob([response.data.fileInfo.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.download = response.data.fileInfo.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showSuccess(`Exported ${response.data.summary.count} records to CSV`);
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to export CSV');
        }
    };

    return {
        handleDeleteAssignment,
        handleUpdateStatus,
        handleCancelAssignment,
        handleBulkDelete,
        handleExportCSV
    };
};