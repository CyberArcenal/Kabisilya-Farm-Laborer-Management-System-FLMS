// pages/analytics/PitakProductivityPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    TrendingUp,
    BarChart3,
    Users,
    Target,
    Clock,
    Award,
    Filter,
    Download, RefreshCw,
    Eye,
    Layers,
    Activity, DollarSign, AlertTriangle, MapPin,
    Home,
    Sparkles,
    LineChart,
    Gauge
} from 'lucide-react';

import { formatCurrency, formatNumber, formatPercentage } from '../../../utils/formatters';
import { hideLoading, showLoading } from '../../../utils/notification';
import { pitakAPI, type ComparePitaksProductivityData, type PitakEfficiencyAnalysisData, type PitakProductionTimelineData, type PitakProductivityDetailsData, type PitakProductivityOverviewData, type PitakWorkerProductivityData } from '../../../apis/analytics/pitak';

const PitakProductivityPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('month');
    const [selectedPitak, setSelectedPitak] = useState<string | null>(null);
    const [productivityScoreFilter, setProductivityScoreFilter] = useState('all');

    // Data states
    const [overviewData, setOverviewData] = useState<PitakProductivityOverviewData | null>(null);
    const [detailsData, setDetailsData] = useState<PitakProductivityDetailsData | null>(null);
    const [timelineData, setTimelineData] = useState<PitakProductionTimelineData | null>(null);
    const [workerProductivityData, setWorkerProductivityData] = useState<PitakWorkerProductivityData | null>(null);
    const [efficiencyData, setEfficiencyData] = useState<PitakEfficiencyAnalysisData | null>(null);
    const [comparisonData, setComparisonData] = useState<ComparePitaksProductivityData | null>(null);

    const navigate = useNavigate();

    const fetchOverviewData = async () => {
        try {
            const response = await pitakAPI.getPitakProductivityOverview({ timeRange });
            if (response.status) setOverviewData(response.data);
        } catch (err) {
            console.error('Failed to fetch pitak overview:', err);
        }
    };

    const fetchSelectedPitakData = async () => {
        if (!selectedPitak) return;

        try {
            const [detailsRes, timelineRes, workerRes, efficiencyRes] = await Promise.all([
                pitakAPI.getPitakProductivityDetails({ pitakId: selectedPitak, timeRange }),
                pitakAPI.getPitakProductionTimeline({ pitakId: selectedPitak, timeRange }),
                pitakAPI.getPitakWorkerProductivity({ pitakId: selectedPitak, timeRange }),
                pitakAPI.getPitakEfficiencyAnalysis({ pitakId: selectedPitak, timeRange })
            ]);

            if (detailsRes.status) setDetailsData(detailsRes.data);
            if (timelineRes.status) setTimelineData(timelineRes.data);
            if (workerRes.status) setWorkerProductivityData(workerRes.data);
            if (efficiencyRes.status) setEfficiencyData(efficiencyRes.data);
        } catch (err) {
            console.error('Failed to fetch pitak details:', err);
        }
    };

    const fetchComparisonData = async () => {
        try {
            const response = await pitakAPI.comparePitaksProductivity({
                timeRange,
                scoreFilter: productivityScoreFilter !== 'all' ? productivityScoreFilter : undefined
            });
            if (response.status) setComparisonData(response.data);
        } catch (err) {
            console.error('Failed to fetch comparison data:', err);
        }
    };

    const fetchAllData = async () => {
        try {
            setLoading(true);
            setError(null);

            await Promise.all([
                fetchOverviewData(),
                fetchComparisonData()
            ]);

            if (selectedPitak) {
                await fetchSelectedPitakData();
            }

        } catch (err: any) {
            setError(err.message);
            console.error('Failed to fetch pitak productivity data:', err);
        } finally {
            setLoading(false);
            hideLoading();
        }
    };

    useEffect(() => {
        fetchAllData();
    }, [timeRange, productivityScoreFilter]);

    useEffect(() => {
        if (selectedPitak && activeTab !== 'overview' && activeTab !== 'comparison') {
            fetchSelectedPitakData();
        }
    }, [selectedPitak, timeRange]);

    const handleRefresh = async () => {
        await fetchAllData();
    };

    const handleExportData = () => {
        console.log('Exporting pitak productivity data');
    };

    const handleViewPitakDetails = (pitakId: string) => {
        setSelectedPitak(pitakId);
        setActiveTab('details');
    };

    const handleSelectPitak = (pitakId: string) => {
        setSelectedPitak(pitakId);
    };

    const getProductivityBadgeColor = (score: number) => {
        if (score >= 80) return { bg: 'var(--accent-green-light)', text: 'var(--accent-green)' };
        if (score >= 60) return { bg: 'var(--accent-yellow-light)', text: 'var(--accent-yellow)' };
        return { bg: 'var(--accent-red-light)', text: 'var(--accent-red)' };
    };

    const getEfficiencyLevel = (score: number) => {
        if (score >= 85) return { label: 'High', color: 'var(--accent-green)' };
        if (score >= 70) return { label: 'Good', color: 'var(--accent-yellow)' };
        if (score >= 50) return { label: 'Average', color: 'var(--accent-orange)' };
        return { label: 'Low', color: 'var(--accent-red)' };
    };

    const tabs = [
        { id: 'overview', label: 'Overview', icon: BarChart3 },
        { id: 'details', label: 'Details', icon: Activity, requiresPitak: true },
        { id: 'timeline', label: 'Timeline', icon: LineChart, requiresPitak: true },
        { id: 'workers', label: 'Workers', icon: Users, requiresPitak: true },
        { id: 'efficiency', label: 'Efficiency', icon: Gauge, requiresPitak: true },
        { id: 'comparison', label: 'Comparison', icon: TrendingUp }
    ];

    const timeRanges = [
        { value: 'week', label: 'This Week' },
        { value: 'month', label: 'This Month' },
        { value: 'quarter', label: 'This Quarter' },
        { value: 'year', label: 'This Year' }
    ];

    const productivityFilters = [
        { value: 'all', label: 'All Pitaks' },
        { value: 'high', label: 'High Productivity' },
        { value: 'medium', label: 'Medium Productivity' },
        { value: 'low', label: 'Low Productivity' }
    ];

    if (loading) {
        showLoading('Loading pitak productivity data...');
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

    const currentTab = tabs.find(tab => tab.id === activeTab);
    const showPitakSelector = currentTab?.requiresPitak && overviewData?.pitaks.length;

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <TrendingUp className="w-6 h-6" />
                        Pitak Productivity Analytics
                    </h1>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Detailed analysis of pitak performance and efficiency metrics
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
                        onClick={handleExportData}
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

            {/* Pitak Selector for Detail Tabs */}
            {showPitakSelector && (
                <div className="p-4 rounded-xl"
                    style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex items-center gap-3">
                        <Target className="w-5 h-5" style={{ color: 'var(--primary-color)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Select Pitak to Analyze:
                        </span>
                        <select
                            value={selectedPitak || ''}
                            onChange={(e) => handleSelectPitak(e.target.value)}
                            className="flex-1 px-3 py-2 rounded-lg text-sm transition-colors duration-300"
                            style={{
                                background: 'var(--card-secondary-bg)',
                                color: 'var(--text-primary)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <option value="">Choose a pitak...</option>
                            {overviewData?.pitaks.map((pitak) => (
                                <option key={pitak.pitakId} value={pitak.pitakId}>
                                    {pitak.location} • {pitak.bukidName} • {formatNumber(pitak.totalLuwang)} luwang
                                </option>
                            ))}
                        </select>
                        {selectedPitak && (
                            <button
                                onClick={() => navigate(`/farms/pitak/view/${selectedPitak}`)}
                                className="px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-md flex items-center"
                                style={{
                                    background: 'var(--primary-light)',
                                    color: 'var(--primary-color)'
                                }}
                            >
                                <Eye className="w-4 h-4 mr-1" />
                                View Details
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    const isDisabled = tab.requiresPitak && !selectedPitak && activeTab !== tab.id;

                    return (
                        <button
                            key={tab.id}
                            onClick={() => !isDisabled && setActiveTab(tab.id)}
                            disabled={isDisabled}
                            className={`px-4 py-3 text-sm font-medium flex items-center gap-2 transition-colors duration-200 ${isActive ? '' : 'hover:opacity-80'} ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            style={{
                                borderBottom: `2px solid ${isActive ? 'var(--primary-color)' : 'transparent'}`,
                                color: isActive ? 'var(--primary-color)' : 'var(--text-secondary)'
                            }}
                        >
                            <Icon className="w-4 h-4" />
                            {tab.label}
                            {tab.requiresPitak && (
                                <span className="text-xs opacity-75">(requires selection)</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Summary Cards */}
            {activeTab === 'overview' && overviewData && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="p-5 rounded-xl transition-all duration-300 hover:shadow-lg"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="flex items-center gap-3 mb-4">
                                <div className="p-2 rounded-lg" style={{ background: 'var(--accent-green-light)' }}>
                                    <Layers className="w-5 h-5" style={{ color: 'var(--accent-green)' }} />
                                </div>
                                <div>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Pitaks</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {overviewData.summary.totalPitaks}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-xs px-2 py-1 rounded-full"
                                    style={{
                                        background: 'var(--accent-green-light)',
                                        color: 'var(--accent-green)'
                                    }}
                                >
                                    {overviewData.summary.activePitaks} active
                                </span>
                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    {overviewData.summary.harvestedPitaks} completed
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
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Completed Luwang</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {formatNumber(overviewData.summary.totalCompletedLuwang)}
                                    </h3>
                                </div>
                            </div>
                            <div className="flex items-center text-xs"
                                style={{ color: overviewData.summary.averageCompletionRate >= 70 ? 'var(--accent-green)' : 'var(--accent-yellow)' }}
                            >
                                <Target className="w-3 h-3 mr-1" />
                                {formatPercentage(overviewData.summary.averageCompletionRate)} avg. completion
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
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Utilization</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {formatPercentage(overviewData.summary.averageUtilization)}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Land efficiency across all pitaks
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
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Net Pay</p>
                                    <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(overviewData.financial.totalNetPay)}
                                    </h3>
                                </div>
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                {formatCurrency(overviewData.financial.avgNetPay)} average per pitak
                            </div>
                        </div>
                    </div>

                    {/* Pitak List */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <MapPin className="w-5 h-5" />
                                All Pitaks Performance
                            </h3>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Sorted by productivity score
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Pitak Location</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Bukid</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Status</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Luwang</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Completion Rate</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Utilization</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {overviewData.pitaks
                                        .sort((a, b) => b.metrics.completionRate - a.metrics.completionRate)
                                        .map((pitak, index) => {
                                            const badgeColor = getProductivityBadgeColor(pitak.metrics.completionRate);
                                            return (
                                                <tr key={index} className="hover:bg-gray-50"
                                                    style={{ borderBottom: '1px solid var(--border-color)' }}
                                                >
                                                    <td className="py-3 px-4 text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {pitak.bukidName}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="px-2 py-1 rounded-full text-xs font-medium"
                                                            style={{
                                                                background: pitak.status === 'active' ? 'var(--accent-green-light)' :
                                                                    pitak.status === 'completed' ? 'var(--accent-gold-light)' : 'var(--accent-gray-light)',
                                                                color: pitak.status === 'active' ? 'var(--accent-green)' :
                                                                    pitak.status === 'completed' ? 'var(--accent-gold)' : 'var(--accent-gray)'
                                                            }}
                                                        >
                                                            {pitak.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                            {formatNumber(pitak.totalLuwang)}
                                                        </div>
                                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                            {pitak.metrics.completedLuwang} completed
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center">
                                                            <div className="w-16 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${pitak.metrics.completionRate}%`,
                                                                        background: badgeColor.text
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm font-medium" style={{ color: badgeColor.text }}>
                                                                {formatPercentage(pitak.metrics.completionRate)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center">
                                                            <div className="w-16 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                                <div
                                                                    className="h-full rounded-full"
                                                                    style={{
                                                                        width: `${pitak.metrics.utilization}%`,
                                                                        background: 'var(--accent-sky)'
                                                                    }}
                                                                ></div>
                                                            </div>
                                                            <span className="text-sm font-medium" style={{ color: 'var(--accent-sky)' }}>
                                                                {formatPercentage(pitak.metrics.utilization)}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <button
                                                            onClick={() => handleViewPitakDetails(pitak.pitakId)}
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

                    {/* Top Performers */}
                    {overviewData.topPerformers.length > 0 && (
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Award className="w-5 h-5" />
                                Top Performing Pitaks
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {overviewData.topPerformers.slice(0, 3).map((performer, index) => (
                                    <div key={index} className="p-4 rounded-lg"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
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
                                                        {performer.location}
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        Score: {performer.score.toFixed(1)}
                                                    </div>
                                                </div>
                                            </div>
                                            <Sparkles className="w-5 h-5" style={{ color: 'var(--accent-gold)' }} />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Completion</span>
                                                <span className="font-semibold" style={{ color: 'var(--accent-green)' }}>
                                                    {formatPercentage(performer.completionRate)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span style={{ color: 'var(--text-secondary)' }}>Utilization</span>
                                                <span className="font-semibold" style={{ color: 'var(--accent-sky)' }}>
                                                    {formatPercentage(performer.utilization)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && detailsData && (
                <div className="space-y-6">
                    {/* Pitak Info Card */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                                    {detailsData.pitakInfo.location}
                                </h3>
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center">
                                        <Home className="w-4 h-4 mr-1" style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>Bukid:</span>
                                        <span className="font-medium ml-1" style={{ color: 'var(--text-primary)' }}>
                                            {detailsData.pitakInfo.bukid}
                                        </span>
                                    </div>
                                    <div className="flex items-center">
                                        <Layers className="w-4 h-4 mr-1" style={{ color: 'var(--text-secondary)' }} />
                                        <span style={{ color: 'var(--text-secondary)' }}>Total Luwang:</span>
                                        <span className="font-medium ml-1" style={{ color: 'var(--accent-gold)' }}>
                                            {formatNumber(detailsData.pitakInfo.totalLuwang)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-full text-sm font-medium"
                                style={{
                                    background: detailsData.pitakInfo.status === 'active' ? 'var(--accent-green-light)' :
                                        detailsData.pitakInfo.status === 'completed' ? 'var(--accent-gold-light)' : 'var(--accent-gray-light)',
                                    color: detailsData.pitakInfo.status === 'active' ? 'var(--accent-green)' :
                                        detailsData.pitakInfo.status === 'completed' ? 'var(--accent-gold)' : 'var(--accent-gray)'
                                }}
                            >
                                {detailsData.pitakInfo.status}
                            </span>
                        </div>

                        {/* Productivity Metrics */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {detailsData.productivity.assignments.totalAssignments}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Assignments</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
                                    {formatPercentage(detailsData.productivity.assignments.completionRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Completion Rate</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                    {formatNumber(detailsData.productivity.assignments.luwangProductivity.total)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Luwang</div>
                            </div>
                            <div className="p-4 rounded-lg text-center"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-sky)' }}>
                                    {formatPercentage(detailsData.productivity.assignments.luwangProductivity.completionRate)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Luwang Completion</div>
                            </div>
                        </div>

                        {/* KPIs */}
                        <div>
                            <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Key Performance Indicators</h4>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                {Object.entries(detailsData.productivity.kpis).map(([key, value]) => (
                                    <div key={key} className="p-3 rounded-lg text-center"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="text-xs mb-1 capitalize" style={{ color: 'var(--text-secondary)' }}>
                                            {key.replace(/([A-Z])/g, ' $1').trim()}
                                        </div>
                                        <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                            {typeof value === 'number' ? formatPercentage(value) : value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Recommendations */}
                    {detailsData.recommendations.length > 0 && (
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Target className="w-5 h-5" />
                                Recommendations
                            </h3>
                            <div className="space-y-3">
                                {detailsData.recommendations.map((rec, index) => (
                                    <div key={index} className="p-4 rounded-lg flex items-start gap-3"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="px-2 py-1 rounded text-xs font-medium mt-1"
                                            style={{
                                                background: rec.priority === 'high' ? 'var(--accent-red-light)' :
                                                    rec.priority === 'medium' ? 'var(--accent-yellow-light)' : 'var(--accent-green-light)',
                                                color: rec.priority === 'high' ? 'var(--accent-red)' :
                                                    rec.priority === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)'
                                            }}
                                        >
                                            {rec.priority}
                                        </div>
                                        <div className="flex-1">
                                            <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                                                {rec.area}
                                            </div>
                                            <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                                {rec.recommendation}
                                            </p>
                                            <div className="text-xs" style={{ color: 'var(--accent-gold)' }}>
                                                Target: {rec.target}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Timeline Tab */}
            {activeTab === 'timeline' && timelineData && (
                <div className="p-5 rounded-xl"
                    style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <LineChart className="w-5 h-5" />
                            Production Timeline
                        </h3>
                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Trend: <span style={{
                                color: timelineData.trendAnalysis.overallTrend > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                            }}>
                                {timelineData.trendAnalysis.trendType}
                            </span>
                        </div>
                    </div>

                    {/* Trend Analysis Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="p-4 rounded-lg text-center"
                            style={{ background: 'var(--card-secondary-bg)' }}
                        >
                            <div className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                {timelineData.summary.averageLuwangPerPeriod.toFixed(1)}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Luwang/Period</div>
                        </div>
                        <div className="p-4 rounded-lg text-center"
                            style={{ background: 'var(--card-secondary-bg)' }}
                        >
                            <div className="text-xl font-bold mb-1"
                                style={{
                                    color: timelineData.trendAnalysis.overallTrend > 0 ? 'var(--accent-green)' : 'var(--accent-red)'
                                }}
                            >
                                {timelineData.trendAnalysis.overallTrend > 0 ? '+' : ''}{timelineData.trendAnalysis.overallTrend.toFixed(1)}%
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Overall Trend</div>
                        </div>
                        <div className="p-4 rounded-lg text-center"
                            style={{ background: 'var(--card-secondary-bg)' }}
                        >
                            <div className="text-xl font-bold mb-1" style={{ color: 'var(--accent-sky)' }}>
                                {timelineData.trendAnalysis.consistency}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Consistency</div>
                        </div>
                        <div className="p-4 rounded-lg text-center"
                            style={{ background: 'var(--card-secondary-bg)' }}
                        >
                            <div className="text-xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                {timelineData.summary.trendDirection}
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Direction</div>
                        </div>
                    </div>

                    {/* Timeline Data */}
                    <div className="space-y-4">
                        {timelineData.timeline.map((period, index) => (
                            <div key={index} className="p-4 rounded-lg"
                                style={{ background: 'var(--card-secondary-bg)' }}
                            >
                                <div className="flex justify-between items-center mb-3">
                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {period.period}
                                    </div>
                                    <div className="font-semibold" style={{ color: 'var(--accent-gold)' }}>
                                        {formatNumber(period.metrics.totalLuwang)} luwang
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Assignments</div>
                                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {period.metrics.assignmentCount}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completion Rate</div>
                                        <div className="font-medium" style={{ color: 'var(--accent-green)' }}>
                                            {formatPercentage(period.metrics.completionRate)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg. Luwang</div>
                                        <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {period.metrics.avgLuwangPerAssignment.toFixed(1)}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Productivity</div>
                                        <div className="font-medium" style={{ color: 'var(--accent-sky)' }}>
                                            {period.metrics.productivityIndex.toFixed(1)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Workers Tab */}
            {activeTab === 'workers' && workerProductivityData && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Worker List */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Users className="w-5 h-5" />
                                Worker Productivity
                            </h3>
                            <div className="space-y-3">
                                {workerProductivityData.workers
                                    .sort((a, b) => b.productivityScore - a.productivityScore)
                                    .map((worker, index) => (
                                        <div key={index} className="p-4 rounded-lg"
                                            style={{ background: 'var(--card-secondary-bg)' }}
                                        >
                                            <div className="flex justify-between items-center mb-3">
                                                <div>
                                                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                                        {worker.workerName}
                                                    </div>
                                                    <div className="text-xs flex items-center gap-2 mt-1">
                                                        <span className="px-2 py-0.5 rounded-full"
                                                            style={{
                                                                background: worker.workerStatus === 'active' ? 'var(--accent-green-light)' :
                                                                    'var(--accent-gray-light)',
                                                                color: worker.workerStatus === 'active' ? 'var(--accent-green)' :
                                                                    'var(--accent-gray)'
                                                            }}
                                                        >
                                                            {worker.workerStatus}
                                                        </span>
                                                        <span style={{ color: 'var(--text-secondary)' }}>
                                                            {worker.timeline.daysActive} days active
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold text-lg" style={{ color: 'var(--accent-gold)' }}>
                                                        {worker.productivityScore.toFixed(1)}
                                                    </div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Score</div>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Assignments</div>
                                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                        {worker.assignments.total} ({worker.assignments.completed} done)
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Completion Rate</div>
                                                    <div className="font-medium" style={{ color: 'var(--accent-green)' }}>
                                                        {formatPercentage(worker.assignments.completionRate)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Luwang</div>
                                                    <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                        {formatNumber(worker.luwang.total)}
                                                    </div>
                                                </div>
                                                <div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Avg/Assignment</div>
                                                    <div className="font-medium" style={{ color: 'var(--accent-sky)' }}>
                                                        {worker.luwang.avgPerAssignment.toFixed(1)}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Summary and Benchmarks */}
                        <div className="space-y-6">
                            <div className="p-5 rounded-xl"
                                style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                    Productivity Summary
                                </h3>
                                <div className="grid grid-cols-2 gap-4 mb-6">
                                    <div className="p-4 rounded-lg text-center"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                            {workerProductivityData.summary.totalWorkers}
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Workers</div>
                                    </div>
                                    <div className="p-4 rounded-lg text-center"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-green)' }}>
                                            {formatPercentage(workerProductivityData.summary.averageCompletionRate)}
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Completion</div>
                                    </div>
                                    <div className="p-4 rounded-lg text-center"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                                            {formatNumber(workerProductivityData.summary.averageLuwangPerWorker)}
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Luwang/Worker</div>
                                    </div>
                                    <div className="p-4 rounded-lg text-center"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--accent-gold)' }}>
                                            {workerProductivityData.summary.efficiencyDistribution.averageScore.toFixed(1)}
                                        </div>
                                        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Avg. Score</div>
                                    </div>
                                </div>
                                <div>
                                    <h4 className="font-medium mb-3" style={{ color: 'var(--text-primary)' }}>Top Performer</h4>
                                    <div className="p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                        <div className="font-medium text-center text-lg" style={{ color: 'var(--accent-gold)' }}>
                                            {workerProductivityData.summary.topPerformer}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-5 rounded-xl"
                                style={{
                                    background: 'var(--card-bg)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                    Efficiency Benchmarks
                                </h3>
                                <div className="space-y-3">
                                    {Object.entries(workerProductivityData.benchmarks).map(([level, score]) => (
                                        <div key={level} className="flex justify-between items-center p-3 rounded-lg capitalize"
                                            style={{ background: 'var(--card-secondary-bg)' }}
                                        >
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 rounded-full mr-2"
                                                    style={{
                                                        background: level === 'highEfficiency' ? 'var(--accent-green)' :
                                                            level === 'mediumEfficiency' ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                    }}
                                                ></div>
                                                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    {level.replace('Efficiency', ' Efficiency')}
                                                </span>
                                            </div>
                                            <div className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                                                {score}+ score
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Efficiency Tab */}
            {activeTab === 'efficiency' && efficiencyData && (
                <div className="space-y-6">
                    {/* Efficiency Score Card */}
                    <div className="p-5 rounded-xl text-center"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="inline-block relative">
                            <div className="w-48 h-48 rounded-full flex items-center justify-center mx-auto"
                                style={{
                                    background: `conic-gradient(${getEfficiencyLevel(efficiencyData.score).color} ${efficiencyData.score}%, var(--card-bg) 0)`
                                }}
                            >
                                <div className="w-40 h-40 rounded-full flex flex-col items-center justify-center"
                                    style={{ background: 'var(--card-secondary-bg)' }}
                                >
                                    <div className="text-4xl font-bold mb-1" style={{ color: getEfficiencyLevel(efficiencyData.score).color }}>
                                        {efficiencyData.score.toFixed(1)}
                                    </div>
                                    <div className="text-sm font-medium" style={{ color: getEfficiencyLevel(efficiencyData.score).color }}>
                                        {getEfficiencyLevel(efficiencyData.score).label} Efficiency
                                    </div>
                                    <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                                        Percentile: {efficiencyData.benchmarks.percentile}%
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-0 right-0 px-3 py-1 rounded-full text-sm font-medium"
                                style={{
                                    background: efficiencyData.benchmarks.percentile >= 75 ? 'var(--accent-green-light)' :
                                        efficiencyData.benchmarks.percentile >= 50 ? 'var(--accent-yellow-light)' : 'var(--accent-red-light)',
                                    color: efficiencyData.benchmarks.percentile >= 75 ? 'var(--accent-green)' :
                                        efficiencyData.benchmarks.percentile >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                }}
                            >
                                Top {100 - efficiencyData.benchmarks.percentile}%
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Efficiency Metrics */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                Efficiency Breakdown
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(efficiencyData.efficiencyMetrics).map(([metric, value]) => (
                                    <div key={metric}>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="capitalize" style={{ color: 'var(--text-secondary)' }}>
                                                {metric.replace(/([A-Z])/g, ' $1').trim()}
                                            </span>
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {formatPercentage(value)}
                                            </span>
                                        </div>
                                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                            <div
                                                className="h-full rounded-full"
                                                style={{
                                                    width: `${value}%`,
                                                    background: value >= 80 ? 'var(--accent-green)' :
                                                        value >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                }}
                                            ></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Benchmarks */}
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                Performance Benchmarks
                            </h3>
                            <div className="space-y-4">
                                {Object.entries(efficiencyData.benchmarks).map(([benchmark, value]) => (
                                    <div key={benchmark} className="flex justify-between items-center p-3 rounded-lg"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="capitalize" style={{ color: 'var(--text-secondary)' }}>
                                            {benchmark === 'current' ? 'Your Score' : benchmark}
                                        </div>
                                        <div className="font-semibold"
                                            style={{
                                                color: benchmark === 'current' ? getEfficiencyLevel(value).color : 'var(--text-primary)'
                                            }}
                                        >
                                            {typeof value === 'number' ? value.toFixed(1) : value}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Insights and Recommendations */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Sparkles className="w-5 h-5" />
                                Insights
                            </h3>
                            <div className="space-y-3">
                                {efficiencyData.insights.map((insight, index) => (
                                    <div key={index} className="p-4 rounded-lg"
                                        style={{
                                            background: insight.type === 'positive' ? 'var(--accent-green-light)' :
                                                insight.type === 'warning' ? 'var(--accent-yellow-light)' : 'var(--accent-red-light)',
                                            border: `1px solid ${insight.type === 'positive' ? 'var(--accent-green)20' :
                                                insight.type === 'warning' ? 'var(--accent-yellow)20' : 'var(--accent-red)20'}`
                                        }}
                                    >
                                        <div className="font-medium text-sm mb-2" style={{
                                            color: insight.type === 'positive' ? 'var(--accent-green-dark)' :
                                                insight.type === 'warning' ? 'var(--accent-yellow-dark)' : 'var(--accent-red-dark)'
                                        }}>
                                            {insight.type === 'positive' ? '✅ Strength' :
                                                insight.type === 'warning' ? '⚠️ Area for Improvement' : '❌ Critical Issue'}
                                        </div>
                                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            {insight.message}
                                        </p>
                                        <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            Suggestion: {insight.suggestion}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <Target className="w-5 h-5" />
                                Action Plan
                            </h3>
                            <div className="space-y-3">
                                {efficiencyData.recommendations.map((rec, index) => (
                                    <div key={index} className="p-4 rounded-lg"
                                        style={{ background: 'var(--card-secondary-bg)' }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="px-2 py-1 rounded text-xs font-medium"
                                                style={{
                                                    background: rec.priority === 'high' ? 'var(--accent-red-light)' :
                                                        rec.priority === 'medium' ? 'var(--accent-yellow-light)' : 'var(--accent-green-light)',
                                                    color: rec.priority === 'high' ? 'var(--accent-red)' :
                                                        rec.priority === 'medium' ? 'var(--accent-yellow)' : 'var(--accent-green)'
                                                }}
                                            >
                                                {rec.priority} priority
                                            </div>
                                            <Clock className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                        </div>
                                        <div className="font-medium text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                                            {rec.action}
                                        </div>
                                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            {rec.details}
                                        </p>
                                        <div className="text-xs" style={{ color: 'var(--accent-gold)' }}>
                                            Expected impact: {rec.expectedImpact}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Comparison Tab */}
            {activeTab === 'comparison' && comparisonData && (
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
                                Filter by Productivity:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {productivityFilters.map((filter) => (
                                    <button
                                        key={filter.value}
                                        onClick={() => setProductivityScoreFilter(filter.value)}
                                        className={`px-3 py-1 rounded-full text-sm transition-all duration-200 ${productivityScoreFilter === filter.value ? 'font-medium' : 'opacity-80 hover:opacity-100'}`}
                                        style={{
                                            background: productivityScoreFilter === filter.value ? 'var(--primary-color)' : 'var(--card-secondary-bg)',
                                            color: productivityScoreFilter === filter.value ? 'var(--sidebar-text)' : 'var(--text-secondary)'
                                        }}
                                    >
                                        {filter.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Summary Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-3xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                    {comparisonData.summary.averageScore.toFixed(1)}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Average Overall Score</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-green)' }}>
                                    {comparisonData.summary.bestPerformer?.location || 'N/A'}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Best Performer</div>
                            </div>
                        </div>
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <div className="text-center">
                                <div className="text-2xl font-bold mb-2" style={{ color: 'var(--accent-red)' }}>
                                    {comparisonData.summary.worstPerformer?.location || 'N/A'}
                                </div>
                                <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Needs Improvement</div>
                            </div>
                        </div>
                    </div>

                    {/* Comparison Table */}
                    <div className="p-5 rounded-xl"
                        style={{
                            background: 'var(--card-bg)',
                            border: '1px solid var(--border-color)'
                        }}
                    >
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <TrendingUp className="w-5 h-5" />
                                Pitak Comparison
                            </h3>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Consistency: <span className="font-medium" style={{ color: 'var(--accent-green)' }}>
                                    {comparisonData.summary.consistency.rating}
                                </span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr style={{ borderBottom: '1px solid var(--border-color)' }}>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Rank</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Pitak</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Overall Score</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Productivity</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Efficiency</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Financial</th>
                                        <th className="text-left py-3 px-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Percentile</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonData.pitaks
                                        .sort((a, b) => b.scores.overall - a.scores.overall)
                                        .map((pitak, index) => (
                                            <tr key={index} className="hover:bg-gray-50 cursor-pointer"
                                                onClick={() => handleViewPitakDetails(pitak.pitakId)}
                                                style={{ borderBottom: '1px solid var(--border-color)' }}
                                            >
                                                <td className="py-3 px-4">
                                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold"
                                                        style={{
                                                            background: index === 0 ? 'var(--accent-gold-light)' :
                                                                index === 1 ? 'var(--accent-silver-light)' :
                                                                    index === 2 ? 'var(--accent-bronze-light)' : 'var(--card-bg)',
                                                            color: index === 0 ? 'var(--accent-gold)' :
                                                                index === 1 ? 'var(--accent-silver)' :
                                                                    index === 2 ? 'var(--accent-bronze)' : 'var(--text-secondary)'
                                                        }}
                                                    >
                                                        #{index + 1}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="text-2xl font-bold" style={{ color: 'var(--accent-gold)' }}>
                                                        {pitak.scores.overall.toFixed(1)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center">
                                                        <div className="w-16 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${pitak.scores.productivity}%`,
                                                                    background: 'var(--accent-green)'
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium" style={{ color: 'var(--accent-green)' }}>
                                                            {pitak.scores.productivity.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center">
                                                        <div className="w-16 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${pitak.scores.efficiency}%`,
                                                                    background: 'var(--accent-sky)'
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium" style={{ color: 'var(--accent-sky)' }}>
                                                            {pitak.scores.efficiency.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center">
                                                        <div className="w-16 h-2 rounded-full mr-2 overflow-hidden" style={{ background: 'var(--card-bg)' }}>
                                                            <div
                                                                className="h-full rounded-full"
                                                                style={{
                                                                    width: `${pitak.scores.financial}%`,
                                                                    background: 'var(--accent-purple)'
                                                                }}
                                                            ></div>
                                                        </div>
                                                        <span className="text-sm font-medium" style={{ color: 'var(--accent-purple)' }}>
                                                            {pitak.scores.financial.toFixed(1)}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold text-center"
                                                        style={{
                                                            color: pitak.rankings.percentile >= 75 ? 'var(--accent-green)' :
                                                                pitak.rankings.percentile >= 50 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                        }}
                                                    >
                                                        {pitak.rankings.percentile}%
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Insights */}
                    {comparisonData.insights.length > 0 && (
                        <div className="p-5 rounded-xl"
                            style={{
                                background: 'var(--card-bg)',
                                border: '1px solid var(--border-color)'
                            }}
                        >
                            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                                Key Insights
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {comparisonData.insights.map((insight, index) => (
                                    <div key={index} className="p-4 rounded-lg"
                                        style={{
                                            background: insight.type === 'positive' ? 'var(--accent-green-light)' :
                                                insight.type === 'neutral' ? 'var(--accent-sky-light)' : 'var(--accent-yellow-light)',
                                            border: `1px solid ${insight.type === 'positive' ? 'var(--accent-green)20' :
                                                insight.type === 'neutral' ? 'var(--accent-sky)20' : 'var(--accent-yellow)20'}`
                                        }}
                                    >
                                        <div className="font-medium text-sm mb-2" style={{
                                            color: insight.type === 'positive' ? 'var(--accent-green-dark)' :
                                                insight.type === 'neutral' ? 'var(--accent-sky-dark)' : 'var(--accent-yellow-dark)'
                                        }}>
                                            {insight.type === 'positive' ? '📈 Strength' :
                                                insight.type === 'neutral' ? '📊 Observation' : '⚠️ Warning'}
                                        </div>
                                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                            {insight.message}
                                        </p>
                                        {insight.highlight && (
                                            <div className="font-semibold text-sm mt-2" style={{ color: 'var(--accent-gold)' }}>
                                                {insight.highlight}
                                            </div>
                                        )}
                                        {insight.suggestion && (
                                            <div className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                                                Suggestion: {insight.suggestion}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* No Data Message for Detail Tabs */}
            {((activeTab === 'details' || activeTab === 'timeline' || activeTab === 'workers' || activeTab === 'efficiency') && !selectedPitak) && (
                <div className="text-center p-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
                        style={{ background: 'var(--card-secondary-bg)', color: 'var(--text-secondary)' }}>
                        <Eye className="w-8 h-8" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                        Select a Pitak to Analyze
                    </h3>
                    <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                        Choose a pitak from the dropdown above to view detailed productivity metrics, timeline, worker performance, and efficiency analysis.
                    </p>
                </div>
            )}
        </div>
    );
};

export default PitakProductivityPage;