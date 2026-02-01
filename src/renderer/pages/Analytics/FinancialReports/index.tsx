// pages/analytics/FinancialReportsPage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    DollarSign,
    TrendingUp,
    PieChart,
    BarChart3,
    Calendar,
    Download, RefreshCw, AlertTriangle,
    CheckCircle, Users,
    Percent,
    ArrowUpRight,
    ArrowDownRight,
    ChevronRight,
    CreditCard,
    Wallet, Target, LineChart, Bell
} from 'lucide-react';
;
import { formatCurrency, formatDate, formatPercentage } from '../../../utils/formatters';
import { hideLoading, showLoading } from '../../../utils/notification';
import { financialAPI, type DebtCollectionRateData, type DebtSummaryData, type FinancialOverviewData, type PaymentSummaryData, type RevenueTrendData } from '../../../apis/analytics/financial';
import dashboardAPI from '../../../apis/analytics/dashboard';

const FinancialReportsPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('month');
    const [viewMode, setViewMode] = useState<'summary' | 'detailed'>('summary');
    
    // Data states
    const [overviewData, setOverviewData] = useState<FinancialOverviewData | null>(null);
    const [debtSummaryData, setDebtSummaryData] = useState<DebtSummaryData | null>(null);
    const [paymentSummaryData, setPaymentSummaryData] = useState<PaymentSummaryData | null>(null);
    const [revenueTrendData, setRevenueTrendData] = useState<RevenueTrendData | null>(null);
    const [debtCollectionData, setDebtCollectionData] = useState<DebtCollectionRateData | null>(null);

    const navigate = useNavigate();

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [overviewRes, debtRes, paymentRes, revenueRes, collectionRes] = await Promise.all([
                financialAPI.getFinancialOverview({ timeRange }),
                financialAPI.getDebtSummary({ timeRange }),
                financialAPI.getPaymentSummary({ timeRange }),
                financialAPI.getRevenueTrend({ timeRange }),
                financialAPI.getDebtCollectionRate({ timeRange })
            ]);

            if (overviewRes.status) setOverviewData(overviewRes.data);
            if (debtRes.status) setDebtSummaryData(debtRes.data);
            if (paymentRes.status) setPaymentSummaryData(paymentRes.data);
            if (revenueRes.status) setRevenueTrendData(revenueRes.data);
            if (collectionRes.status) setDebtCollectionData(collectionRes.data);

        } catch (err: any) {
            setError(err.message);
            console.error('Failed to fetch financial reports:', err);
        } finally {
            setLoading(false);
            hideLoading();
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [timeRange]);

    const handleRefresh = async () => {
        await fetchAllData();
    };

    const handleExportData = (type: string) => {
        console.log(`Exporting ${type} report`);
        // Implementation for export functionality
    };

    const handleViewDebtDetails = (debtId: string) => {
        navigate(`/finance/debts/view/${debtId}`);
    };

    const handleViewPaymentDetails = (paymentId: string) => {
        navigate(`/finance/payments/view/${paymentId}`);
    };

    const handleViewWorkerDetails = (workerId: string) => {
        navigate(`/workers/view/${workerId}`);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'debts', label: 'Debts', icon: CreditCard },
        { id: 'payments', label: 'Payments', icon: DollarSign },
        { id: 'revenue', label: 'Revenue', icon: TrendingUp },
        { id: 'collections', label: 'Collections', icon: Wallet }
    ];

    const timeRanges = [
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'quarter', label: 'This Quarter' },
        { value: 'year', label: 'This Year' },
        { value: 'custom', label: 'Custom Range' }
    ];

    const viewModes = [
        { id: 'summary', label: 'Summary View', icon: PieChart },
        { id: 'detailed', label: 'Detailed View', icon: BarChart3 }
    ];

    // Calculate metrics for overview
    const financialMetrics = useMemo(() => {
        if (!overviewData) return null;

        const growth = overviewData.payments.growthRate;
        const collectionRate = overviewData.debts.collectionRate;
        const debtBalance = overviewData.debts.totalBalance;
        const monthlyNet = overviewData.payments.currentMonth.net;

        return {
            healthScore: Math.min(100, 
                (collectionRate * 0.4) + 
                (Math.max(0, 100 - (debtBalance / (monthlyNet || 1) * 100)) * 0.3) + 
                (Math.max(0, growth) * 30)
            ),
            cashFlowStatus: monthlyNet > debtBalance * 0.1 ? 'positive' : 'concern',
            debtToIncomeRatio: monthlyNet > 0 ? debtBalance / monthlyNet : 0,
            topRisk: overviewData.debtStatusBreakdown.find(s => s.status === 'overdue') || null
        };
    }, [overviewData]);

    if (loading) {
       showLoading('Loading financial reports...');
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-light)', color: 'var(--danger-color)' }}>
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--danger-color)' }}>Error Loading Reports</p>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button
                    onClick={fetchAllData}
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

    const getHealthColor = (score: number) => {
        if (score >= 80) return 'var(--accent-green)';
        if (score >= 60) return 'var(--accent-yellow)';
        return 'var(--accent-red)';
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'var(--accent-green)';
            case 'overdue': return 'var(--accent-red)';
            case 'partial': return 'var(--accent-yellow)';
            case 'settled': return 'var(--accent-sky)';
            default: return 'var(--accent-gray)';
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <DollarSign className="w-6 h-6" />
                        Financial Analytics & Reports
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Comprehensive financial analysis, debt tracking, and revenue insights
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
                        {viewModes.map((mode) => {
                            const Icon = mode.icon;
                            const isActive = viewMode === mode.id;
                            return (
                                <button
                                    key={mode.id}
                                    onClick={() => setViewMode(mode.id as "summary" | "detailed")}
                                    className={`px-3 py-2 text-sm flex items-center gap-2 transition-colors ${isActive ? 'font-medium' : ''}`}
                                    style={{
                                        background: isActive ? 'var(--primary-color)' : 'var(--card-bg)',
                                        color: isActive ? 'var(--sidebar-text)' : 'var(--text-secondary)'
                                    }}
                                >
                                    <Icon className="w-4 h-4" />
                                    {mode.label}
                                </button>
                            );
                        })}
                    </div>
                    <select
                        value={timeRange}
                        onChange={(e) => setTimeRange(e.target.value)}
                        className="px-3 py-2 rounded-lg text-sm transition-colors duration-300"
                        style={{
                            background: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        {timeRanges.map((range) => (
                            <option key={range.value} value={range.value}>
                                {range.label}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={handleRefresh}
                        className="p-2 rounded-lg transition-all duration-200 hover:shadow-md"
                        style={{
                            background: 'var(--card-bg)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border-color)'
                        }}
                        title="Refresh data"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Financial Health Score */}
            {financialMetrics && (
                <div className="p-5 rounded-xl"
                    style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Target className="w-5 h-5" />
                            Financial Health Score
                        </h3>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Updated: {overviewData?.timestamp ? formatDate(new Date(overviewData.timestamp), 'MMM dd, HH:mm') : 'N/A'}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <div className="flex-1">
                            <div className="text-4xl font-bold mb-2" style={{ color: getHealthColor(financialMetrics.healthScore) }}>
                                {financialMetrics.healthScore.toFixed(0)}/100
                            </div>
                            <div className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                                {financialMetrics.healthScore >= 80 ? 'Excellent financial health' :
                                 financialMetrics.healthScore >= 60 ? 'Good financial health' :
                                 'Needs attention'}
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Collection Rate</div>
                                    <div className="font-semibold" style={{ 
                                        color: overviewData?.debts.collectionRate || 0 >= 70 ? 'var(--accent-green)' : 'var(--accent-red)' 
                                    }}>
                                        {formatPercentage(overviewData?.debts.collectionRate || 0)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Growth Rate</div>
                                    <div className="font-semibold" style={{ 
                                        color: overviewData?.payments.growthRate || 0 >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
                                    }}>
                                        {formatPercentage(overviewData?.payments.growthRate || 0)}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Debt/Income Ratio</div>
                                    <div className="font-semibold" style={{ 
                                        color: financialMetrics.debtToIncomeRatio < 3 ? 'var(--accent-green)' : 'var(--accent-red)' 
                                    }}>
                                        {financialMetrics.debtToIncomeRatio.toFixed(1)}x
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="w-48 h-48 rounded-full flex items-center justify-center"
                            style={{
                                background: `conic-gradient(${getHealthColor(financialMetrics.healthScore)} ${financialMetrics.healthScore}%, var(--card-secondary-bg) 0)`
                            }}
                        >
                            <div className="w-40 h-40 rounded-full flex items-center justify-center"
                                style={{ background: 'var(--card-bg)' }}
                            >
                                <div className="text-center">
                                    <div className="text-2xl font-bold mb-1" style={{ color: getHealthColor(financialMetrics.healthScore) }}>
                                        {financialMetrics.healthScore >= 80 ? '👍' :
                                         financialMetrics.healthScore >= 60 ? '⚠️' : '🚨'}
                                    </div>
                                    <div className="text-sm font-medium" style={{ color: getHealthColor(financialMetrics.healthScore) }}>
                                        {financialMetrics.cashFlowStatus === 'positive' ? 'Positive' : 'Monitor'}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors duration-200 ${isActive ? '' : 'hover:opacity-80'}`}
                            style={{
                                borderBottom: `2px solid ${isActive ? 'var(--primary-color)' : 'transparent'}`,
                                color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)'
                            }}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && overviewData && (
                <div className="space-y-6">
                    {/* Key Metrics Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-xl transition-all duration-300 hover:shadow-lg"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-green-light)' }}>
                                    <DollarSign className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>This Month's Net</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(overviewData.payments.currentMonth.net)}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex items-center text-xs"
                                style={{ 
                                    color: overviewData.payments.growthRate >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
                                }}
                            >
                                {overviewData.payments.growthRate >= 0 ? (
                                    <ArrowUpRight className="w-3 h-3 mr-1" />
                                ) : (
                                    <ArrowDownRight className="w-3 h-3 mr-1" />
                                )}
                                {formatPercentage(Math.abs(overviewData.payments.growthRate))}
                                {overviewData.payments.growthRate >= 0 ? ' increase' : ' decrease'}
                            </div>
                        </div>

                        <div className="p-5 rounded-xl transition-all duration-300 hover:shadow-lg"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-red-light)' }}>
                                    <CreditCard className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Debt Balance</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(overviewData.debts.totalBalance)}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs px-2 py-1 rounded-full"
                                    style={{
                                        background: 'var(--accent-red-light)',
                                        color: 'var(--accent-red)'
                                    }}
                                >
                                    {overviewData.debts.totalCount} debts
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {formatPercentage(overviewData.debts.collectionRate)} collected
                                </span>
                            </div>
                        </div>

                        <div className="p-5 rounded-xl transition-all duration-300 hover:shadow-lg"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-gold-light)' }}>
                                    <Percent className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Interest Rate</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {formatPercentage(overviewData.debts.averageInterestRate)}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Across all active debts
                            </div>
                        </div>

                        <div className="p-5 rounded-xl transition-all duration-300 hover:shadow-lg"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-purple-light)' }}>
                                    <Calendar className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Upcoming Due Dates</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {overviewData.upcomingDueDates.length}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Next 30 days
                            </div>
                        </div>
                    </div>

                    {/* Debt Status and Upcoming Due Dates */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Debt Status Breakdown */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <PieChart className="w-5 h-5" />
                                    Debt Status Breakdown
                                </h3>
                                <button
                                    onClick={() => setActiveTab('debts')}
                                    className="text-sm font-medium hover:underline flex items-center"
                                    style={{ color: 'var(--primary-color)' }}
                                >
                                    View Details
                                    <ChevronRight className="w-4 h-4 ml-1" />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {overviewData.debtStatusBreakdown.map((status, index) => {
                                    const percentage = (status.totalBalance / overviewData.debts.totalBalance) * 100;
                                    return (
                                        <div key={index} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 rounded-full mr-2" style={{ background: getStatusColor(status.status) }}></div>
                                                    <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>{status.status}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                        {formatCurrency(status.totalBalance)}
                                                    </span>
                                                    <span className="px-2 py-1 rounded-full text-xs"
                                                        style={{
                                                            background: 'var(--card-secondary-bg)',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        {status.count}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        background: getStatusColor(status.status)
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Upcoming Due Dates */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Calendar className="w-5 h-5" />
                                    Upcoming Due Dates
                                </h3>
                                <button
                                    onClick={() => handleExportData('due-dates')}
                                    className="text-sm font-medium hover:underline flex items-center"
                                    style={{ color: 'var(--primary-color)' }}
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export
                                </button>
                            </div>
                            <div className="space-y-3">
                                {overviewData.upcomingDueDates.slice(0, 5).map((debt, index) => (
                                    <div 
                                        key={index}
                                        className="p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                                        onClick={() => handleViewDebtDetails(debt.debtId)}
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {debt.workerName}
                                            </div>
                                            <div className={`px-2 py-1 rounded-full text-xs font-medium ${debt.daysUntilDue <= 7 ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {debt.daysUntilDue <= 0 ? 'OVERDUE' : `${debt.daysUntilDue} days`}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Balance</div>
                                                <div className="font-semibold" style={{ color: 'var(--accent-red)' }}>
                                                    {formatCurrency(debt.balance)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Due Date</div>
                                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {formatDate(debt.dueDate, 'MMM dd')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Quick Insights */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Bell className="w-5 h-5" />
                            Quick Insights
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg"
                                style={{
                                    background: overviewData.debts.collectionRate >= 70 ? 'var(--accent-green-light)' : 'var(--accent-yellow-light)',
                                    border: `1px solid ${overviewData.debts.collectionRate >= 70 ? 'var(--accent-green)20' : 'var(--accent-yellow)20'}`
                                }}
                            >
                                <div className="font-medium text-sm mb-2" style={{ 
                                    color: overviewData.debts.collectionRate >= 70 ? 'var(--accent-green-dark)' : 'var(--accent-yellow-dark)' 
                                }}>
                                    {overviewData.debts.collectionRate >= 70 ? '✅ Strong Collections' : '⚠️ Collections Need Attention'}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Collection rate is {formatPercentage(overviewData.debts.collectionRate)}. 
                                    {overviewData.debts.collectionRate >= 70 
                                        ? ' Maintain this positive trend.' 
                                        : ' Consider implementing stricter collection policies.'}
                                </p>
                            </div>

                            <div className="p-4 rounded-lg"
                                style={{
                                    background: overviewData.payments.growthRate >= 0 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                                    border: `1px solid ${overviewData.payments.growthRate >= 0 ? 'var(--accent-green)20' : 'var(--accent-red)20'}`
                                }}
                            >
                                <div className="font-medium text-sm mb-2" style={{ 
                                    color: overviewData.payments.growthRate >= 0 ? 'var(--accent-green-dark)' : 'var(--accent-red-dark)' 
                                }}>
                                    {overviewData.payments.growthRate >= 0 ? '📈 Positive Growth' : '📉 Negative Growth'}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Net payments {overviewData.payments.growthRate >= 0 ? 'increased' : 'decreased'} by {formatPercentage(Math.abs(overviewData.payments.growthRate))} this month.
                                </p>
                            </div>

                            <div className="p-4 rounded-lg"
                                style={{
                                    background: overviewData.upcomingDueDates.length > 5 ? 'var(--accent-red-light)' : 'var(--accent-green-light)',
                                    border: `1px solid ${overviewData.upcomingDueDates.length > 5 ? 'var(--accent-red)20' : 'var(--accent-green)20'}`
                                }}
                            >
                                <div className="font-medium text-sm mb-2" style={{ 
                                    color: overviewData.upcomingDueDates.length > 5 ? 'var(--accent-red-dark)' : 'var(--accent-green-dark)' 
                                }}>
                                    {overviewData.upcomingDueDates.length > 5 ? '🚨 High Upcoming Payments' : '✅ Manageable Schedule'}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    {overviewData.upcomingDueDates.length} payments due in the next 30 days.
                                    {overviewData.upcomingDueDates.length > 5 && ' Plan cash flow accordingly.'}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Debts Tab */}
            {activeTab === 'debts' && debtSummaryData && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                    {debtSummaryData.overallMetrics.totalDebts}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Debts</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>
                                    {formatCurrency(debtSummaryData.overallMetrics.totalBalance)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Balance</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-gold)' }}>
                                    {formatCurrency(debtSummaryData.overallMetrics.averageBalance)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Balance</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                    {formatPercentage(debtSummaryData.overallMetrics.averageInterestRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Interest Rate</div>
                            </div>
                        </div>
                    </div>

                    {/* Debt Trend and Overdue Debts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Debt Trend */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                Debt Trend ({debtSummaryData.period.type})
                            </h3>
                            <div className="space-y-3">
                                {debtSummaryData.debtTrend.slice(-7).map((trend, index) => (
                                    <div key={index} className="p-4 rounded-lg"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {formatDate(trend.date, 'MMM dd')}
                                            </div>
                                            <div className="font-semibold" style={{ color: 'var(--accent-red)' }}>
                                                {formatCurrency(trend.totalAmount)}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <span>+{trend.newDebts} new</span>
                                            <span>-{trend.paidDebts} paid</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Overdue Debts */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
                                    Overdue Debts
                                </h3>
                                <button
                                    onClick={() => handleExportData('overdue-debts')}
                                    className="text-sm font-medium hover:underline flex items-center"
                                    style={{ color: 'var(--primary-color)' }}
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export List
                                </button>
                            </div>
                            <div className="space-y-3">
                                {debtSummaryData.overdueDebts.slice(0, 5).map((debt, index) => (
                                    <div 
                                        key={index}
                                        className="p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                                        onClick={() => handleViewDebtDetails(debt.id)}
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {debt.workerName}
                                            </div>
                                            <div className="px-2 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    background: debt.daysOverdue > 30 ? 'var(--accent-red-light)' : 'var(--accent-yellow-light)',
                                                    color: debt.daysOverdue > 30 ? 'var(--accent-red)' : 'var(--accent-yellow)'
                                                }}
                                            >
                                                {debt.daysOverdue} days overdue
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Original Amount</div>
                                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {formatCurrency(debt.amount)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Balance</div>
                                                <div className="font-semibold" style={{ color: 'var(--accent-red)' }}>
                                                    {formatCurrency(debt.balance)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Debt Status Breakdown */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Debt Status Breakdown
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Count</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Amount</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Avg. Amount</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {debtSummaryData.debtStatusBreakdown.map((status, index) => {
                                        const percentage = (status.count / debtSummaryData.overallMetrics.totalDebts) * 100;
                                        return (
                                            <tr key={index} className="hover:bg-gray-50"
                                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center">
                                                        <div className="w-3 h-3 rounded-full mr-2" style={{ background: getStatusColor(status.status) }}></div>
                                                        <span className="capitalize text-sm" style={{ color: 'var(--text-primary)' }}>
                                                            {status.status}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {status.count}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {formatCurrency(status.totalAmount)}
                                                </td>
                                                <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {formatCurrency(status.averageAmount)}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center">
                                                        <div className="w-24 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${percentage}%`,
                                                                    background: getStatusColor(status.status)
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                            {formatPercentage(percentage)}
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {debtSummaryData.recommendations.length > 0 && (
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Target className="w-5 h-5" />
                                Debt Management Recommendations
                            </h3>
                            <div className="space-y-3">
                                {debtSummaryData.recommendations.map((recommendation, index) => (
                                    <div key={index} className="p-4 rounded-lg flex items-start gap-3"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="px-2 py-1 rounded text-xs font-medium mt-1"
                                            style={{
                                                background: index === 0 ? 'var(--accent-red-light)' :
                                                    index === 1 ? 'var(--accent-yellow-light)' : 'var(--accent-green-light)',
                                                color: index === 0 ? 'var(--accent-red)' :
                                                    index === 1 ? 'var(--accent-yellow)' : 'var(--accent-green)'
                                            }}
                                        >
                                            {index === 0 ? 'High Priority' : 
                                             index === 1 ? 'Medium Priority' : 'Low Priority'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {recommendation}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Payments Tab */}
            {activeTab === 'payments' && paymentSummaryData && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                    {paymentSummaryData.overallMetrics.totalPayments}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Payments</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-green)' }}>
                                    {formatCurrency(paymentSummaryData.overallMetrics.totalNet)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Net</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>
                                    {formatCurrency(paymentSummaryData.overallMetrics.totalDeductions)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Deductions</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-gold)' }}>
                                    {formatCurrency(paymentSummaryData.overallMetrics.averageNet)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Net Payment</div>
                            </div>
                        </div>
                    </div>

                    {/* Payment Trend and Top Payers */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Payment Trend */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                Payment Trend ({paymentSummaryData.period.type})
                            </h3>
                            <div className="space-y-3">
                                {paymentSummaryData.paymentTrend.slice(-7).map((trend, index) => (
                                    <div key={index} className="p-4 rounded-lg"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {formatDate(trend.date, 'MMM dd')}
                                            </div>
                                            <div className="font-semibold" style={{ color: 'var(--accent-green)' }}>
                                                {formatCurrency(trend.totalNet)}
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            <span>{trend.paymentCount} payments</span>
                                            <span>Avg: {formatCurrency(trend.averageNet)}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Top Payers */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Users className="w-5 h-5" />
                                    Top Payers
                                </h3>
                                <button
                                    onClick={() => handleExportData('top-payers')}
                                    className="text-sm font-medium hover:underline flex items-center"
                                    style={{ color: 'var(--primary-color)' }}
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export List
                                </button>
                            </div>
                            <div className="space-y-3">
                                {paymentSummaryData.topPayers.slice(0, 5).map((payer, index) => (
                                    <div 
                                        key={index}
                                        className="p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                                        onClick={() => handleViewWorkerDetails(payer.workerId)}
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {payer.workerName}
                                            </div>
                                            <div className="px-2 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    background: 'var(--accent-green-light)',
                                                    color: 'var(--accent-green)'
                                                }}
                                            >
                                                {payer.paymentCount} payments
                                            </div>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Net</div>
                                                <div className="font-semibold" style={{ color: 'var(--accent-green)' }}>
                                                    {formatCurrency(payer.totalNet)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Average</div>
                                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {formatCurrency(payer.averageNet)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Deduction Breakdown */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Deduction Analysis
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>
                                    {formatCurrency(paymentSummaryData.deductionBreakdown.totalDebtDeductions)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Debt Deductions</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-yellow)' }}>
                                    {formatCurrency(paymentSummaryData.deductionBreakdown.totalOtherDeductions)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Other Deductions</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-purple)' }}>
                                    {formatPercentage(paymentSummaryData.deductionBreakdown.debtDeductionRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Debt Deduction Rate</div>
                            </div>
                        </div>
                        <div className="mt-6">
                            <div className="flex justify-between text-sm mb-2">
                                <span style={{ color: 'var(--text-secondary)' }}>Debt vs Other Deductions</span>
                                <span style={{ color: 'var(--text-primary)' }}>
                                    {formatPercentage(
                                        paymentSummaryData.deductionBreakdown.totalDebtDeductions / 
                                        (paymentSummaryData.overallMetrics.totalDeductions || 1) * 100
                                    )}
                                </span>
                            </div>
                            <div className="h-4 rounded-full overflow-hidden flex">
                                <div
                                    className="h-full"
                                    style={{
                                        width: `${(paymentSummaryData.deductionBreakdown.totalDebtDeductions / 
                                            (paymentSummaryData.overallMetrics.totalDeductions || 1)) * 100}%`,
                                        background: 'var(--accent-red)'
                                    }}
                                    title="Debt Deductions"
                                ></div>
                                <div
                                    className="h-full"
                                    style={{
                                        width: `${(paymentSummaryData.deductionBreakdown.totalOtherDeductions / 
                                            (paymentSummaryData.overallMetrics.totalDeductions || 1)) * 100}%`,
                                        background: 'var(--accent-yellow)'
                                    }}
                                    title="Other Deductions"
                                ></div>
                            </div>
                            <div className="flex justify-between text-xs mt-2">
                                <span style={{ color: 'var(--accent-red)' }}>Debt Deductions</span>
                                <span style={{ color: 'var(--accent-yellow)' }}>Other Deductions</span>
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {paymentSummaryData.recommendations.length > 0 && (
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Target className="w-5 h-5" />
                                Payment Processing Recommendations
                            </h3>
                            <div className="space-y-3">
                                {paymentSummaryData.recommendations.map((recommendation, index) => (
                                    <div key={index} className="p-4 rounded-lg flex items-start gap-3"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <CheckCircle className="w-5 h-5 mt-0.5" style={{ color: 'var(--accent-green)' }} />
                                        <div className="flex-1">
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {recommendation}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Revenue Tab */}
            {activeTab === 'revenue' && revenueTrendData && (
                <div className="space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-green)' }}>
                                    {formatCurrency(revenueTrendData.metrics.totalRevenue)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Revenue</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                    {revenueTrendData.metrics.totalPayments}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Payments</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-gold)' }}>
                                    {formatCurrency(revenueTrendData.metrics.averageDailyRevenue)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Daily Revenue</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ 
                                    color: revenueTrendData.metrics.growthRate >= 0 ? 'var(--accent-green)' : 'var(--accent-red)' 
                                }}>
                                    {formatPercentage(revenueTrendData.metrics.growthRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Growth Rate</div>
                            </div>
                        </div>
                    </div>

                    {/* Revenue Trend */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <LineChart className="w-5 h-5" />
                                Revenue Trend ({revenueTrendData.period.type})
                            </h3>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Peak: {formatDate(revenueTrendData.metrics.peakRevenueDay.date, 'MMM dd')} - {formatCurrency(revenueTrendData.metrics.peakRevenueDay.revenue)}
                            </div>
                        </div>
                        <div className="space-y-3">
                            {revenueTrendData.trendData.map((data, index) => (
                                <div key={index} className="p-4 rounded-lg"
                                    style={{ background: 'var(--card-secondary-bg)' }}
                                >
                                    <div className="flex justify-between items-center mb-3">
                                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {formatDate(data.date, 'MMM dd')}
                                        </div>
                                        <div className="font-semibold" style={{ color: 'var(--accent-green)' }}>
                                            {formatCurrency(data.revenue)}
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        <span>{data.payments} payments</span>
                                        <span>Avg: {formatCurrency(data.averageRevenue)}</span>
                                    </div>
                                    <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${(data.revenue / Math.max(...revenueTrendData.trendData.map(d => d.revenue))) * 100}%`,
                                                background: 'linear-gradient(90deg, var(--accent-green-light), var(--accent-green))'
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Projections and Anomalies */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Projections */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <TrendingUp className="w-5 h-5" />
                                Revenue Projections
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg text-center"
                                    style={{ background: 'var(--card-secondary-bg)' }}
                                >
                                    <div className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-green)' }}>
                                        {formatCurrency(revenueTrendData.projections.nextPeriodEstimate)}
                                    </div>
                                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Next Period Estimate</div>
                                </div>
                                <div className="p-4 rounded-lg"
                                    style={{ background: 'var(--card-secondary-bg)' }}
                                >
                                    <div className="text-center mb-2">
                                        <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                            Confidence Interval
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            95% confidence level
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <div className="text-center">
                                            <div className="text-sm font-semibold" style={{ color: 'var(--accent-red)' }}>
                                                {formatCurrency(revenueTrendData.projections.confidenceInterval.low)}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Low</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-sm font-semibold" style={{ color: 'var(--accent-green)' }}>
                                                {formatCurrency(revenueTrendData.projections.confidenceInterval.high)}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>High</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Anomalies */}
                        {revenueTrendData.anomalies.length > 0 && (
                            <div className="p-5 rounded-xl"
                                style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <AlertTriangle className="w-5 h-5" />
                                    Revenue Anomalies
                                </h3>
                                <div className="space-y-3">
                                    {revenueTrendData.anomalies.slice(0, 3).map((anomaly, index) => (
                                        <div key={index} className="p-4 rounded-lg"
                                            style={{ 
                                                background: anomaly.type === 'spike' ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                                                border: `1px solid ${anomaly.type === 'spike' ? 'var(--accent-green)20' : 'var(--accent-red)20'}`
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-medium text-sm" style={{ 
                                                    color: anomaly.type === 'spike' ? 'var(--accent-green-dark)' : 'var(--accent-red-dark)' 
                                                }}>
                                                    {anomaly.type === 'spike' ? '📈 Revenue Spike' : '📉 Revenue Drop'}
                                                </div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    {formatDate(anomaly.date, 'MMM dd')}
                                                </div>
                                            </div>
                                            <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                Actual: {formatCurrency(anomaly.revenue)} vs Expected: {formatCurrency(anomaly.expected)}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                Deviation: {formatPercentage(Math.abs(anomaly.deviation))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Collections Tab */}
            {activeTab === 'collections' && debtCollectionData && (
                <div className="space-y-6">
                    {/* Summary Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-green)' }}>
                                    {formatPercentage(debtCollectionData.overallMetrics.collectionRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Collection Rate</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-green)' }}>
                                    {formatCurrency(debtCollectionData.overallMetrics.totalCollected)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Collected</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>
                                    {formatCurrency(debtCollectionData.overallMetrics.totalBalance)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Remaining Balance</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-gold)' }}>
                                    {formatCurrency(debtCollectionData.overallMetrics.averageCollectionPerDebt)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Collection/Debt</div>
                            </div>
                        </div>
                    </div>

                    {/* Collection by Age */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Collection Performance by Debt Age
                        </h3>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Age Bucket</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Debt Count</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Total Amount</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Collected</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Balance</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Collection Rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {debtCollectionData.collectionByAge.map((age, index) => (
                                        <tr key={index} className="hover:bg-gray-50"
                                            style={{ borderBottom: '1px solid var(--border-color)' }}
                                        >
                                            <td className="py-3 px-4">
                                                <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {age.ageBucket}
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {age.debtCount}
                                            </td>
                                            <td className="py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {formatCurrency(age.totalAmount)}
                                            </td>
                                            <td className="py-3 px-4 text-sm" style={{ color: 'var(--accent-green)' }}>
                                                {formatCurrency(age.totalCollected)}
                                            </td>
                                            <td className="py-3 px-4 text-sm" style={{ color: 'var(--accent-red)' }}>
                                                {formatCurrency(age.remainingBalance)}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center">
                                                    <div className="w-20 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                        <div
                                                            className="h-full rounded-full"
                                                            style={{
                                                                width: `${age.collectionRate}%`,
                                                                background: age.collectionRate >= 70 ? 'var(--accent-green)' :
                                                                    age.collectionRate >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                            }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium" 
                                                        style={{ 
                                                            color: age.collectionRate >= 70 ? 'var(--accent-green)' :
                                                                age.collectionRate >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                        }}
                                                    >
                                                        {formatPercentage(age.collectionRate)}
                                                    </span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Collection Efficiency and Problematic Debts */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Collection Efficiency */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                Collection Efficiency
                            </h3>
                            <div className="space-y-4">
                                <div className="p-4 rounded-lg"
                                    style={{ background: 'var(--card-secondary-bg)' }}
                                >
                                    <div className="text-center mb-2">
                                        <div className="text-xl font-bold" style={{ color: 'var(--accent-green)' }}>
                                            {formatCurrency(debtCollectionData.collectionEfficiency.averageDailyCollection)}
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            Average Daily Collection
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg"
                                    style={{ background: 'var(--card-secondary-bg)' }}
                                >
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                Best Collection Day
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {formatDate(debtCollectionData.collectionEfficiency.bestCollectionDay.date, 'MMM dd')}
                                            </div>
                                        </div>
                                        <div className="text-lg font-bold" style={{ color: 'var(--accent-green)' }}>
                                            {formatCurrency(debtCollectionData.collectionEfficiency.bestCollectionDay.collected)}
                                        </div>
                                    </div>
                                </div>
                                <div className="p-4 rounded-lg"
                                    style={{ background: 'var(--card-secondary-bg)' }}
                                >
                                    <div className="text-center">
                                        <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {debtCollectionData.collectionEfficiency.totalCollectionDays} days
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            Total Collection Days
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Problematic Debts */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex justify-between items-center mb-6">
                                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
                                    Problematic Debts
                                </h3>
                                <button
                                    onClick={() => handleExportData('problematic-debts')}
                                    className="text-sm font-medium hover:underline flex items-center"
                                    style={{ color: 'var(--primary-color)' }}
                                >
                                    <Download className="w-4 h-4 mr-1" />
                                    Export
                                </button>
                            </div>
                            <div className="space-y-3">
                                {debtCollectionData.problematicDebts.slice(0, 4).map((debt, index) => (
                                    <div 
                                        key={index}
                                        className="p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                                        onClick={() => handleViewDebtDetails(debt.id)}
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                ID: {debt.id.substring(0, 8)}...
                                            </div>
                                            <div className="px-2 py-1 rounded-full text-xs font-medium"
                                                style={{
                                                    background: debt.collectionRate < 10 ? 'var(--accent-red-light)' :
                                                        debt.collectionRate < 30 ? 'var(--accent-yellow-light)' : 'var(--accent-green-light)',
                                                    color: debt.collectionRate < 10 ? 'var(--accent-red)' :
                                                        debt.collectionRate < 30 ? 'var(--accent-yellow)' : 'var(--accent-green)'
                                                }}
                                            >
                                                {formatPercentage(debt.collectionRate)} collected
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-sm">
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Age</div>
                                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {debt.ageInDays} days
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Balance</div>
                                                <div className="font-semibold" style={{ color: 'var(--accent-red)' }}>
                                                    {formatCurrency(debt.balance)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Amount</div>
                                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {formatCurrency(debt.amount)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Status</div>
                                                <div className="font-medium" style={{ color: getStatusColor(debt.status) }}>
                                                    {debt.status}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {debtCollectionData.recommendations.length > 0 && (
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Target className="w-5 h-5" />
                                Collection Strategy Recommendations
                            </h3>
                            <div className="space-y-3">
                                {debtCollectionData.recommendations.map((recommendation, index) => (
                                    <div key={index} className="p-4 rounded-lg flex items-start gap-3"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="px-2 py-1 rounded text-xs font-medium mt-1"
                                            style={{
                                                background: index === 0 ? 'var(--accent-red-light)' :
                                                    index === 1 ? 'var(--accent-yellow-light)' : 'var(--accent-green-light)',
                                                color: index === 0 ? 'var(--accent-red)' :
                                                    index === 1 ? 'var(--accent-yellow)' : 'var(--accent-green)'
                                            }}
                                        >
                                            {index === 0 ? 'Immediate Action' : 
                                             index === 1 ? 'Short-term' : 'Long-term'}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {recommendation}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Export Panel */}
            <div className="p-5 rounded-xl"
                style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--border-color)'
                }}
            >
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                    <Download className="w-5 h-5" />
                    Export Reports
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <button
                        onClick={() => handleExportData('overview')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <BarChart3 className="w-5 h-5 mb-1" />
                        Overview
                    </button>
                    <button
                        onClick={() => handleExportData('debts')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <CreditCard className="w-5 h-5 mb-1" />
                        Debts
                    </button>
                    <button
                        onClick={() => handleExportData('payments')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <DollarSign className="w-5 h-5 mb-1" />
                        Payments
                    </button>
                    <button
                        onClick={() => handleExportData('revenue')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <TrendingUp className="w-5 h-5 mb-1" />
                        Revenue
                    </button>
                    <button
                        onClick={() => handleExportData('collections')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <Wallet className="w-5 h-5 mb-1" />
                        Collections
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FinancialReportsPage;