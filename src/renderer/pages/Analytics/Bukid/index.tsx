// components/BukidAnalyticsPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    BarChart3,
    PieChart,
    TrendingUp,
    DollarSign,
    Users,
    MapPin,
    Calendar,
    Filter,
    Download,
    RefreshCw,
    ChevronRight,
    TrendingDown,
    Activity,
    Layers,
    Wallet,
    Award,
    Clock,
    AlertCircle,
    Building,
    Crop,
    Coins,
    Percent,
    ArrowUp,
    ArrowDown,
    Eye,
    Package,
    GitCompare,
} from 'lucide-react';
import { bukidAPI, type BukidAnalyticsParams, type BukidDetailsData, type BukidFinancialSummaryData, type BukidOverviewData, type BukidProductionTrendData, type BukidWorkerDistributionData, type CompareBukidsData } from '../../../apis/analytics/bukid';
import { formatCurrency, formatDate, formatNumber, formatPercentage } from '../../../utils/formatters';

interface BukidAnalyticsPageProps {
    bukidId?: string | number;
}

const BukidAnalyticsPage: React.FC<BukidAnalyticsPageProps> = ({ bukidId: propBukidId }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryParams = new URLSearchParams(location.search);
    
    // State management
    const [selectedBukidId, setSelectedBukidId] = useState<string | number | undefined>(
        propBukidId || queryParams.get('bukidId') || undefined
    );
    const [selectedBukidIds, setSelectedBukidIds] = useState<(string | number)[]>([]);
    const [timeRange, setTimeRange] = useState<string>('last30days');
    const [comparisonMode, setComparisonMode] = useState<boolean>(false);
    const [activeTab, setActiveTab] = useState<string>('overview');
    
    // Data states
    const [overviewData, setOverviewData] = useState<BukidOverviewData | null>(null);
    const [detailsData, setDetailsData] = useState<BukidDetailsData | null>(null);
    const [productionTrendData, setProductionTrendData] = useState<BukidProductionTrendData | null>(null);
    const [workerDistributionData, setWorkerDistributionData] = useState<BukidWorkerDistributionData | null>(null);
    const [financialSummaryData, setFinancialSummaryData] = useState<BukidFinancialSummaryData | null>(null);
    const [compareData, setCompareData] = useState<CompareBukidsData | null>(null);
    
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [allBukids, setAllBukids] = useState<Array<{ id: string | number; name: string }>>([]);

    // Fetch all bukids for dropdown
    useEffect(() => {
        fetchAllBukids();
    }, []);

    // Fetch data when parameters change
    useEffect(() => {
        if (comparisonMode && selectedBukidIds.length > 0) {
            fetchComparisonData();
        } else if (selectedBukidId) {
            fetchBukidData();
        } else {
            fetchOverviewData();
        }
    }, [selectedBukidId, selectedBukidIds, timeRange, comparisonMode, activeTab]);

    const fetchAllBukids = async () => {
        try {
            // This would be replaced with actual API call to get all bukids
            // For now, we'll simulate with mock data
            setAllBukids([
                { id: 1, name: 'Bukid Main Farm' },
                { id: 2, name: 'Bukid North Field' },
                { id: 3, name: 'Bukid South Estate' },
                { id: 4, name: 'Bukid Riverside' }
            ]);
        } catch (err) {
            console.error('Failed to fetch bukids:', err);
        }
    };

    const buildParams = (): BukidAnalyticsParams => {
        const params: BukidAnalyticsParams = {
            timeRange,
            interval: timeRange === 'last7days' ? 'daily' : 
                     timeRange === 'last30days' ? 'daily' : 
                     timeRange === 'last90days' ? 'weekly' : 'monthly'
        };

        if (comparisonMode && selectedBukidIds.length > 0) {
            params.bukidIds = selectedBukidIds;
        } else if (selectedBukidId) {
            params.bukidId = selectedBukidId;
        }

        return params;
    };

    const fetchOverviewData = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = buildParams();
            const response = await bukidAPI.getBukidOverview(params);
            
            if (response.status) {
                setOverviewData(response.data);
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch overview data');
            console.error('Fetch overview error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchBukidData = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = buildParams();

            // Fetch data based on active tab
            switch (activeTab) {
                case 'overview':
                    const detailsResponse = await bukidAPI.getBukidDetails(params);
                    if (detailsResponse.status) {
                        setDetailsData(detailsResponse.data);
                    }
                    break;
                case 'production':
                    const productionResponse = await bukidAPI.getBukidProductionTrend(params);
                    if (productionResponse.status) {
                        setProductionTrendData(productionResponse.data);
                    }
                    break;
                case 'workers':
                    const workerResponse = await bukidAPI.getBukidWorkerDistribution(params);
                    if (workerResponse.status) {
                        setWorkerDistributionData(workerResponse.data);
                    }
                    break;
                case 'financial':
                    const financialResponse = await bukidAPI.getBukidFinancialSummary(params);
                    if (financialResponse.status) {
                        setFinancialSummaryData(financialResponse.data);
                    }
                    break;
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch bukid data');
            console.error('Fetch bukid data error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchComparisonData = async () => {
        try {
            setLoading(true);
            setError(null);
            const params = buildParams();
            const response = await bukidAPI.compareBukids(params);
            
            if (response.status) {
                setCompareData(response.data);
            } else {
                throw new Error(response.message);
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch comparison data');
            console.error('Fetch comparison error:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        if (comparisonMode && selectedBukidIds.length > 0) {
            fetchComparisonData();
        } else if (selectedBukidId) {
            fetchBukidData();
        } else {
            fetchOverviewData();
        }
    };

    const handleTimeRangeChange = (range: string) => {
        setTimeRange(range);
    };

    const handleBukidSelect = (id: string | number) => {
        setSelectedBukidId(id);
        setSelectedBukidIds([]);
        setComparisonMode(false);
    };

    const handleComparisonToggle = (bukidId: string | number) => {
        if (selectedBukidIds.includes(bukidId)) {
            setSelectedBukidIds(selectedBukidIds.filter(id => id !== bukidId));
        } else {
            setSelectedBukidIds([...selectedBukidIds, bukidId]);
        }
    };

    const toggleComparisonMode = () => {
        if (!comparisonMode) {
            if (selectedBukidId) {
                setSelectedBukidIds([selectedBukidId]);
            }
        }
        setComparisonMode(!comparisonMode);
        setActiveTab('overview');
    };

    const navigateToBukid = (id: string | number) => {
        navigate(`/bukids/view/${id}`);
    };

    const navigateToAssignment = (assignmentId: string) => {
        navigate(`/assignments/view/${assignmentId}`);
    };

    const navigateToWorker = (workerId: string) => {
        navigate(`/workers/view/${workerId}`);
    };

    const navigateToPayment = (paymentId: string) => {
        navigate(`/payments/view/${paymentId}`);
    };

    // Time range options
    const timeRangeOptions = [
        { value: 'last7days', label: 'Last 7 Days' },
        { value: 'last30days', label: 'Last 30 Days' },
        { value: 'last90days', label: 'Last 90 Days' },
        { value: 'thisYear', label: 'This Year' },
        { value: 'lastYear', label: 'Last Year' },
        { value: 'allTime', label: 'All Time' }
    ];

    // Tabs for single bukid view
    const singleBukidTabs = [
        { id: 'overview', label: 'Overview', icon: Activity },
        { id: 'production', label: 'Production', icon: TrendingUp },
        { id: 'workers', label: 'Workers', icon: Users },
        { id: 'financial', label: 'Financial', icon: DollarSign }
    ];

    // Render loading state
    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-3" 
                         style={{ borderColor: 'var(--primary-color)' }}></div>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Loading bukid analytics...
                    </p>
                </div>
            </div>
        );
    }

    // Render error state
    if (error) {
        return (
            <div className="text-center p-8">
                <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--danger-color)' }} />
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--danger-color)' }}>
                    Error Loading Analytics
                </p>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button
                    onClick={handleRefresh}
                    className="windows-btn windows-btn-primary px-4 py-2 text-sm font-medium"
                >
                    <RefreshCw className="w-4 h-4 inline mr-1" />
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                        {comparisonMode ? 'Compare Bukids' : 'Bukid Analytics'}
                    </h1>
                    <p className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>
                        {comparisonMode 
                            ? `Comparing ${selectedBukidIds.length} bukid${selectedBukidIds.length > 1 ? 's' : ''}`
                            : selectedBukidId 
                                ? `Analytics for ${detailsData?.bukidInfo.name || 'selected bukid'}`
                                : 'Overall bukid analytics overview'}
                    </p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                    {/* Time Range Selector */}
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        <select
                            value={timeRange}
                            onChange={(e) => handleTimeRangeChange(e.target.value)}
                            className="windows-select text-sm"
                        >
                            {timeRangeOptions.map(option => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Bukid Selector */}
                    <div className="flex items-center gap-2">
                        <Building className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                        <select
                            value={selectedBukidId || ''}
                            onChange={(e) => handleBukidSelect(e.target.value)}
                            className="windows-select text-sm"
                            disabled={comparisonMode}
                        >
                            <option value="">All Bukids</option>
                            {allBukids.map(bukid => (
                                <option key={bukid.id} value={bukid.id}>
                                    {bukid.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Comparison Mode Toggle */}
                    <button
                        onClick={toggleComparisonMode}
                        className={`windows-btn flex items-center gap-2 ${comparisonMode ? 'windows-btn-primary' : 'windows-btn-secondary'}`}
                    >
                        <GitCompare className="w-4 h-4" />
                        {comparisonMode ? 'Exit Comparison' : 'Compare Bukids'}
                    </button>

                    {/* Refresh Button */}
                    <button
                        onClick={handleRefresh}
                        className="windows-btn windows-btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Comparison Mode - Bukid Selection */}
            {comparisonMode && (
                <div className="windows-card p-5 mb-6">
                    <h3 className="text-lg font-semibold mb-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                        Select Bukids to Compare
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {allBukids.map(bukid => (
                            <div
                                key={bukid.id}
                                onClick={() => handleComparisonToggle(bukid.id)}
                                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 ${
                                    selectedBukidIds.includes(bukid.id)
                                        ? 'border-2'
                                        : 'border hover:border'
                                }`}
                                style={{
                                    borderColor: selectedBukidIds.includes(bukid.id)
                                        ? 'var(--primary-color)'
                                        : 'var(--border-color)',
                                    background: selectedBukidIds.includes(bukid.id)
                                        ? 'var(--primary-light)'
                                        : 'var(--card-bg)'
                                }}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Building className="w-5 h-5" style={{ color: 'var(--accent-earth)' }} />
                                    {selectedBukidIds.includes(bukid.id) && (
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                                             style={{ background: 'var(--primary-color)', color: 'white' }}>
                                            ✓
                                        </div>
                                    )}
                                </div>
                                <h4 className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                    {bukid.name}
                                </h4>
                                <p className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                    Click to {selectedBukidIds.includes(bukid.id) ? 'remove' : 'add'}
                                </p>
                            </div>
                        ))}
                    </div>
                    {selectedBukidIds.length > 0 && (
                        <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                            <p className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>
                                Selected {selectedBukidIds.length} bukid{selectedBukidIds.length > 1 ? 's' : ''} for comparison
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Tabs for Single Bukid View */}
            {!comparisonMode && selectedBukidId && (
                <div className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex space-x-1">
                        {singleBukidTabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 text-sm font-medium rounded-t-lg flex items-center gap-2 ${
                                        activeTab === tab.id
                                            ? 'border-b-2'
                                            : 'hover:bg-gray-50'
                                    }`}
                                    style={{
                                        borderColor: activeTab === tab.id ? 'var(--primary-color)' : 'transparent',
                                        color: activeTab === tab.id ? 'var(--primary-color)' : 'var(--text-secondary)',
                                        background: activeTab === tab.id ? 'var(--card-bg)' : 'transparent'
                                    }}
                                >
                                    <Icon className="w-4 h-4" />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="space-y-6">
                {/* Overview Tab or All Bukids View */}
                {(activeTab === 'overview' || !selectedBukidId) && !comparisonMode && (
                    <div className="space-y-6">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {/* Total Bukids */}
                            <div className="windows-card p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--accent-earth-light)' }}>
                                        <Building className="w-6 h-6" style={{ color: 'var(--accent-earth)' }} />
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium"
                                          style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}>
                                        +12.5%
                                    </span>
                                </div>
                                <h3 className="text-3xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                    {overviewData?.summary.totalBukids || 0}
                                </h3>
                                <p className="text-sm mb-4 windows-text" style={{ color: 'var(--text-secondary)' }}>
                                    Total Bukids
                                </p>
                                <div className="flex justify-between text-xs">
                                    <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>
                                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--accent-green)' }}></span>
                                        Active: {overviewData?.summary.activeBukids || 0}
                                    </span>
                                    <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>
                                        <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: 'var(--accent-gray)' }}></span>
                                        Inactive: {overviewData?.summary.inactiveBukids || 0}
                                    </span>
                                </div>
                            </div>

                            {/* Total Luwang */}
                            <div className="windows-card p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--accent-gold-light)' }}>
                                        <Crop className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium"
                                          style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}>
                                        +8.3%
                                    </span>
                                </div>
                                <h3 className="text-3xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                    {formatNumber(overviewData?.production.reduce((sum, p) => sum + p.totalLuwang, 0) || 0)}
                                </h3>
                                <p className="text-sm mb-4 windows-text" style={{ color: 'var(--text-secondary)' }}>
                                    Total Luwang Produced
                                </p>
                                <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                    Average per bukid: {formatNumber(
                                        overviewData?.production?.reduce((sum, p) => sum + p.totalLuwang, 0) / 
                                        (overviewData?.production.length || 1) || 0
                                    )}
                                </div>
                            </div>

                            {/* Total Pitaks */}
                            <div className="windows-card p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="p-3 rounded-lg" style={{ background: 'var(--accent-green-light)' }}>
                                        <Layers className="w-6 h-6" style={{ color: 'var(--accent-green)' }} />
                                    </div>
                                    <span className="px-3 py-1 rounded-full text-xs font-medium"
                                          style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}>
                                        +5.2%
                                    </span>
                                </div>
                                <h3 className="text-3xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                    {formatNumber(overviewData?.distribution.reduce((sum, d) => sum + d.pitakCount, 0) || 0)}
                                </h3>
                                <p className="text-sm mb-4 windows-text" style={{ color: 'var(--text-secondary)' }}>
                                    Total Pitaks
                                </p>
                                <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                    Average per bukid: {formatNumber(
                                        overviewData?.distribution.reduce((sum, d) => sum + d.pitakCount, 0) / 
                                        (overviewData?.distribution.length || 1) || 0
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Production Distribution */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <div className="windows-card p-5">
                                <h3 className="text-lg font-semibold mb-4 windows-title flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <PieChart className="w-5 h-5" />
                                    Production Distribution
                                </h3>
                                <div className="space-y-4">
                                    {overviewData?.production.slice(0, 5).map((item, index) => (
                                        <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                                            <div className="flex items-center">
                                                <div className="w-3 h-3 rounded-full mr-3" 
                                                     style={{ background: `hsl(${index * 60}, 70%, 60%)` }}></div>
                                                <span className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                                    {item.bukidName}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                                    {formatNumber(item.totalLuwang)} Luwang
                                                </span>
                                                <button
                                                    onClick={() => navigateToBukid(item.bukidId)}
                                                    className="p-1 rounded hover:bg-gray-100"
                                                    style={{ color: 'var(--primary-color)' }}
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="windows-card p-5">
                                <h3 className="text-lg font-semibold mb-4 windows-title flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <BarChart3 className="w-5 h-5" />
                                    Top Performing Bukids
                                </h3>
                                <div className="space-y-4">
                                    {overviewData?.production
                                        .sort((a, b) => b.totalLuwang - a.totalLuwang)
                                        .slice(0, 5)
                                        .map((item, index) => (
                                            <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                                                <div className="flex items-center">
                                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                                                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                        index === 1 ? 'bg-gray-100 text-gray-800' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' :
                                                        'bg-blue-50 text-blue-800'
                                                    }`}>
                                                        #{index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                                            {item.bukidName}
                                                        </div>
                                                        <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                            ID: {item.bukidId}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold windows-title" style={{ color: 'var(--accent-gold)' }}>
                                                        {formatNumber(item.totalLuwang)} Luwang
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatNumber(item.totalLuwang / 30)} avg/day
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Single Bukid Details */}
                {!comparisonMode && selectedBukidId && detailsData && (
                    <div className="space-y-6">
                        {/* Bukid Information */}
                        <div className="windows-card p-5">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-bold mb-2 windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {detailsData.bukidInfo.name}
                                    </h3>
                                    <div className="flex flex-wrap gap-4">
                                        {detailsData.bukidInfo.location && (
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                    {detailsData.bukidInfo.location}
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                            <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                Created: {formatDate(detailsData.bukidInfo.createdAt)}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                                            <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                Updated: {formatDate(detailsData.bukidInfo.updatedAt)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-4 py-2 rounded-full text-sm font-medium"
                                     style={{ background: 'var(--accent-green-light)', color: 'var(--accent-green)' }}>
                                    Active
                                </div>
                            </div>

                            {/* Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Layers className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
                                    <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {detailsData.summary.totalPitaks}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Pitaks</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Users className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-purple)' }} />
                                    <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {detailsData.summary.totalWorkers}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Workers</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Crop className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-gold)' }} />
                                    <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatNumber(detailsData.summary.totalLuwang)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Luwang</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <DollarSign className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-blue)' }} />
                                    <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(detailsData.summary.totalPayments)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Payments</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Percent className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-red)' }} />
                                    <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatPercentage(detailsData.financials.totalDeductions / detailsData.financials.totalGrossPay * 100)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Deduction Rate</div>
                                </div>
                            </div>

                            {/* Pitaks List */}
                            <div>
                                <h4 className="font-semibold mb-4 windows-title flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <Layers className="w-5 h-5" />
                                    Pitaks ({detailsData.pitaks.length})
                                </h4>
                                <div className="space-y-3">
                                    {detailsData.pitaks.slice(0, 5).map((pitak, index) => (
                                        <div key={pitak.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50">
                                            <div>
                                                <div className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                                    {pitak.location}
                                                </div>
                                                <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                    Status: <span style={{ 
                                                        color: pitak.status === 'active' ? 'var(--accent-green)' :
                                                               pitak.status === 'pending' ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                    }}>{pitak.status}</span>
                                                    • Assignments: {pitak.totalAssignments}
                                                    • Workers: {pitak.workers.length}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold windows-title" style={{ color: 'var(--accent-gold)' }}>
                                                    {formatNumber(pitak.totalLuwang)} Luwang
                                                </div>
                                                <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                    {pitak.activeAssignments} active
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Assignment Statistics */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="windows-card p-5">
                                <h4 className="font-semibold mb-4 windows-title flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <Activity className="w-5 h-5" />
                                    Assignment Statistics
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Total Assignments</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                            {detailsData.assignments.total}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Active</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--accent-green)' }}>
                                            {detailsData.assignments.active}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Completed</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--accent-blue)' }}>
                                            {detailsData.assignments.completed}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Cancelled</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--accent-red)' }}>
                                            {detailsData.assignments.cancelled}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="windows-card p-5">
                                <h4 className="font-semibold mb-4 windows-title flex items-center gap-2"
                                    style={{ color: 'var(--text-primary)' }}>
                                    <Wallet className="w-5 h-5" />
                                    Financial Summary
                                </h4>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Total Gross Pay</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                            {formatCurrency(detailsData.financials.totalGrossPay)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Total Deductions</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--accent-red)' }}>
                                            {formatCurrency(detailsData.financials.totalDeductions)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Total Net Pay</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--accent-green)' }}>
                                            {formatCurrency(detailsData.financials.totalNetPay)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="windows-text" style={{ color: 'var(--text-secondary)' }}>Total Payments</span>
                                        <span className="font-semibold windows-title" style={{ color: 'var(--accent-blue)' }}>
                                            {formatCurrency(detailsData.financials.totalPayments)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Production Tab */}
                {activeTab === 'production' && productionTrendData && (
                    <div className="space-y-6">
                        <div className="windows-card p-5">
                            <h3 className="text-lg font-semibold mb-6 windows-title flex items-center gap-2"
                                style={{ color: 'var(--text-primary)' }}>
                                <TrendingUp className="w-5 h-5" />
                                Production Trend ({productionTrendData.interval})
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Crop className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-gold)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatNumber(productionTrendData.summary.totalLuwang)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Luwang</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Package className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-sky)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {productionTrendData.summary.totalAssignments}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Assignments</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <BarChart3 className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatNumber(productionTrendData.summary.totalPeriods)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Periods Analyzed</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                    Production Timeline
                                </h4>
                                {productionTrendData.trend.slice(0, 10).map((item, index) => (
                                    <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50">
                                        <div className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                            {item.period}
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <div className="font-semibold windows-title" style={{ color: 'var(--accent-gold)' }}>
                                                    {formatNumber(item.totalLuwang)} Luwang
                                                </div>
                                                <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                    {item.assignmentCount} assignments
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold windows-title" style={{ color: 'var(--accent-blue)' }}>
                                                    {formatNumber(item.averageLuwang)} avg
                                                </div>
                                                <div className="text-xs flex items-center"
                                                     style={{ color: index > 0 && item.totalLuwang > productionTrendData.trend[index - 1].totalLuwang 
                                                         ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                                                    {index > 0 ? (
                                                        <>
                                                            {item.totalLuwang > productionTrendData.trend[index - 1].totalLuwang 
                                                                ? <ArrowUp className="w-3 h-3 mr-1" /> 
                                                                : <ArrowDown className="w-3 h-3 mr-1" />}
                                                            {Math.abs(((item.totalLuwang - productionTrendData.trend[index - 1].totalLuwang) / 
                                                                productionTrendData.trend[index - 1].totalLuwang) * 100).toFixed(1)}%
                                                        </>
                                                    ) : '—'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* Workers Tab */}
                {activeTab === 'workers' && workerDistributionData && (
                    <div className="space-y-6">
                        <div className="windows-card p-5">
                            <h3 className="text-lg font-semibold mb-6 windows-title flex items-center gap-2"
                                style={{ color: 'var(--text-primary)' }}>
                                <Users className="w-5 h-5" />
                                Worker Distribution
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Users className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-purple)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {workerDistributionData.summary.totalWorkers}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Workers</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Layers className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {workerDistributionData.summary.totalPitaks}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Pitaks</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <TrendingUp className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-sky)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {workerDistributionData.summary.avgWorkersPerPitak.toFixed(1)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Avg Workers/Pitak</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <MapPin className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-earth)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {workerDistributionData.summary.avgPitaksPerWorker.toFixed(1)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Avg Pitaks/Worker</div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div>
                                    <h4 className="font-semibold mb-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                        Workers per Pitak
                                    </h4>
                                    <div className="space-y-3">
                                        {workerDistributionData.workersPerPitak.slice(0, 5).map((item, index) => (
                                            <div key={item.pitakId} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50">
                                                <div>
                                                    <div className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                                        {item.pitakLocation}
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        Status: <span style={{ 
                                                            color: item.status === 'active' ? 'var(--accent-green)' :
                                                                   item.status === 'pending' ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                        }}>{item.status}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold windows-title" style={{ color: 'var(--accent-purple)' }}>
                                                        {item.workerCount} workers
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        {item.workerNames.slice(0, 2).join(', ')}
                                                        {item.workerNames.length > 2 && ` +${item.workerNames.length - 2}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <h4 className="font-semibold mb-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                        Pitaks per Worker
                                    </h4>
                                    <div className="space-y-3">
                                        {workerDistributionData.pitaksPerWorker.slice(0, 5).map((item, index) => (
                                            <div key={item.workerId} className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50">
                                                <div>
                                                    <div className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                                        {item.workerName}
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        Status: <span style={{ 
                                                            color: item.status === 'active' ? 'var(--accent-green)' :
                                                                   item.status === 'pending' ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                        }}>{item.status}</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-semibold windows-title" style={{ color: 'var(--accent-green)' }}>
                                                        {item.pitakCount} pitaks
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        {item.pitakLocations.slice(0, 2).join(', ')}
                                                        {item.pitakLocations.length > 2 && ` +${item.pitakLocations.length - 2}`}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Financial Tab */}
                {activeTab === 'financial' && financialSummaryData && (
                    <div className="space-y-6">
                        <div className="windows-card p-5">
                            <h3 className="text-lg font-semibold mb-6 windows-title flex items-center gap-2"
                                style={{ color: 'var(--text-primary)' }}>
                                <DollarSign className="w-5 h-5" />
                                Financial Summary
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Wallet className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-blue)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(financialSummaryData.summary.totalGrossPay)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Gross Pay</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Coins className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-gold)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatCurrency(financialSummaryData.summary.totalNetPay)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Total Net Pay</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Percent className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-red)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatPercentage(financialSummaryData.summary.deductionRate)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Deduction Rate</div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                    Recent Payments
                                </h4>
                                <div className="space-y-3">
                                    {financialSummaryData.payments.slice(0, 5).map((payment) => (
                                        <div key={payment.id} 
                                             className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                                             onClick={() => navigateToPayment(payment.id)}>
                                            <div>
                                                <div className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                                    {payment.workerName}
                                                </div>
                                                <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                    {payment.pitakLocation} • {formatDate(payment.paymentDate)}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-semibold windows-title" style={{ color: 'var(--accent-green)' }}>
                                                    {formatCurrency(payment.netPay)}
                                                </div>
                                                <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                    Gross: {formatCurrency(payment.grossPay)}
                                                    {payment.manualDeduction > 0 && 
                                                        ` • Deductions: ${formatCurrency(payment.manualDeduction)}`}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Comparison Mode */}
                {comparisonMode && compareData && (
                    <div className="space-y-6">
                        <div className="windows-card p-5">
                            <h3 className="text-lg font-semibold mb-6 windows-title flex items-center gap-2"
                                style={{ color: 'var(--text-primary)' }}>
                                <GitCompare className="w-5 h-5" />
                                Bukid Comparison
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Building className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-earth)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {compareData.summary.totalBukids}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Bukids Compared</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Layers className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {compareData.summary.averagePitaks.toFixed(1)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Avg Pitaks</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Crop className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-gold)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatNumber(compareData.summary.averageLuwang)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Avg Luwang</div>
                                </div>
                                <div className="text-center p-4 rounded-lg" style={{ background: 'var(--card-secondary-bg)' }}>
                                    <Award className="w-6 h-6 mx-auto mb-2" style={{ color: 'var(--accent-blue)' }} />
                                    <div className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                        {formatPercentage(compareData.summary.averageEfficiency)}
                                    </div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Avg Efficiency</div>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b" style={{ borderColor: 'var(--border-color)' }}>
                                            <th className="text-left py-3 px-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                                Bukid
                                            </th>
                                            <th className="text-left py-3 px-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                                Pitaks
                                            </th>
                                            <th className="text-left py-3 px-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                                Total Luwang
                                            </th>
                                            <th className="text-left py-3 px-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                                Total Payments
                                            </th>
                                            <th className="text-left py-3 px-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                                Efficiency
                                            </th>
                                            <th className="text-left py-3 px-4 windows-title" style={{ color: 'var(--text-primary)' }}>
                                                Overall Rank
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {compareData.bukids.map((bukid, index) => (
                                            <tr key={bukid.bukidId} 
                                                className="border-b hover:bg-gray-50 cursor-pointer"
                                                style={{ borderColor: 'var(--border-color)' }}
                                                onClick={() => navigateToBukid(bukid.bukidId)}>
                                                <td className="py-3 px-4">
                                                    <div className="font-medium windows-title" style={{ color: 'var(--text-primary)' }}>
                                                        {bukid.name}
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        ID: {bukid.bukidId}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                                        {bukid.metrics.pitaks}
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        Rank: #{bukid.rankings.pitaks?.rank || 'N/A'}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold windows-title" style={{ color: 'var(--accent-gold)' }}>
                                                        {formatNumber(bukid.metrics.totalLuwang)}
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        {formatNumber(bukid.metrics.totalAssignments)} assignments
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold windows-title" style={{ color: 'var(--accent-green)' }}>
                                                        {formatCurrency(bukid.metrics.totalNetPay)}
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        Gross: {formatCurrency(bukid.metrics.totalGrossPay)}
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="font-semibold windows-title" 
                                                         style={{ 
                                                             color: bukid.metrics.efficiency >= 80 ? 'var(--accent-green)' :
                                                                    bukid.metrics.efficiency >= 60 ? 'var(--accent-yellow)' : 'var(--accent-red)'
                                                         }}>
                                                        {formatPercentage(bukid.metrics.efficiency)}
                                                    </div>
                                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                                        Percentile: {bukid.rankings.efficiency?.percentile || 0}%
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                                        index === 0 ? 'bg-yellow-100 text-yellow-800' :
                                                        index === 1 ? 'bg-gray-100 text-gray-800' :
                                                        index === 2 ? 'bg-orange-100 text-orange-800' :
                                                        'bg-blue-50 text-blue-800'
                                                    }`}>
                                                        #{bukid.rankings.overall?.rank || index + 1}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Export Button */}
            <div className="flex justify-end">
                <button
                    className="windows-btn windows-btn-primary flex items-center gap-2"
                    onClick={() => {
                        // Export functionality would go here
                        alert('Export functionality would be implemented here');
                    }}
                >
                    <Download className="w-4 h-4" />
                    Export Report
                </button>
            </div>
        </div>
    );
};

export default BukidAnalyticsPage;