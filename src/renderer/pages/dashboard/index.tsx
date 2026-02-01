// components/DashboardPage.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    TrendingUp,
    DollarSign,
    Calendar,
    AlertTriangle,
    CheckCircle, RefreshCw,
    Plus, Package,
    BarChart3,
    Activity,
    UserCheck,
    ChevronRight,
    Percent,
    MapPin,
    Sprout,
    CloudRain,
    Sun,
    ThermometerSun,
    Droplets,
    Wind
} from 'lucide-react';
// import dashboardAPI, {
//     type WorkersOverviewData,
//     type FinancialOverviewData,
//     type AssignmentOverviewData,
//     type LiveDashboardData
// } from '../../apis/dashboard';
import { formatCurrency, formatDate, formatPercentage } from '../../utils/formatters';
import { workerPerformanceAPI, type WorkersOverviewData } from '../../apis/analytics/workerPerformance';
import { financialAPI, type FinancialOverviewData } from '../../apis/analytics/financial';
import type { AssignmentOverviewData, LiveDashboardData } from '../../apis/analytics/dashboard';
import dashboardAPI from '../../apis/analytics/dashboard';

const DashboardPage: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [workersData, setWorkersData] = useState<WorkersOverviewData | null>(null);
    const [financialData, setFinancialData] = useState<FinancialOverviewData | null>(null);
    const [assignmentsData, setAssignmentsData] = useState<AssignmentOverviewData | null>(null);
    const [liveData, setLiveData] = useState<LiveDashboardData | null>(null);
    const navigate = useNavigate();

    const fetchDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);

            const [
                workersRes,
                financialRes,
                assignmentsRes,
                liveRes
            ] = await Promise.all([
                workerPerformanceAPI.getWorkersOverview(),
                financialAPI.getFinancialOverview(),
                dashboardAPI.getAssignmentOverview(),
                dashboardAPI.getLiveDashboard()
            ]);

            if (workersRes.status) setWorkersData(workersRes.data);
            if (financialRes.status) setFinancialData(financialRes.data);
            if (assignmentsRes.status) setAssignmentsData(assignmentsRes.data);
            if (liveRes.status) setLiveData(liveRes.data);

        } catch (err: any) {
            setError(err.message);
            console.error('Failed to fetch dashboard data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);
            setError(null);
            await fetchDashboardData();
        } catch (err: any) {
            setError(err.message);
            console.error('Failed to refresh dashboard data:', err);
        } finally {
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, []);

    // Helper function to format percentage values
    const formatPercentageValue = (value: number | undefined): string => {
        if (value === undefined || value === null) return '0%';
        return `${Math.round(value * 100) / 100}%`;
    };

    // Helper function to format decimal values to 1 decimal place
    const formatDecimal = (value: number | undefined): string => {
        if (value === undefined || value === null) return '0.0';
        return value.toFixed(1);
    };

    // Quick actions for the dashboard
    const quickActions = [
        { label: 'New Worker', path: '/workers/form', icon: Plus, color: 'green' },
        { label: 'Assign Work', path: '/assignments/form', icon: Package, color: 'blue' },
        { label: 'Record Payment', path: '/payments/form', icon: DollarSign, color: 'gold' },
        { label: 'View Reports', path: '/reports/workers', icon: TrendingUp, color: 'purple' }
    ];

    // Navigate functions
    const navigateToWorkers = () => navigate('/workers');
    const navigateToAssignments = () => navigate('/assignments');
    const navigateToPendingAssignments = () => navigate('/assignments/pending');
    const navigateToFinancialReports = () => navigate('/reports/financial');
    const navigateToDebts = () => navigate('/debts');
    const navigateToActiveAssignments = () => navigate('/assignments/active');
    const navigateToPaymentHistory = () => navigate('/payments');

    // Weather data (mock - would come from API in production)
    const weatherData = {
        temperature: 28,
        condition: 'Partly Cloudy',
        humidity: 65,
        windSpeed: 12,
        precipitation: 20,
        forecast: [
            { day: 'Today', high: 29, low: 23, condition: 'partly-cloudy' },
            { day: 'Tomorrow', high: 30, low: 24, condition: 'sunny' },
            { day: 'Wed', high: 28, low: 23, condition: 'rain' }
        ]
    };

    // Season indicator
    const getCurrentSeason = () => {
        const month = new Date().getMonth();
        if (month >= 5 && month <= 10) return { name: 'Rainy Season', icon: CloudRain, color: 'var(--accent-sky)' };
        return { name: 'Dry Season', icon: Sun, color: 'var(--accent-gold)' };
    };

    const currentSeason = getCurrentSeason();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-3 transition-colors duration-300" style={{ borderColor: 'var(--primary-color)' }}></div>
                    <p className="text-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center p-8">
                <AlertTriangle className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--danger-color)' }} />
                <p className="text-base font-semibold mb-1" style={{ color: 'var(--danger-color)' }}>Error Loading Dashboard</p>
                <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>{error}</p>
                <button
                    onClick={fetchDashboardData}
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
            {/* Dashboard Header */}
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>Dashboard Overview</h1>
                    <p className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Real-time farm operations monitoring</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        disabled={refreshing}
                        className="windows-btn windows-btn-secondary flex items-center"
                    >
                        <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <div className="px-3 py-1 rounded-full text-sm flex items-center"
                        style={{
                            background: 'var(--card-secondary-bg)',
                            color: currentSeason.color,
                            border: `1px solid ${currentSeason.color}20`
                        }}
                    >
                        {React.createElement(currentSeason.icon, { className: "w-4 h-4 mr-2" })}
                        {currentSeason.name}
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid - Windows Friendly Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Workers Card */}
                <div className="windows-card p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-lg" style={{ background: 'var(--accent-green-light)' }}>
                            <Users className="w-6 h-6" style={{ color: 'var(--accent-green)' }} />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                                background: workersData?.summary.activePercentage! || 0 >= 70 ? 'var(--accent-green-light)' : 'var(--accent-yellow-light)',
                                color: workersData?.summary.activePercentage || 0 >= 70 ? 'var(--accent-green)' : 'var(--accent-yellow)'
                            }}
                        >
                            <UserCheck className="w-3 h-3 inline mr-1" />
                            {formatPercentageValue(workersData?.summary.activePercentage)}
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}
                        onClick={navigateToWorkers}
                    >
                        {workersData?.summary.total || 0}
                    </h3>
                    <p className="text-sm mb-4 windows-text" style={{ color: 'var(--text-secondary)' }}>Total Workers</p>
                    <button
                        onClick={navigateToWorkers}
                        className="windows-btn windows-btn-secondary text-sm flex items-center"
                    >
                        Manage Workers
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>

                {/* Active Assignments Card */}
                <div className="windows-card p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-lg" style={{ background: 'var(--accent-sky-light)' }}>
                            <Package className="w-6 h-6" style={{ color: 'var(--accent-sky)' }} />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                                background: assignmentsData?.summary.completionRate! || 0 >= 80 ? 'var(--accent-green-light)' : 'var(--accent-yellow-light)',
                                color: assignmentsData?.summary.completionRate! || 0 >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)'
                            }}
                        >
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            {formatPercentageValue(assignmentsData?.summary.completionRate)}
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}
                        onClick={navigateToAssignments}
                    >
                        {assignmentsData?.summary.activeAssignments || 0}
                    </h3>
                    <p className="text-sm mb-4 windows-text" style={{ color: 'var(--text-secondary)' }}>Active Assignments</p>
                    <button
                        onClick={navigateToAssignments}
                        className="windows-btn windows-btn-secondary text-sm flex items-center"
                    >
                        View All Assignments
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>

                {/* Total Debt Card */}
                <div className="windows-card p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-lg" style={{ background: 'var(--accent-gold-light)' }}>
                            <DollarSign className="w-6 h-6" style={{ color: 'var(--accent-gold)' }} />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                                background: financialData?.debts.collectionRate || 0 >= 70 ? 'var(--accent-green-light)' : 'var(--accent-red-light)',
                                color: financialData?.debts.collectionRate || 0 >= 70 ? 'var(--accent-green)' : 'var(--accent-red)'
                            }}
                        >
                            <Percent className="w-3 h-3 inline mr-1" />
                            {formatPercentageValue(financialData?.debts.collectionRate)} collected
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}
                        onClick={navigateToDebts}
                    >
                        {formatCurrency(financialData?.debts.totalBalance || 0)}
                    </h3>
                    <p className="text-sm mb-4 windows-text" style={{ color: 'var(--text-secondary)' }}>Outstanding Debt</p>
                    <button
                        onClick={navigateToDebts}
                        className="windows-btn windows-btn-secondary text-sm flex items-center"
                    >
                        Manage Debts
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>

                {/* This Month's Pay Card */}
                <div className="windows-card p-5">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 rounded-lg" style={{ background: 'var(--accent-earth-light)' }}>
                            <TrendingUp className="w-6 h-6" style={{ color: 'var(--accent-earth)' }} />
                        </div>
                        <span className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{
                                background: 'var(--accent-green-light)',
                                color: 'var(--accent-green)'
                            }}
                        >
                            +{formatPercentage(financialData?.payments.growthRate || 0)}
                        </span>
                    </div>
                    <h3 className="text-3xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}
                        onClick={navigateToPaymentHistory}
                    >
                        {formatCurrency(financialData?.payments.currentMonth.net || 0)}
                    </h3>
                    <p className="text-sm mb-4 windows-text" style={{ color: 'var(--text-secondary)' }}>This Month's Net Pay</p>
                    <button
                        onClick={navigateToPaymentHistory}
                        className="windows-btn windows-btn-secondary text-sm flex items-center"
                    >
                        Payment History
                        <ChevronRight className="w-4 h-4 ml-1" />
                    </button>
                </div>
            </div>

            {/* Weather and Quick Actions Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Weather Widget */}
                <div className="windows-card p-5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title" style={{ color: 'var(--text-primary)' }}>
                            <ThermometerSun className="w-5 h-5" />
                            Weather Conditions
                        </h3>
                        <span className="px-3 py-1 rounded-full text-sm"
                            style={{
                                background: 'var(--card-secondary-bg)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            Now
                        </span>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-4xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                {weatherData.temperature}°C
                            </div>
                            <div className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>
                                {weatherData.condition}
                            </div>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Droplets className="w-5 h-5" style={{ color: 'var(--accent-sky)' }} />
                                <div>
                                    <div className="text-sm font-medium windows-title" style={{ color: 'var(--text-primary)' }}>{weatherData.humidity}%</div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Humidity</div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Wind className="w-5 h-5" style={{ color: 'var(--accent-sky)' }} />
                                <div>
                                    <div className="text-sm font-medium windows-title" style={{ color: 'var(--text-primary)' }}>{weatherData.windSpeed} km/h</div>
                                    <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>Wind</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-2">
                    <h3 className="text-lg font-semibold mb-4 windows-title" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {quickActions.map((action, index) => {
                            const Icon = action.icon;
                            const colorClasses = {
                                green: { bg: 'var(--accent-green-light)', border: 'var(--accent-green)', text: 'var(--accent-green-dark)' },
                                blue: { bg: 'var(--accent-sky-light)', border: 'var(--accent-sky)', text: 'var(--accent-sky-dark)' },
                                gold: { bg: 'var(--accent-gold-light)', border: 'var(--accent-gold)', text: 'var(--accent-gold-dark)' },
                                purple: { bg: 'var(--accent-purple-light)', border: 'var(--accent-purple)', text: 'var(--accent-purple-dark)' }
                            };

                            const colors = colorClasses[action.color as keyof typeof colorClasses];

                            return (
                                <a
                                    key={index}
                                    href={action.path}
                                    className="windows-btn windows-btn-secondary p-4 flex flex-col items-center justify-center hover:scale-105 transition-all duration-200"
                                    style={{
                                        background: colors.bg,
                                        border: `1px solid ${colors.border}20`,
                                        color: colors.text
                                    }}
                                >
                                    <Icon className="w-6 h-6 mb-2" />
                                    <span className="text-sm font-medium text-center windows-text">{action.label}</span>
                                </a>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Today's Overview and Farm Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Today's Overview */}
                <div className="lg:col-span-2 windows-card p-5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title" style={{ color: 'var(--text-primary)' }}>
                            <Activity className="w-5 h-5" />
                            Today's Activity
                        </h3>
                        <span className="px-3 py-1 rounded-full text-sm"
                            style={{
                                background: 'var(--primary-light)',
                                color: 'var(--primary-color)'
                            }}
                        >
                            {formatDate(new Date(), 'MMM dd, yyyy')}
                        </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-lg"
                            style={{
                                background: 'var(--card-secondary-bg)'
                            }}
                        >
                            <Package className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--accent-sky)' }} />
                            <div className="text-2xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                {liveData?.overview.assignments.today || 0}
                            </div>
                            <div className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Today's Assignments</div>
                        </div>
                        <div className="text-center p-4 rounded-lg"
                            style={{
                                background: 'var(--card-secondary-bg)'
                            }}
                        >
                            <DollarSign className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--accent-green)' }} />
                            <div className="text-2xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(liveData?.overview.financial.todayPayments || 0)}
                            </div>
                            <div className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Today's Payments</div>
                        </div>
                        <div className="text-center p-4 rounded-lg"
                            style={{
                                background: 'var(--card-secondary-bg)'
                            }}
                        >
                            <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--accent-purple)' }} />
                            <div className="text-2xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                {liveData?.overview.workers.totalActive || 0}
                            </div>
                            <div className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Active Workers</div>
                        </div>
                        <div className="text-center p-4 rounded-lg"
                            style={{
                                background: 'var(--card-secondary-bg)'
                            }}
                        >
                            <MapPin className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--accent-earth)' }} />
                            <div className="text-2xl font-bold mb-1 windows-title" style={{ color: 'var(--text-primary)' }}>
                                {liveData?.overview.resources.activePitaks || 0}
                            </div>
                            <div className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Active Pitaks</div>
                        </div>
                    </div>
                </div>

                {/* Farm Status */}
                <div className="windows-card p-5">
                    <h3 className="text-lg font-semibold flex items-center gap-2 mb-6 windows-title" style={{ color: 'var(--text-primary)' }}>
                        <Sprout className="w-5 h-5" />
                        Farm Status
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 rounded-lg"
                            style={{
                                background: 'var(--card-secondary-bg)'
                            }}
                        >
                            <div className="flex items-center">
                                <MapPin className="w-5 h-5 mr-3" style={{ color: 'var(--accent-green)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Active Pitaks</span>
                            </div>
                            <span className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {assignmentsData?.utilization.pitaks.active || 0}/{assignmentsData?.utilization.pitaks.total || 0}
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 rounded-lg"
                            style={{
                                background: 'var(--card-secondary-bg)'
                            }}
                        >
                            <div className="flex items-center">
                                <Users className="w-5 h-5 mr-3" style={{ color: 'var(--accent-sky)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Worker Utilization</span>
                            </div>
                            <span className="font-semibold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {formatPercentageValue((assignmentsData?.utilization.workers.utilizationRate || 0) * 100)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Financial Overview and Worker Performance */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Financial Overview */}
                <div className="windows-card p-5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title" style={{ color: 'var(--text-primary)' }}>
                            <BarChart3 className="w-5 h-5" />
                            Financial Overview
                        </h3>
                        <button
                            onClick={navigateToFinancialReports}
                            className="windows-btn windows-btn-secondary text-sm flex items-center"
                        >
                            View Reports
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <DollarSign className="w-5 h-5 mr-2" style={{ color: 'var(--accent-gold)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Total Debt</span>
                            </div>
                            <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(financialData?.debts.totalAmount || 0)}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <Percent className="w-5 h-5 mr-2"
                                    style={{
                                        color: financialData?.debts.collectionRate || 0 >= 70 ? 'var(--accent-green)' : 'var(--accent-red)'
                                    }}
                                />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Collection Rate</span>
                            </div>
                            <div className="text-xl font-bold windows-title"
                                style={{
                                    color: financialData?.debts.collectionRate || 0 >= 70 ? 'var(--accent-green)' : 'var(--accent-red)'
                                }}
                            >
                                {formatPercentageValue(financialData?.debts.collectionRate)}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <TrendingUp className="w-5 h-5 mr-2" style={{ color: 'var(--accent-sky)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Avg. Interest</span>
                            </div>
                            <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {formatPercentageValue(financialData?.debts.averageInterestRate)}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <Calendar className="w-5 h-5 mr-2" style={{ color: 'var(--accent-purple)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Due Dates</span>
                            </div>
                            <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {financialData?.upcomingDueDates.length || 0}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-3 windows-title" style={{ color: 'var(--text-primary)' }}>Debt Status Breakdown</h4>
                        <div className="space-y-2">
                            {financialData?.debtStatusBreakdown.map((status, index) => (
                                <div key={index} className="flex justify-between items-center p-2 rounded-lg hover:bg-gray-50">
                                    <div className="flex items-center">
                                        <div className="w-3 h-3 rounded-full mr-2"
                                            style={{
                                                backgroundColor: status.status === 'active' ? 'var(--accent-green)' :
                                                    status.status === 'overdue' ? 'var(--accent-red)' : 'var(--accent-gold)'
                                            }}
                                        ></div>
                                        <span className="text-sm capitalize windows-text" style={{ color: 'var(--text-secondary)' }}>{status.status}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-sm windows-title" style={{ color: 'var(--text-primary)' }}>
                                            {formatCurrency(status.totalBalance)}
                                        </span>
                                        <span className="px-2 py-1 rounded-full text-xs"
                                            style={{
                                                background: 'var(--card-bg)',
                                                color: 'var(--text-secondary)'
                                            }}
                                        >
                                            {status.count}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Worker Performance */}
                <div className="windows-card p-5">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-lg font-semibold flex items-center gap-2 windows-title" style={{ color: 'var(--text-primary)' }}>
                            <UserCheck className="w-5 h-5" />
                            Worker Performance
                        </h3>
                        <button
                            onClick={navigateToWorkers}
                            className="windows-btn windows-btn-secondary text-sm flex items-center"
                        >
                            Manage Workers
                            <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <UserCheck className="w-5 h-5 mr-2" style={{ color: 'var(--accent-green)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Active Workers</span>
                            </div>
                            <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {workersData?.summary.active || 0}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <DollarSign className="w-5 h-5 mr-2" style={{ color: 'var(--accent-gold)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Avg. Debt</span>
                            </div>
                            <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(workersData?.financial.averageDebt || 0)}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <CheckCircle className="w-5 h-5 mr-2"
                                    style={{
                                        color: assignmentsData?.summary.completionRate || 0 >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)'
                                    }}
                                />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Completion Rate</span>
                            </div>
                            <div className="text-xl font-bold windows-title"
                                style={{
                                    color: assignmentsData?.summary.completionRate || 0 >= 80 ? 'var(--accent-green)' : 'var(--accent-yellow)'
                                }}
                            >
                                {formatPercentageValue(assignmentsData?.summary.completionRate)}
                            </div>
                        </div>
                        <div className="p-4 rounded-lg windows-card"
                        >
                            <div className="flex items-center mb-2">
                                <Package className="w-5 h-5 mr-2" style={{ color: 'var(--accent-sky)' }} />
                                <span className="text-sm windows-text" style={{ color: 'var(--text-secondary)' }}>Avg. Assignments</span>
                            </div>
                            <div className="text-xl font-bold windows-title" style={{ color: 'var(--text-primary)' }}>
                                {formatDecimal(assignmentsData?.luwangMetrics.averagePerWorker)}
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-medium mb-3 windows-title" style={{ color: 'var(--text-primary)' }}>Top Debtors</h4>
                        <div className="space-y-2">
                            {workersData?.financial.topDebtors.slice(0, 3).map((debtor, index) => (
                                <div
                                    key={index}
                                    className="flex justify-between items-center p-3 rounded-lg hover:bg-gray-50 cursor-pointer windows-card"
                                    onClick={() => navigate(`/workers/view/${debtor.id}`)}
                                >
                                    <div>
                                        <div className="font-medium text-sm windows-title" style={{ color: 'var(--text-primary)' }}>{debtor.name}</div>
                                        <div className="text-xs windows-text" style={{ color: 'var(--text-secondary)' }}>
                                            Balance: {formatCurrency(debtor.currentBalance)}
                                        </div>
                                    </div>
                                    <div className="font-semibold text-sm windows-title" style={{ color: 'var(--accent-gold)' }}>
                                        {formatCurrency(debtor.totalDebt)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;