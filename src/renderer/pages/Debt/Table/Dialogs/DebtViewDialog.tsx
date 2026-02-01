// components/Debt/Dialogs/DebtViewDialog.tsx
import React, { useState, useEffect } from 'react';
import {
    X, DollarSign, User, Clock, FileText, TrendingUp, Download,
    Printer, Mail, Phone, MapPin, Activity, History
} from 'lucide-react';
import debtAPI from '../../../../apis/debt';
import { showError } from '../../../../utils/notification';
import { dialogs } from '../../../../utils/dialogs';

interface DebtViewDialogProps {
    id: number;
    onClose: () => void;
    onEdit?: (id: number) => void;
    onMakePayment?: (id: number) => void;
    onViewHistory?: (id: number) => void;
}

interface DebtData {
    id: number;
    originalAmount: number;
    amount: number;
    balance: number;
    reason: string | null;
    status: 'pending' | 'partially_paid' | 'paid' | 'cancelled' | 'overdue';
    dateIncurred: string;
    dueDate: string | null;
    paymentTerm: string | null;
    interestRate: number;
    totalInterest: number;
    totalPaid: number;
    lastPaymentDate: string | null;
    createdAt: string;
    updatedAt: string;
    worker: any;
    history?: any[];
}

const DebtViewDialog: React.FC<DebtViewDialogProps> = ({
    id,
    onClose,
    onEdit,
    onMakePayment,
    onViewHistory
}) => {
    const [loading, setLoading] = useState(true);
    const [debt, setDebt] = useState<DebtData | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'history' | 'activity'>('details');

    // Fetch debt data
    useEffect(() => {
        const fetchDebt = async () => {
            try {
                setLoading(true);
                const response = await debtAPI.getById(id);

                if (response.status && response.data) {
                    setDebt(response.data);
                } else {
                    showError('Debt record not found');
                    onClose();
                }
            } catch (error) {
                console.error('Error fetching debt:', error);
                showError('Failed to load debt data');
                onClose();
            } finally {
                setLoading(false);
            }
        };

        fetchDebt();
    }, [id, onClose]);

    // Format date
    const formatDate = (dateString: string | null) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-PH', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    // Format currency
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-PH', {
            style: 'currency',
            currency: 'PHP'
        }).format(amount);
    };

    // Get status color
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800';
            case 'partially_paid': return 'bg-blue-100 text-blue-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'overdue': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    // Calculate days remaining/overdue
    const getDaysStatus = () => {
        if (!debt?.dueDate) return { text: 'No due date', color: 'text-gray-600' };

        const dueDate = new Date(debt.dueDate);
        const today = new Date();
        const diffTime = dueDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays > 0) {
            return { text: `${diffDays} days remaining`, color: 'text-green-600' };
        } else if (diffDays === 0) {
            return { text: 'Due today', color: 'text-yellow-600' };
        } else {
            return { text: `${Math.abs(diffDays)} days overdue`, color: 'text-red-600' };
        }
    };

    // Handle actions
    const handleEdit = () => {
        if (onEdit) {
            onEdit(id);
            onClose();
        }
    };

    const handleMakePayment = () => {
        if (onMakePayment) {
            onMakePayment(id);
            onClose();
        }
    };

    const handleViewHistory = () => {
        if (onViewHistory) {
            onViewHistory(id);
            onClose();
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handleExport = async () => {
        try {
            // You can implement export functionality here
            dialogs.alert({
                title: 'Export Debt',
                message: 'Export functionality will be implemented soon.'
            });
        } catch (error) {
            console.error('Error exporting debt:', error);
        }
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4 windows-fade-in">
                <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl border border-gray-200">
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p className="text-sm text-gray-600">Loading debt details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!debt) return null;

    const daysStatus = getDaysStatus();

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4 windows-fade-in">
            <div className="bg-white rounded-lg w-full max-w-5xl shadow-xl border border-gray-200 windows-modal">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-50 to-gray-50">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-gray-900 windows-title">
                                Debt Details #{debt.id}
                            </h3>
                            <div className="text-sm text-gray-600 windows-text">
                                {debt.worker?.name || 'Worker Debt'} • {formatDate(debt.dateIncurred)}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-200 transition-colors windows-button-secondary"
                        title="Close"
                    >
                        <X className="w-4 h-4 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200">
                    <div className="flex">
                        <button
                            onClick={() => setActiveTab('details')}
                            className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'details'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <FileText className="w-4 h-4" />
                                Details
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('history')}
                            className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'history'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <History className="w-4 h-4" />
                                Payment History
                            </div>
                        </button>
                        <button
                            onClick={() => setActiveTab('activity')}
                            className={`px-6 py-3 text-sm font-medium transition-colors relative ${activeTab === 'activity'
                                    ? 'text-blue-600 border-b-2 border-blue-600'
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <Activity className="w-4 h-4" />
                                Activity Log
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[70vh] overflow-y-auto">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* Left Column - Debt Information */}
                                <div className="space-y-6">
                                    {/* Debt Summary Card */}
                                    <div className="windows-card p-5">
                                        <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                                            <DollarSign className="w-5 h-5 text-blue-600" />
                                            Debt Summary
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-sm text-gray-500 windows-text">Original Amount</div>
                                                    <div className="text-xl font-bold text-gray-900 windows-title">
                                                        {formatCurrency(debt.amount)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 windows-text">Current Balance</div>
                                                    <div className="text-xl font-bold" style={{
                                                        color: debt.balance > 0 ? '#ef4444' : '#16a34a'
                                                    }}>
                                                        {formatCurrency(debt.balance)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-sm text-gray-500 windows-text">Total Paid</div>
                                                    <div className="text-lg font-semibold text-green-600">
                                                        {formatCurrency(debt.totalPaid)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 windows-text">Total Interest</div>
                                                    <div className="text-lg font-semibold text-purple-600">
                                                        {formatCurrency(debt.totalInterest)}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                                                <div>
                                                    <div className="text-sm text-gray-500 windows-text">Status</div>
                                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(debt.status)}`}>
                                                        {debt.status.replace('_', ' ').toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="text-sm text-gray-500 windows-text">Interest Rate</div>
                                                    <div className="text-lg font-semibold text-gray-900 windows-title">
                                                        {debt.interestRate}%
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline Card */}
                                    <div className="windows-card p-5">
                                        <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                                            <Clock className="w-5 h-5 text-amber-600" />
                                            Payment Timeline
                                        </h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-500 windows-text">Date Incurred</div>
                                                <div className="font-medium text-gray-900 windows-title">
                                                    {formatDate(debt.dateIncurred)}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-500 windows-text">Due Date</div>
                                                <div className="font-medium text-gray-900 windows-title">
                                                    {formatDate(debt.dueDate)}
                                                </div>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <div className="text-sm text-gray-500 windows-text">Time Status</div>
                                                <div className={`font-medium ${daysStatus.color}`}>
                                                    {daysStatus.text}
                                                </div>
                                            </div>
                                            {debt.lastPaymentDate && (
                                                <div className="flex justify-between items-center">
                                                    <div className="text-sm text-gray-500 windows-text">Last Payment</div>
                                                    <div className="font-medium text-gray-900 windows-title">
                                                        {formatDate(debt.lastPaymentDate)}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Right Column - Worker & Details */}
                                <div className="space-y-6">
                                    {/* Worker Information Card */}
                                    <div className="windows-card p-5">
                                        <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                                            <User className="w-5 h-5 text-green-600" />
                                            Worker Information
                                        </h4>
                                        <div className="space-y-4">
                                            <div>
                                                <div className="text-sm text-gray-500 windows-text">Worker Name</div>
                                                <div className="text-lg font-semibold text-gray-900 windows-title">
                                                    {debt.worker?.name || 'N/A'}
                                                </div>
                                            </div>

                                            {debt.worker?.contact && (
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-700 windows-text">
                                                        {debt.worker.contact}
                                                    </span>
                                                </div>
                                            )}

                                            {debt.worker?.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-gray-400" />
                                                    <span className="text-sm text-gray-700 windows-text">
                                                        {debt.worker.email}
                                                    </span>
                                                </div>
                                            )}

                                            {debt.worker?.address && (
                                                <div className="flex items-start gap-2">
                                                    <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                                                    <span className="text-sm text-gray-700 windows-text">
                                                        {debt.worker.address}
                                                    </span>
                                                </div>
                                            )}

                                            <div className="pt-3 border-t border-gray-200">
                                                <div className="text-sm text-gray-500 windows-text">Worker Status</div>
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium mt-1 ${
                                                    debt.worker?.status === 'active' ? 'bg-green-100 text-green-800' :
                                                    debt.worker?.status === 'inactive' ? 'bg-red-100 text-red-800' :
                                                    debt.worker?.status === 'on-leave' ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {debt.worker?.status?.toUpperCase() || 'N/A'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Debt Details Card */}
                                    <div className="windows-card p-5">
                                        <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                                            <FileText className="w-5 h-5 text-purple-600" />
                                            Debt Details
                                        </h4>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="text-sm text-gray-500 windows-text">Reason</div>
                                                <div className="mt-1 text-gray-900 windows-text">
                                                    {debt.reason || 'No reason provided'}
                                                </div>
                                            </div>

                                            {debt.paymentTerm && (
                                                <div>
                                                    <div className="text-sm text-gray-500 windows-text">Payment Term</div>
                                                    <div className="mt-1 text-gray-900 windows-text">
                                                        {debt.paymentTerm} days
                                                    </div>
                                                </div>
                                            )}

                                            <div className="pt-3 border-t border-gray-200">
                                                <div className="text-sm text-gray-500 windows-text">Created At</div>
                                                <div className="mt-1 text-gray-900 windows-text">
                                                    {formatDate(debt.createdAt)}
                                                </div>
                                            </div>

                                            <div>
                                                <div className="text-sm text-gray-500 windows-text">Last Updated</div>
                                                <div className="mt-1 text-gray-900 windows-text">
                                                    {formatDate(debt.updatedAt)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Progress Bar */}
                            <div className="windows-card p-5">
                                <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                                    <TrendingUp className="w-5 h-5 text-blue-600" />
                                    Payment Progress
                                </h4>
                                <div className="space-y-3">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-600 windows-text">Paid: {formatCurrency(debt.totalPaid)}</span>
                                        <span className="text-gray-600 windows-text">Balance: {formatCurrency(debt.balance)}</span>
                                    </div>
                                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                                        <div
                                            className="bg-green-600 h-2.5 rounded-full"
                                            style={{ width: `${(debt.totalPaid / debt.amount) * 100}%` }}
                                        ></div>
                                    </div>
                                    <div className="text-sm text-gray-500 windows-text text-center">
                                        {((debt.totalPaid / debt.amount) * 100).toFixed(1)}% Paid
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && (
                        <div className="windows-card p-5">
                            <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                                <History className="w-5 h-5 text-blue-600" />
                                Payment History
                            </h4>
                            {debt.history && debt.history.length > 0 ? (
                                <div className="space-y-4">
                                    {debt.history.map((record, index) => (
                                        <div key={index} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <div className="font-medium text-gray-900 windows-title">
                                                        {formatCurrency(record.amountPaid)}
                                                    </div>
                                                    <div className="text-sm text-gray-500 windows-text mt-1">
                                                        {record.transactionType} • {formatDate(record.transactionDate)}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-medium windows-text">
                                                        Balance: {formatCurrency(record.newBalance)}
                                                    </div>
                                                    <div className="text-xs text-gray-500 windows-text mt-1">
                                                        {record.paymentMethod || 'No method'}
                                                    </div>
                                                </div>
                                            </div>
                                            {record.notes && (
                                                <div className="mt-3 p-3 bg-gray-50 rounded text-sm text-gray-700 windows-text">
                                                    {record.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <History className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <p className="text-gray-500 windows-text">No payment history available</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="windows-card p-5">
                            <h4 className="text-base font-semibold text-gray-900 mb-4 windows-title flex items-center gap-2">
                                <Activity className="w-5 h-5 text-blue-600" />
                                Activity Log
                            </h4>
                            <div className="text-center py-8">
                                <Activity className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 windows-text">Activity log will be implemented soon</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex gap-3">
                            <button
                                onClick={handleExport}
                                className="windows-button windows-button-secondary flex items-center gap-2"
                            >
                                <Download className="w-4 h-4" />
                                Export
                            </button>
                            <button
                                onClick={handlePrint}
                                className="windows-button windows-button-secondary flex items-center gap-2"
                            >
                                <Printer className="w-4 h-4" />
                                Print
                            </button>
                        </div>
                        <div className="flex gap-3">
                            {onViewHistory && (
                                <button
                                    onClick={handleViewHistory}
                                    className="windows-button windows-button-secondary flex items-center gap-2"
                                >
                                    <History className="w-4 h-4" />
                                    Full History
                                </button>
                            )}
                            {onMakePayment && debt.balance > 0 && debt.status !== 'cancelled' && (
                                <button
                                    onClick={handleMakePayment}
                                    className="windows-button windows-button-primary flex items-center gap-2 bg-green-600 hover:bg-green-700"
                                >
                                    <DollarSign className="w-4 h-4" />
                                    Make Payment
                                </button>
                            )}
                            {onEdit && (
                                <button
                                    onClick={handleEdit}
                                    className="windows-button windows-button-primary flex items-center gap-2"
                                >
                                    Edit Debt
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebtViewDialog;