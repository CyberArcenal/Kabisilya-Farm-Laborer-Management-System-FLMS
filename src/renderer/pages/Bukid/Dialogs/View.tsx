// BukidViewDialog.tsx (fixed)
import React, { useState, useEffect } from 'react';
import {
    X, MapPin, TreePalm, Calendar, FileText, LandPlot, Ruler, Info, ClipboardList,
    DollarSign, TrendingUp, Clock, CheckCircle, XCircle, Copy, Edit, Users, BarChart
} from 'lucide-react';
import type {
    BukidData,
    BukidSummaryData,
    BukidStatsData,
    WorkerCountData,
    PitakCountData
} from '../../../apis/bukid';
import bukidAPI from '../../../apis/bukid';
import { showError } from '../../../utils/notification';
import { formatDate, formatCurrency } from '../../../utils/formatters';

interface BukidViewDialogProps {
    id: number;
    onClose: () => void;
    onEdit?: (id: number) => void;
}

interface BukidWithDetails extends BukidData {
    summary?: BukidSummaryData;
    stats?: BukidStatsData & {
        pitakDistribution?: any[];
        recentBukid?: BukidData[];
        analytics?: {
            byKabisilya: Record<number, number>;
            byLocation: Record<string, number>;
            recentGrowth: { date: string; count: number }[];
        };
    };
    pitakCounts?: PitakCountData[];
    workerCounts?: WorkerCountData[];
    pitaks?: Array<{
        id: number;
        location: string;
        totalLuwang: number;
        status: string;
        createdAt: string;
        updatedAt: string;
    }>;
}

const BukidViewDialog: React.FC<BukidViewDialogProps> = ({
    id,
    onClose,
    onEdit
}) => {
    const [loading, setLoading] = useState(true);
    const [bukid, setBukid] = useState<BukidWithDetails | null>(null);
    const [activeTab, setActiveTab] = useState<'details' | 'pitaks' | 'workers' | 'stats'>('details');

    // Fetch bukid data
    useEffect(() => {
        const fetchBukidData = async () => {
            try {
                setLoading(true);

                // Fetch basic bukid data
                const [bukidResponse, summaryResponse, statsResponse] = await Promise.all([
                    bukidAPI.getById(id),
                    bukidAPI.getSummary(id),
                    bukidAPI.getStats()
                ]);

                if (bukidResponse.status && bukidResponse.data) {
                    const bukidData: BukidWithDetails = {
                        ...bukidResponse.data.bukid,
                        summary: summaryResponse.data?.summary,
                        stats: statsResponse.data?.summary
                    };

                    // Fetch additional data if available
                    try {
                        const [pitakCounts, workerCounts, pitaksList] = await Promise.all([
                            bukidAPI.getPitakCounts(id).catch(() => null),
                            bukidAPI.getWorkerCounts(id).catch(() => null),
                            bukidAPI.getWithPitaks(id).catch(() => null)
                        ]);

                        if (pitakCounts?.data) {
                            bukidData.pitakCounts = pitakCounts.data.pitakCounts;
                        }

                        if (workerCounts?.data) {
                            bukidData.workerCounts = workerCounts.data.workerCounts;
                        }

                        if (pitaksList?.data?.bukid?.pitaks) {
                            bukidData.pitaks = pitaksList.data.bukid.pitaks;
                        }
                    } catch (error) {
                        console.error('Error fetching additional data:', error);
                    }

                    setBukid(bukidData);
                } else {
                    showError('Failed to load bukid data');
                    onClose();
                }
            } catch (error) {
                console.error('Error fetching bukid data:', error);
                showError('Failed to load bukid data');
                onClose();
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchBukidData();
        }
    }, [id, onClose]);

    // Get status badge
    const getStatusBadge = (status?: string) => {
        switch (status?.toLowerCase()) {
            case 'active':
                return {
                    bg: 'bg-green-100',
                    text: 'text-green-800',
                    border: 'border-green-200',
                    icon: CheckCircle
                };
            case 'inactive':
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    border: 'border-gray-200',
                    icon: XCircle
                };
            default:
                return {
                    bg: 'bg-gray-100',
                    text: 'text-gray-800',
                    border: 'border-gray-200',
                    icon: Info
                };
        }
    };

    // Handle copy to clipboard
    const handleCopyDetails = () => {
        if (!bukid) return;

        const details = `
            Bukid #${bukid.id}
            Name: ${bukid.name || 'N/A'}
            Location: ${bukid.location || 'N/A'}
            Status: ${bukid.status || 'N/A'}
            Pitak Count: ${bukid.summary?.pitakCount || 0}
            Total LuWang: ${bukid.summary?.totalLuwang || 0}
            Created: ${formatDate(bukid.createdAt)}
            Updated: ${formatDate(bukid.updatedAt)}
                    `.trim();

        navigator.clipboard.writeText(details);
        // You can add a toast notification here
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg border border-gray-200">
                    <div className="p-8 text-center">
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
                        <p className="text-sm text-gray-600">Loading bukid details...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!bukid) {
        return null;
    }

    const statusBadge = getStatusBadge(bukid.status);
    const StatusIcon = statusBadge.icon;

    return (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <div className="bg-white rounded-lg w-full max-w-5xl shadow-lg border border-gray-200 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-gray-50 to-white flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-sm">
                            <TreePalm className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-lg font-bold text-gray-900">
                                    {bukid.name}
                                </h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}>
                                    <StatusIcon className="w-3 h-3" />
                                    {bukid.status?.charAt(0).toUpperCase() + (bukid.status?.slice(1) || '')}
                                </span>
                            </div>
                            <div className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                                <MapPin className="w-3.5 h-3.5" />
                                <span>{bukid.location || 'No specific location'}</span>
                                <span className="text-gray-400">•</span>
                                <span>ID: #{bukid.id}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-1">
                        {onEdit && (
                            <button
                                onClick={() => onEdit(bukid.id!)}
                                className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                                title="Edit Bukid"
                            >
                                <Edit className="w-4 h-4" />
                            </button>
                        )}
                        <button
                            onClick={handleCopyDetails}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                            title="Copy Details"
                        >
                            <Copy className="w-4 h-4" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
                            title="Close"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex px-4">
                        {['details', 'pitaks', 'workers', 'stats'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab
                                    ? 'border-green-600 text-green-700 bg-white'
                                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Content - This section should be scrollable */}
                <div className="overflow-y-auto flex-1">
                    <div className="p-6">
                        {activeTab === 'details' && (
                            <div className="space-y-6">
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-600 mb-1">Pitak Count</div>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {bukid.summary?.pitakCount || 0}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Total pitaks</div>
                                            </div>
                                            <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                                                <LandPlot className="w-5 h-5 text-green-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-600 mb-1">Total LuWang</div>
                                                <div className="text-2xl font-bold text-blue-700">
                                                    {bukid.summary?.totalLuwang?.toFixed(2) || 0}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1">Total capacity</div>
                                            </div>
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                                <Ruler className="w-5 h-5 text-blue-600" />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-gradient-to-br from-purple-50 to-violet-50 p-4 rounded-xl border border-purple-200">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <div className="text-xs text-gray-600 mb-1">Assignments</div>
                                                <div className="text-2xl font-bold text-gray-900">
                                                    {bukid.summary?.assignmentCount || 0}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 flex gap-1">
                                                    <span className="text-green-600">{bukid.summary?.activeAssignments || 0} active</span>
                                                </div>
                                            </div>
                                            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                                                <ClipboardList className="w-5 h-5 text-purple-600" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Detailed Information */}
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Column */}
                                    <div className="space-y-6">
                                        {/* Farm Information */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <TreePalm className="w-5 h-5 text-green-600" />
                                                <h4 className="text-base font-semibold text-gray-900">Bukid Information</h4>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Bukid Name</label>
                                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <TreePalm className="w-4 h-4 text-gray-400" />
                                                        <span className="text-sm text-gray-900">{bukid.name || 'N/A'}</span>
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
                                                    <div className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                                                        <span className="text-sm text-gray-900">
                                                            {bukid.location || 'No location specified'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Pitak Summary */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <LandPlot className="w-5 h-5 text-blue-600" />
                                                <h4 className="text-base font-semibold text-gray-900">Pitak Summary</h4>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-100">
                                                        <div className="text-2xl font-bold text-blue-700">
                                                            {bukid.summary?.pitakCount || 0}
                                                        </div>
                                                        <div className="text-xs text-blue-600 mt-1">Total Pitaks</div>
                                                    </div>
                                                    <div className="text-center p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                                                        <div className="text-2xl font-bold text-emerald-700">
                                                            {bukid.summary?.totalLuwang?.toFixed(2) || 0}
                                                        </div>
                                                        <div className="text-xs text-emerald-600 mt-1">Total LuWang</div>
                                                    </div>
                                                </div>
                                                {bukid.pitakCounts && bukid.pitakCounts.length > 0 && (
                                                    <div>
                                                        <label className="block text-xs font-medium text-gray-500 mb-2">Average LuWang per Pitak</label>
                                                        <div className="text-sm text-gray-900 font-medium">
                                                            {(bukid.summary?.totalLuwang || 0) / (bukid.summary?.pitakCount || 1)} LuWang
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-6">
                                        {/* Status & Timeline */}
                                        <div className="bg-white rounded-xl border border-gray-200 p-5">
                                            <div className="flex items-center gap-2 mb-4">
                                                <Clock className="w-5 h-5 text-purple-600" />
                                                <h4 className="text-base font-semibold text-gray-900">Status & Timeline</h4>
                                            </div>
                                            <div className="space-y-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-500 mb-1">Current Status</label>
                                                    <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                                        <StatusIcon className="w-4 h-4" />
                                                        <span className="text-sm font-medium text-gray-900 capitalize">
                                                            {bukid.status || 'unknown'}
                                                        </span>
                                                        <span className="ml-auto text-xs text-gray-500">
                                                            {bukid.status === 'active' ? 'Active and operational' :
                                                                'Not available for new assignments'}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                            <span className="text-gray-600">Created</span>
                                                        </div>
                                                        <span className="text-gray-900">{formatDate(bukid.createdAt)}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                            <span className="text-gray-600">Last Updated</span>
                                                        </div>
                                                        <span className="text-gray-900">{formatDate(bukid.updatedAt)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Notes */}
                                        {bukid.notes && (
                                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <FileText className="w-5 h-5 text-amber-600" />
                                                    <h4 className="text-base font-semibold text-gray-900">Additional Notes</h4>
                                                </div>
                                                <div className="p-3 bg-amber-50 rounded-lg border border-amber-100">
                                                    <p className="text-sm text-gray-700 whitespace-pre-line">
                                                        {bukid.notes}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'pitaks' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-semibold text-gray-900">Pitaks</h4>
                                    <span className="text-sm text-gray-500">
                                        {bukid.pitaks?.length || 0} total pitaks
                                    </span>
                                </div>
                                {bukid.pitaks && bukid.pitaks.length > 0 ? (
                                    <div className="overflow-hidden rounded-xl border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Pitak ID
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Location
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        LuWang
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Status
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Created
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {bukid.pitaks.map((pitak) => (
                                                    <tr key={pitak.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            #{pitak.id}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                            {pitak.location || 'N/A'}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                            <span className="font-medium">{pitak.totalLuwang.toFixed(2)}</span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className={`px-2 py-1 text-xs rounded-full font-medium ${pitak.status === 'active'
                                                                ? 'bg-green-100 text-green-800'
                                                                : pitak.status === 'inactive'
                                                                    ? 'bg-gray-100 text-gray-800'
                                                                    : 'bg-yellow-100 text-yellow-800'
                                                                }`}>
                                                                {pitak.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                                            {formatDate(pitak.createdAt)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <LandPlot className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Pitaks</h4>
                                        <p className="text-gray-600 max-w-sm mx-auto">
                                            This bukid doesn't have any pitaks yet. Pitaks will appear here when they are added to this farm.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'workers' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h4 className="text-lg font-semibold text-gray-900">Workers & Assignments</h4>
                                    <span className="text-sm text-gray-500">
                                        {bukid.summary?.assignmentCount || 0} total assignments
                                    </span>
                                </div>
                                {bukid.workerCounts && bukid.workerCounts.length > 0 ? (
                                    <div className="overflow-hidden rounded-xl border border-gray-200">
                                        <table className="min-w-full divide-y divide-gray-200">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Worker Name
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Assignment Count
                                                    </th>
                                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Active Assignments
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {bukid.workerCounts.map((worker) => (
                                                    <tr key={worker.id} className="hover:bg-gray-50">
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                                            {worker.name}
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                                                            <span className="font-medium">{worker.assignmentCount}</span>
                                                        </td>
                                                        <td className="px-4 py-3 whitespace-nowrap">
                                                            <span className="px-2 py-1 text-xs rounded-full font-medium bg-green-100 text-green-800">
                                                                {worker.assignmentCount} active
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
                                        <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                        <h4 className="text-lg font-medium text-gray-900 mb-2">No Workers</h4>
                                        <p className="text-gray-600 max-w-sm mx-auto">
                                            No workers are currently assigned to this bukid. Workers will appear here when they receive assignments on this farm.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'stats' && bukid.stats && (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Bukid Statistics */}
                                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                                        <h4 className="text-base font-semibold text-gray-900 mb-4">Bukid Statistics</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Total Bukid</span>
                                                <span className="text-lg font-bold text-gray-900">{bukid.stats.total}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Active Bukid</span>
                                                <span className="text-lg font-bold text-green-600">{bukid.stats.active}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Inactive Bukid</span>
                                                <span className="text-lg font-bold text-gray-600">{bukid.stats.inactive}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Current Bukid Stats */}
                                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                                        <h4 className="text-base font-semibold text-gray-900 mb-4">Current Bukid Stats</h4>
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Pitak Count</span>
                                                <span className="text-lg font-bold text-gray-900">{bukid.summary?.pitakCount || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Total LuWang</span>
                                                <span className="text-lg font-bold text-blue-600">
                                                    {bukid.summary?.totalLuwang?.toFixed(2) || 0}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Assignments</span>
                                                <span className="text-lg font-bold text-yellow-600">{bukid.summary?.assignmentCount || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">Active Assignments</span>
                                                <span className="text-lg font-bold text-green-600">{bukid.summary?.activeAssignments || 0}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Distribution Chart */}
                                {bukid.stats.pitakDistribution && bukid.stats.pitakDistribution.length > 0 && (
                                    <div className="bg-white rounded-xl border border-gray-200 p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-base font-semibold text-gray-900">Pitak Distribution</h4>
                                            <BarChart className="w-5 h-5 text-gray-400" />
                                        </div>
                                        <div className="space-y-3">
                                            {bukid.stats.pitakDistribution.slice(0, 5).map((item, index) => (
                                                <div key={index} className="flex items-center justify-between">
                                                    <span className="text-sm text-gray-600">{item.name}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-gray-900">{item.count}</span>
                                                        <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className="h-full bg-green-500 rounded-full"
                                                                style={{ width: `${(item.count / (bukid.summary?.pitakCount || 1)) * 100}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer - Fixed at the bottom */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-600">
                            Last updated: {formatDate(bukid.updatedAt)}
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCopyDetails}
                                className="px-3 py-1.5 rounded text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300 flex items-center gap-1.5"
                            >
                                <Copy className="w-3.5 h-3.5" />
                                Copy Details
                            </button>
                            <button
                                onClick={onClose}
                                className="px-3 py-1.5 rounded text-sm font-medium bg-green-600 hover:bg-green-700 text-white"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BukidViewDialog;