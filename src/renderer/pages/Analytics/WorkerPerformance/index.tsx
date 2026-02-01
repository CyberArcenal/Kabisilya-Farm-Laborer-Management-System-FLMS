// pages/analytics/WorkerPerformancePage.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    TrendingUp,
    Target, Calendar,
    Filter,
    Download,
    RefreshCw,
    Eye, AlertTriangle,
    DollarSign, BarChart3,
    PieChart,
    Activity,
    ChevronRight,
    Star,
    Trophy,
    TrendingDown,
    UserCheck, Coffee
} from 'lucide-react';

import { formatCurrency, formatNumber, formatDate, formatPercentage } from '../../../utils/formatters';
import { hideLoading, showLoading } from '../../../utils/notification';
import { workerPerformanceAPI, type TopPerformersData, type WorkerAttendanceData, type WorkerPerformanceData, type WorkersOverviewData, type WorkerStatusSummaryData } from '../../../apis/analytics/workerPerformance';

const WorkerPerformancePage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('month');
    const [performanceFilter, setPerformanceFilter] = useState('all');
    const [selectedWorker, setSelectedWorker] = useState<string | null>(null);
    
    // Data states
    const [overviewData, setOverviewData] = useState<WorkersOverviewData | null>(null);
    const [performanceData, setPerformanceData] = useState<WorkerPerformanceData | null>(null);
    const [statusData, setStatusData] = useState<WorkerStatusSummaryData | null>(null);
    const [topPerformersData, setTopPerformersData] = useState<TopPerformersData | null>(null);
    const [attendanceData, setAttendanceData] = useState<WorkerAttendanceData | null>(null);

    const navigate = useNavigate();

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [overviewRes, performanceRes, statusRes, topPerformersRes, attendanceRes] = await Promise.all([
                workerPerformanceAPI.getWorkersOverview({ timeRange }),
                workerPerformanceAPI.getWorkerPerformance({ timeRange, filter: performanceFilter }),
                workerPerformanceAPI.getWorkerStatusSummary({ timeRange }),
                workerPerformanceAPI.getTopPerformers({ timeRange, category: 'overall' }),
                workerPerformanceAPI.getWorkerAttendance({ timeRange })
            ]);

            if (overviewRes.status) setOverviewData(overviewRes.data);
            if (performanceRes.status) setPerformanceData(performanceRes.data);
            if (statusRes.status) setStatusData(statusRes.data);
            if (topPerformersRes.status) setTopPerformersData(topPerformersRes.data);
            if (attendanceRes.status) setAttendanceData(attendanceRes.data);

        } catch (err: any) {
            setError(err.message);
            console.error('Failed to fetch worker performance data:', err);
        } finally {
            setLoading(false);
            hideLoading();
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [timeRange, performanceFilter]);

    const handleRefresh = async () => {
        await fetchAllData();
    };

    const handleExportData = (type: string) => {
        console.log(`Exporting ${type} report`);
    };

    const handleViewWorkerDetails = (workerId: string) => {
        navigate(`/workers/view/${workerId}`);
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'performance', label: 'Performance', icon: TrendingUp },
        { id: 'status', label: 'Status', icon: UserCheck },
        { id: 'topPerformers', label: 'Top Performers', icon: Trophy },
        { id: 'attendance', label: 'Attendance', icon: Calendar }
    ];

    const timeRanges = [
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'quarter', label: 'This Quarter' },
        { value: 'year', label: 'This Year' }
    ];

    const performanceFilters = [
        { value: 'all', label: 'All Workers' },
        { value: 'high', label: 'High Performers' },
        { value: 'medium', label: 'Medium Performers' },
        { value: 'low', label: 'Low Performers' }
    ];

    const performanceCategories = [
        { id: 'high', label: 'High Performer', minScore: 80, color: 'var(--accent-green)', bgColor: 'var(--accent-green-light)' },
        { id: 'medium', label: 'Medium Performer', minScore: 60, maxScore: 79, color: 'var(--accent-yellow)', bgColor: 'var(--accent-yellow-light)' },
        { id: 'low', label: 'Low Performer', maxScore: 59, color: 'var(--accent-red)', bgColor: 'var(--accent-red-light)' }
    ];

    // Calculate performance metrics
    const performanceMetrics = useMemo(() => {
        if (!performanceData) return null;

        const workers = performanceData.performance;
        const totalWorkers = workers.length;
        
        if (totalWorkers === 0) return null;

        const avgProductivity = workers.reduce((sum, w) => sum + w.productivityScore, 0) / totalWorkers;
        const avgLuwang = workers.reduce((sum, w) => sum + w.totalLuwang, 0) / totalWorkers;
        const avgNetPay = workers.reduce((sum, w) => sum + w.totalNetPay, 0) / totalWorkers;
        const avgCompletionRate = workers.reduce((sum, w) => sum + (w.assignmentsCompleted / (performanceData.metrics.totalAssignments / totalWorkers || 1)), 0) / totalWorkers * 100;

        // Categorize workers
        const categories = {
            high: workers.filter(w => w.productivityScore >= 80).length,
            medium: workers.filter(w => w.productivityScore >= 60 && w.productivityScore < 80).length,
            low: workers.filter(w => w.productivityScore < 60).length
        };

        // Find top and bottom performers
        const sorted = [...workers].sort((a, b) => b.productivityScore - a.productivityScore);
        const topPerformers = sorted.slice(0, 3);
        const bottomPerformers = sorted.slice(-3).reverse();

        return {
            avgProductivity,
            avgLuwang,
            avgNetPay,
            avgCompletionRate,
            categories,
            topPerformers,
            bottomPerformers,
            totalWorkers
        };
    }, [performanceData]);

    if (loading) {
       showLoading('Loading worker performance data...');
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center" style={{ background: 'var(--danger-light)', color: 'var(--danger-color)' }}>
                    <AlertTriangle className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--danger-color)' }}>Error Loading Data</p>
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

    const getPerformanceColor = (score: number) => {
        if (score >= 80) return { text: 'var(--accent-green)', bg: 'var(--accent-green-light)' };
        if (score >= 60) return { text: 'var(--accent-yellow)', bg: 'var(--accent-yellow-light)' };
        return { text: 'var(--accent-red)', bg: 'var(--accent-red-light)' };
    };

    const getAttendanceColor = (rate: number) => {
        if (rate >= 90) return { text: 'var(--accent-green)', bg: 'var(--accent-green-light)' };
        if (rate >= 75) return { text: 'var(--accent-yellow)', bg: 'var(--accent-yellow-light)' };
        return { text: 'var(--accent-red)', bg: 'var(--accent-red-light)' };
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return { text: 'var(--accent-green)', bg: 'var(--accent-green-light)' };
            case 'inactive': return { text: 'var(--accent-red)', bg: 'var(--accent-red-light)' };
            case 'onLeave': return { text: 'var(--accent-blue)', bg: 'var(--accent-blue-light)' };
            case 'terminated': return { text: 'var(--accent-gray)', bg: 'var(--accent-gray-light)' };
            default: return { text: 'var(--text-secondary)', bg: 'var(--card-secondary-bg)' };
        }
    };

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Users className="w-6 h-6" />
                        Worker Performance Analytics
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Track worker productivity, attendance, and performance metrics
                    </p>
                </div>
                <div className="flex items-center gap-3">
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
                    <button
                        onClick={() => handleExportData('worker-performance')}
                        className="px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center"
                        style={{
                            background: 'var(--accent-green)',
                            color: 'white'
                        }}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export Report
                    </button>
                </div>
            </div>

            {/* Performance Summary Cards */}
            {performanceMetrics && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-5 rounded-xl transition-all duration-300 hover:shadow-lg"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-green-light)' }}>
                                <Users className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
                            </div>
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Workers</p>
                                <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {performanceMetrics.totalWorkers}
                                </h3>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs px-2 py-1 rounded-full"
                                style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}
                            >
                                {performanceMetrics.categories.high} high
                            </span>
                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {performanceMetrics.categories.low} low
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
                                <TrendingUp className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                            </div>
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Productivity</p>
                                <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {performanceMetrics.avgProductivity.toFixed(1)}
                                </h3>
                            </div>
                        </div>
                        <div className="flex items-center text-xs"
                            style={{ color: performanceMetrics.avgProductivity >= 70 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}
                        >
                            <Target className="w-3 h-3 mr-1" />
                            {performanceMetrics.avgProductivity >= 70 ? 'Above target' : 'Below target'}
                        </div>
                    </div>

                    <div className="p-5 rounded-xl transition-all duration-300 hover:shadow-lg"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-sky-light)' }}>
                                <Activity className="w-5 h-5" style={{ color: 'var(--accent-sky)' }} />
                            </div>
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Luwang</p>
                                <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {formatNumber(performanceMetrics.avgLuwang)}
                                </h3>
                            </div>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Per worker
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
                                <DollarSign className="w-5 h-5" style={{ color: 'var(--accent-purple)' }} />
                            </div>
                            <div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Net Pay</p>
                                <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {formatCurrency(performanceMetrics.avgNetPay)}
                                </h3>
                            </div>
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Per worker
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
            {activeTab === 'overview' && overviewData && performanceMetrics && (
                <div className="space-y-6">
                    {/* Performance Distribution */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <PieChart className="w-5 h-5" />
                                Performance Distribution
                            </h3>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Based on productivity scores
                            </div>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {performanceCategories.map((category) => {
                                const count = performanceMetrics.categories[category.id as keyof typeof performanceMetrics.categories];
                                const percentage = (count / performanceMetrics.totalWorkers) * 100;
                                return (
                                    <div key={category.id} className="p-4 rounded-lg"
                                        style={{ background: category.bgColor }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 rounded-full mr-2" style={{ background: category.color }}></div>
                                                <span className="font-medium text-sm" style={{ color: category.color }}>
                                                    {category.label}
                                                </span>
                                            </div>
                                            <div className="text-lg font-bold" style={{ color: category.color }}>
                                                {count}
                                            </div>
                                        </div>
                                        <div className="text-xs mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            {formatPercentage(percentage)} of total workers
                                        </div>
                                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(0,0,0,0.1)' }}>
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${percentage}%`,
                                                    background: category.color
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Top vs Bottom Performers */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Top Performers */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Trophy className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                Top Performers
                            </h3>
                            <div className="space-y-3">
                                {performanceMetrics.topPerformers.map((worker, index) => (
                                    <div 
                                        key={index}
                                        className="p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                                        onClick={() => handleViewWorkerDetails(worker.workerId)}
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold"
                                                    style={{
                                                        background: index === 0 ? 'var(--accent-gold-light)' :
                                                            index === 1 ? 'var(--accent-silver-light)' :
                                                                'var(--accent-bronze-light)',
                                                        color: index === 0 ? 'var(--accent-gold)' :
                                                            index === 1 ? 'var(--accent-silver)' :
                                                                'var(--accent-bronze)'
                                                    }}
                                                >
                                                    #{index + 1}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {worker.workerName}
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        Score: {worker.productivityScore.toFixed(1)}
                                                    </div>
                                                </div>
                                            </div>
                                            <Star className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Luwang</div>
                                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {formatNumber(worker.totalLuwang)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Assignments</div>
                                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {worker.assignmentsCompleted}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Net Pay</div>
                                                <div className="font-semibold" style={{ color: 'var(--accent-green)' }}>
                                                    {formatCurrency(worker.totalNetPay)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Need Improvement */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <AlertTriangle className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
                                Need Improvement
                            </h3>
                            <div className="space-y-3">
                                {performanceMetrics.bottomPerformers.map((worker, index) => (
                                    <div 
                                        key={index}
                                        className="p-4 rounded-lg cursor-pointer hover:bg-gray-50"
                                        onClick={() => handleViewWorkerDetails(worker.workerId)}
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex justify-between items-center mb-3">
                                            <div className="flex items-center">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center mr-3 text-sm font-bold"
                                                    style={{
                                                        background: 'var(--accent-red-light)',
                                                        color: 'var(--accent-red)'
                                                    }}
                                                >
                                                    #{performanceMetrics.totalWorkers - index}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {worker.workerName}
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        Score: {worker.productivityScore.toFixed(1)}
                                                    </div>
                                                </div>
                                            </div>
                                            <TrendingDown className="w-5 h-5" style={{ color: 'var(--accent-red)' }} />
                                        </div>
                                        <div className="grid grid-cols-3 gap-2 text-sm">
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Luwang</div>
                                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {formatNumber(worker.totalLuwang)}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Assignments</div>
                                                <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {worker.assignmentsCompleted}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completion Rate</div>
                                                <div className="font-semibold" style={{ color: 'var(--accent-red)' }}>
                                                    {formatPercentage((worker.assignmentsCompleted / (performanceData?.metrics.totalAssignments || 0 / performanceMetrics.totalWorkers || 1)) * 100)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Financial Overview */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <DollarSign className="w-5 h-5" />
                                Financial Overview
                            </h3>
                            <button
                                onClick={() => setActiveTab('performance')}
                                className="text-sm font-medium hover:underline flex items-center"
                                style={{ color: 'var(--primary-color)' }}
                            >
                                View Details
                                <ChevronRight className="w-4 h-4 ml-1" />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-red)' }}>
                                    {formatCurrency(overviewData.financial.totalDebt)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Debt</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {formatCurrency(overviewData.financial.averageDebt)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Debt/Worker</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
                                    {overviewData.assignments.active}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active Assignments</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>
                                    {overviewData.assignments.averagePerWorker.toFixed(1)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Assignments</div>
                            </div>
                        </div>
                        <div className="mt-6">
                            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Top Debtors</h4>
                            <div className="space-y-2">
                                {overviewData.financial.topDebtors.slice(0, 3).map((debtor, index) => (
                                    <div 
                                        key={index}
                                        className="flex justify-between items-center p-3 rounded-lg cursor-pointer hover:bg-gray-50"
                                        onClick={() => handleViewWorkerDetails(debtor.id)}
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div>
                                            <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {debtor.name}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                Balance: {formatCurrency(debtor.currentBalance)}
                                            </div>
                                        </div>
                                        <div className="font-semibold text-sm" style={{ color: 'var(--accent-red)' }}>
                                            {formatCurrency(debtor.totalDebt)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Performance Tab */}
            {activeTab === 'performance' && performanceData && (
                <div className="space-y-6">
                    {/* Filter Controls */}
                    <div className="p-4 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <Filter className="w-5 h-5" style={{ color: 'var(--text-secondary)' }} />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                Filter by Performance:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {performanceFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setPerformanceFilter(filter.value)}
                                        className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${performanceFilter === filter.value ? 'font-medium' : 'opacity-80 hover:opacity-100'}`}
                                        style={{
                                            background: performanceFilter === filter.value ? 'var(--primary-color)' : 'var(--card-secondary-bg)',
                                            color: performanceFilter === filter.value ? 'var(--sidebar-text)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Performance Period */}
                    <div className="p-4 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                                <div>
                                    <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                        Performance Period
                                    </div>
                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        {formatDate(performanceData.period.start)} - {formatDate(performanceData.period.end)}
                                    </div>
                                </div>
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Type: {performanceData.period.type}
                            </div>
                        </div>
                    </div>

                    {/* Performance Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-xl text-center"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                {performanceData.metrics.totalWorkers}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Workers</div>
                        </div>
                        <div className="p-5 rounded-xl text-center"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                {performanceData.metrics.totalAssignments}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Assignments</div>
                        </div>
                        <div className="p-5 rounded-xl text-center"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-green)' }}>
                                {formatNumber(performanceData.metrics.totalLuwang)}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Luwang</div>
                        </div>
                        <div className="p-5 rounded-xl text-center"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-3xl font-bold mb-2" style={{ color: 'var(--accent-gold)' }}>
                                {formatCurrency(performanceData.metrics.totalNetPay)}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Net Pay</div>
                        </div>
                    </div>

                    {/* Performance Table */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Users className="w-5 h-5" />
                                Worker Performance Details
                            </h3>
                            <button
                                onClick={() => handleExportData('performance-details')}
                                className="text-sm font-medium hover:underline flex items-center"
                                style={{ color: 'var(--primary-color)' }}
                            >
                                <Download className="w-4 h-4 mr-1" />
                                Export List
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Worker</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Assignments</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Luwang</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Net Pay</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Payments</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Productivity Score</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {performanceData.performance.map((worker, index) => {
                                        const perfColor = getPerformanceColor(worker.productivityScore);
                                        return (
                                            <tr key={index} className="hover:bg-gray-50"
                                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {worker.workerName}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {worker.assignmentsCompleted}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                    {formatNumber(worker.totalLuwang)}
                                                </td>
                                                <td className="py-3 px-4 text-sm font-semibold" style={{ color: 'var(--accent-green)' }}>
                                                    {formatCurrency(worker.totalNetPay)}
                                                </td>
                                                <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                    {worker.paymentCount}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center">
                                                        <div className="w-20 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${worker.productivityScore}%`,
                                                                    background: perfColor.text
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium" style={{ color: perfColor.text }}>
                                                            {worker.productivityScore.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <button
                                                        onClick={() => handleViewWorkerDetails(worker.workerId)}
                                                        className="px-3 py-1 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center"
                                                        style={{
                                                            background: 'var(--primary-light)',
                                                            color: 'var(--primary-color)'
                                                        }}
                                                    >
                                                        <Eye className="w-4 h-4 mr-1" />
                                                        View
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Additional Metrics */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-5 rounded-xl text-center"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                {formatNumber(performanceData.metrics.averageLuwangPerWorker)}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Luwang per Worker</div>
                        </div>
                        <div className="p-5 rounded-xl text-center"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-xl font-bold mb-2" style={{ color: 'var(--accent-gold)' }}>
                                {formatCurrency(performanceData.metrics.averageNetPay)}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Net Pay per Worker</div>
                        </div>
                        <div className="p-5 rounded-xl text-center"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                {performanceData.metrics.totalAssignments}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Assignments Completed</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Status Tab */}
            {activeTab === 'status' && statusData && (
                <div className="space-y-6">
                    {/* Status Overview */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <UserCheck className="w-5 h-5" />
                                Worker Status Overview
                            </h3>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Total Workers: {statusData.metrics.totalWorkers}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {formatPercentage(statusData.metrics.activityRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Activity Rate</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {statusData.metrics.averageTenure.toFixed(1)} days
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Tenure</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
                                    {statusData.trends.newWorkers}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>New Workers</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-yellow)' }}>
                                    {statusData.trends.statusChanges}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Status Changes</div>
                            </div>
                        </div>

                        {/* Status Breakdown */}
                        <div>
                            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Status Breakdown</h4>
                            <div className="space-y-3">
                                {statusData.statusBreakdown.map((status, index) => {
                                    const statusColor = getStatusColor(status.status);
                                    return (
                                        <div key={index} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <div className="flex items-center">
                                                    <div className="w-3 h-3 rounded-full mr-2" style={{ background: statusColor.text }}></div>
                                                    <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>
                                                        {status.status}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                        {status.count} workers
                                                    </span>
                                                    <span className="px-2 py-1 rounded-full text-xs"
                                                        style={{
                                                            background: 'var(--card-secondary-bg)',
                                                            color: 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        {formatPercentage(status.percentage)}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${status.percentage}%`,
                                                        background: statusColor.text
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Status Distribution Chart */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Status Distribution
                        </h3>
                        <div className="flex flex-col gap-4">
                            {statusData.statusBreakdown.map((status, index) => {
                                const statusColor = getStatusColor(status.status);
                                return (
                                    <div key={index} className="flex items-center">
                                        <div className="w-24 text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                                            {status.status}
                                        </div>
                                        <div className="flex-1 flex items-center">
                                            <div className="h-8 rounded-lg mr-2 flex items-center justify-end pr-2 text-xs font-medium"
                                                style={{
                                                    width: `${status.percentage}%`,
                                                    background: statusColor.bg,
                                                    color: statusColor.text,
                                                    minWidth: '40px'
                                                }}
                                            >
                                                {status.count}
                                            </div>
                                            <div className="w-16 text-sm text-right" style={{ color: 'var(--text-secondary)' }}>
                                                {formatPercentage(status.percentage)}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Top Performers Tab */}
            {activeTab === 'topPerformers' && topPerformersData && (
                <div className="space-y-6">
                    {/* Top Performers Header */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center">
                            <div>
                                <h3 className="text-lg font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                    <Trophy className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                    {topPerformersData.category} Top Performers
                                </h3>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Time Frame: {topPerformersData.timeFrame}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Average Value</div>
                                <div className="text-xl font-bold" style={{ color: 'var(--accent-gold)' }}>
                                    {topPerformersData.summary.averageValue.toFixed(1)}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Top Performers List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {topPerformersData.performers.map((performer, index) => (
                            <div 
                                key={index}
                                className="p-5 rounded-xl cursor-pointer hover:shadow-lg transition-all duration-300"
                                onClick={() => handleViewWorkerDetails(performer.workerId)}
                                style={{
                                    background: index === 0 ? 'linear-gradient(135deg, var(--accent-gold-light), var(--card-bg))' :
                                        index === 1 ? 'linear-gradient(135deg, var(--accent-silver-light), var(--card-bg))' :
                                        index === 2 ? 'linear-gradient(135deg, var(--accent-bronze-light), var(--card-bg))' :
                                        'var(--card-bg)',
                                    border: `1px solid ${index === 0 ? 'var(--accent-gold)' :
                                        index === 1 ? 'var(--accent-silver)' :
                                        index === 2 ? 'var(--accent-bronze)' : 'var(--border-color)'}`
                                }}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold mr-3"
                                            style={{
                                                background: index === 0 ? 'var(--accent-gold)' :
                                                    index === 1 ? 'var(--accent-silver)' :
                                                    index === 2 ? 'var(--accent-bronze)' : 'var(--primary-color)',
                                                color: 'white'
                                            }}
                                        >
                                            #{index + 1}
                                        </div>
                                        <div>
                                            <div className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                                {performer.workerName}
                                            </div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {performer.metric}
                                            </div>
                                        </div>
                                    </div>
                                    {index < 3 && (
                                        <Trophy className="w-6 h-6"
                                            style={{
                                                color: index === 0 ? 'var(--accent-gold)' :
                                                    index === 1 ? 'var(--accent-silver)' :
                                                    'var(--accent-bronze)'
                                            }}
                                        />
                                    )}
                                </div>
                                <div className="mb-4">
                                    <div className="text-3xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                        {typeof performer.value === 'number' ? performer.value.toFixed(1) : performer.value}
                                    </div>
                                    <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        {performer.secondaryLabel}: {performer.secondaryValue}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="px-3 py-1 rounded-full text-xs font-medium"
                                        style={{
                                            background: index === 0 ? 'var(--accent-gold-light)' :
                                                index === 1 ? 'var(--accent-silver-light)' :
                                                index === 2 ? 'var(--accent-bronze-light)' : 'var(--card-secondary-bg)',
                                            color: index === 0 ? 'var(--accent-gold)' :
                                                index === 1 ? 'var(--accent-silver)' :
                                                index === 2 ? 'var(--accent-bronze)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {performer.metric}
                                    </span>
                                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Performance Summary */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                            Performance Summary
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {topPerformersData.summary.count}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Top Performers</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>
                                    {topPerformersData.summary.averageValue.toFixed(1)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Average Performance Score</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {topPerformersData.performers[0]?.metric || 'N/A'}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Primary Metric</div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Attendance Tab */}
            {activeTab === 'attendance' && attendanceData && (
                <div className="space-y-6">
                    {/* Attendance Summary */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Calendar className="w-5 h-5" />
                                Attendance Overview
                            </h3>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Period: {formatDate(attendanceData.summary.period.start)} - {formatDate(attendanceData.summary.period.end)}
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {attendanceData.summary.totalDays}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Days</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
                                    {attendanceData.summary.daysWithAssignments}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Days with Assignments</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ 
                                    color: getAttendanceColor(attendanceData.summary.attendanceRate).text 
                                }}>
                                    {formatPercentage(attendanceData.summary.attendanceRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Attendance Rate</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>
                                    {formatPercentage(attendanceData.summary.averageCompletionRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Completion Rate</div>
                            </div>
                        </div>

                        {/* Attendance Trend */}
                        <div>
                            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Attendance Trend</h4>
                            <div className="space-y-3">
                                {attendanceData.attendanceRecords.slice(-7).map((record, index) => {
                                    const attColor = getAttendanceColor(record.completionRate);
                                    return (
                                        <div key={index} className="p-4 rounded-lg"
                                            style={{ background: 'var(--card-secondary-bg)' }}
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                    {formatDate(record.date, 'MMM dd')}
                                                </div>
                                                <div className="font-semibold" style={{ color: attColor.text }}>
                                                    {formatPercentage(record.completionRate)}
                                                </div>
                                            </div>
                                            <div className="flex justify-between text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                <span>{record.totalAssignments} total assignments</span>
                                                <span>{record.completedAssignments} completed</span>
                                            </div>
                                            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                <div
                                                    className="h-full rounded-full"
                                                    style={{
                                                        width: `${record.completionRate}%`,
                                                        background: attColor.text
                                                    }}
                                                ></div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    {/* Attendance Insights */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Coffee className="w-5 h-5" />
                            Attendance Insights
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="p-4 rounded-lg"
                                style={{
                                    background: attendanceData.summary.attendanceRate >= 90 ? 'var(--accent-green-light)' : 'var(--accent-yellow-light)',
                                    border: `1px solid ${attendanceData.summary.attendanceRate >= 90 ? 'var(--accent-green)20' : 'var(--accent-yellow)20'}`
                                }}
                            >
                                <div className="font-medium text-sm mb-2" style={{ 
                                    color: attendanceData.summary.attendanceRate >= 90 ? 'var(--accent-green-dark)' : 'var(--accent-yellow-dark)' 
                                }}>
                                    {attendanceData.summary.attendanceRate >= 90 ? '✅ Excellent Attendance' : '⚠️ Attendance Needs Attention'}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Overall attendance rate is {formatPercentage(attendanceData.summary.attendanceRate)}.
                                    {attendanceData.summary.attendanceRate >= 90 
                                        ? ' Keep up the good work!' 
                                        : ' Consider implementing attendance incentives.'}
                                </p>
                            </div>

                            <div className="p-4 rounded-lg"
                                style={{
                                    background: attendanceData.summary.averageCompletionRate >= 80 ? 'var(--accent-green-light)' : 'var(--accent-yellow-light)',
                                    border: `1px solid ${attendanceData.summary.averageCompletionRate >= 80 ? 'var(--accent-green)20' : 'var(--accent-yellow)20'}`
                                }}
                            >
                                <div className="font-medium text-sm mb-2" style={{ 
                                    color: attendanceData.summary.averageCompletionRate >= 80 ? 'var(--accent-green-dark)' : 'var(--accent-yellow-dark)' 
                                }}>
                                    {attendanceData.summary.averageCompletionRate >= 80 ? '🎯 High Completion Rate' : '📝 Completion Rate Can Improve'}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Average completion rate is {formatPercentage(attendanceData.summary.averageCompletionRate)}.
                                    {attendanceData.summary.averageCompletionRate >= 80 
                                        ? ' Workers are highly productive.' 
                                        : ' Focus on improving task completion.'}
                                </p>
                            </div>

                            <div className="p-4 rounded-lg"
                                style={{
                                    background: attendanceData.summary.daysWithAssignments >= attendanceData.summary.totalDays * 0.8 
                                        ? 'var(--accent-green-light)' : 'var(--accent-yellow-light)',
                                    border: `1px solid ${attendanceData.summary.daysWithAssignments >= attendanceData.summary.totalDays * 0.8 
                                        ? 'var(--accent-green)20' : 'var(--accent-yellow)20'}`
                                }}
                            >
                                <div className="font-medium text-sm mb-2" style={{ 
                                    color: attendanceData.summary.daysWithAssignments >= attendanceData.summary.totalDays * 0.8 
                                        ? 'var(--accent-green-dark)' : 'var(--accent-yellow-dark)' 
                                }}>
                                    {attendanceData.summary.daysWithAssignments >= attendanceData.summary.totalDays * 0.8 
                                        ? '📊 Consistent Work Days' : '📅 Inconsistent Work Schedule'}
                                </div>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Work assignments on {attendanceData.summary.daysWithAssignments} out of {attendanceData.summary.totalDays} days.
                                </p>
                            </div>
                        </div>
                    </div>
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
                    Export Worker Reports
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <button
                        onClick={() => handleExportData('performance-overview')}
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
                        onClick={() => handleExportData('performance-details')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <TrendingUp className="w-5 h-5 mb-1" />
                        Performance
                    </button>
                    <button
                        onClick={() => handleExportData('status-report')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <UserCheck className="w-5 h-5 mb-1" />
                        Status
                    </button>
                    <button
                        onClick={() => handleExportData('top-performers')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <Trophy className="w-5 h-5 mb-1" />
                        Top Performers
                    </button>
                    <button
                        onClick={() => handleExportData('attendance-report')}
                        className="p-3 rounded-lg text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-md flex flex-col items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <Calendar className="w-5 h-5 mb-1" />
                        Attendance
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WorkerPerformancePage;