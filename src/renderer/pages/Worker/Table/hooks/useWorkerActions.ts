// components/Worker/hooks/useWorkerActions.ts
import workerAPI from '../../../../apis/worker';
import { showConfirm } from '../../../../utils/dialogs';
import { showError, showSuccess, showToast} from '../../../../utils/notification';

export const useWorkerActions = (
    workers: any[],
    fetchWorkers: () => Promise<void>,
    selectedWorkers: number[]
) => {
    const handleDeleteWorker = async (id: number) => {
        const worker = workers.find(w => w.id === id);
        const confirmed = await showConfirm({
            title: 'Delete Worker',
            message: `Are you sure you want to delete ${worker?.name}? This action cannot be undone.`,
            icon: 'danger',
            confirmText: 'Delete',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            showToast('Deleting worker...', 'info');
            const response = await workerAPI.deleteWorker(id);

            if (response.status) {
                showSuccess('Worker deleted successfully');
                await fetchWorkers();
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to delete worker');
        }
    };

    const handleBulkDelete = async () => {
        if (selectedWorkers.length === 0) return;

        const confirmed = await showConfirm({
            title: 'Bulk Delete Confirmation',
            message: `Are you sure you want to delete ${selectedWorkers.length} selected worker(s)? This action cannot be undone.`,
            icon: 'danger',
            confirmText: 'Delete All',
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            showToast('Deleting selected workers...', 'info');
            const results = await Promise.allSettled(
                selectedWorkers.map(id => workerAPI.deleteWorker(id))
            );

            const successful = results.filter(r => r.status === 'fulfilled' && r.value.status);
            const failed = results.filter(r => r.status === 'rejected' || !r.value?.status);

            if (failed.length === 0) {
                showSuccess(`Successfully deleted ${successful.length} worker(s)`);
            } else {
                showError(`Deleted ${successful.length} worker(s), failed to delete ${failed.length} worker(s)`);
            }

            await fetchWorkers();
        } catch (err: any) {
            showError(err.message || 'Failed to delete workers');
        }
    };

    const handleExportCSV = async () => {
        try {
            showToast('Exporting to CSV...', 'info');
            
            const params = {
                workerIds: selectedWorkers.length > 0 ? selectedWorkers : undefined,
                includeFields: ['id', 'name', 'contact', 'email', 'address', 'status', 'hireDate', 'totalDebt', 'totalPaid', 'currentBalance']
            };
            
            const response = await workerAPI.exportWorkersToCSV(params);

            if (response.status) {
                const link = document.createElement('a');
                const blob = new Blob([response.data.csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                link.href = url;
                link.download = `workers_export_${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                showSuccess(`Exported ${selectedWorkers.length || workers.length} workers to CSV`);
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to export CSV');
        }
    };

    const handleUpdateStatus = async (id: number, currentStatus: string, newStatus: string) => {
        const action = newStatus === 'active' ? 'activate' : 
                      newStatus === 'inactive' ? 'deactivate' : 
                      newStatus === 'on-leave' ? 'mark as on-leave' : 'terminate';

        const confirmed = await showConfirm({
            title: `${action.charAt(0).toUpperCase() + action.slice(1)} Worker`,
            message: `Are you sure you want to ${action} this worker?`,
            icon: 'warning',
            confirmText: action.charAt(0).toUpperCase() + action.slice(1),
            cancelText: 'Cancel'
        });

        if (!confirmed) return;

        try {
            showToast(`${action.charAt(0).toUpperCase() + action.slice(1)}ing worker...`, 'info');
            const response = await workerAPI.updateWorkerStatus(id, newStatus as "active" | "inactive" | "on-leave" | "terminated");

            if (response.status) {
                showSuccess(`Worker ${action}d successfully`);
                await fetchWorkers();
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || `Failed to ${action} worker`);
        }
    };

    const handleGenerateReport = async (id: number) => {
        try {
            showToast('Generating report...', 'info');
            const response = await workerAPI.generateWorkerReport(id, 'summary');

            if (response.status) {
                const reportWindow = window.open('', '_blank');
                const workerName = await workerAPI.getWorkerById(id).then(res => res.data?.worker?.name || 'Unknown Worker');
                if (reportWindow) {
                    reportWindow.document.write(`
                        <html>
                            <head>
                                <title>Worker Report - ${workerName}</title>
                            </head>
                            <body>
                                <h1>Worker Report</h1>
                                <p>Generated: ${new Date(response.data?.metadata?.generatedAt || new Date()).toLocaleString()}</p>
                            </body>
                        </html>
                    `);
                    reportWindow.document.close();
                }
                showSuccess('Report generated successfully');
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            showError(err.message || 'Failed to generate report');
        }
    };

    const handleImportCSV = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv';
        input.click();
    };

    return {
        handleDeleteWorker,
        handleBulkDelete,
        handleExportCSV,
        handleUpdateStatus,
        handleGenerateReport,
        handleImportCSV
    };
};