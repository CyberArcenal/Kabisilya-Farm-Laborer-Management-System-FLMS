// src/components/Dialogs/ViewStatsDialog.tsx
import React, { useState, useEffect } from 'react';
import {
  X, BarChart2, Home, MapPin, Package, Users,
  Calendar, TrendingUp, PieChart, Hash,
  CheckCircle, XCircle, Clock, AlertCircle,
  FileText,
  Edit
} from 'lucide-react';
import bukidAPI from '../../../apis/bukid';
import { showError } from '../../../utils/notification';

interface ViewStatsDialogProps {
  id: number;
  onClose: () => void;
  onEdit?: (id: number) => void;
}

const ViewStatsDialog: React.FC<ViewStatsDialogProps> = ({
  id,
  onClose,
  onEdit
}) => {
  const [loading, setLoading] = useState(true);
  const [bukid, setBukid] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [summary, setSummary] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch bukid details
        const bukidResponse = await bukidAPI.getById(id);
        if (!bukidResponse.status) {
          throw new Error(bukidResponse.message);
        }
        setBukid(bukidResponse.data.bukid);

        // Fetch stats
        const statsResponse = await bukidAPI.getStats();
        if (statsResponse.status) {
          setStats(statsResponse.data);
        }

        // Fetch summary
        const summaryResponse = await bukidAPI.getSummary(id);
        if (summaryResponse.status) {
          setSummary(summaryResponse.data.summary);
        }

      } catch (err: any) {
        console.error('Error fetching bukid stats:', err);
        setError(err.message || 'Failed to load bukid statistics');
        showError('Failed to load bukid statistics');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl shadow-xl border border-gray-200">
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600 mx-auto mb-4"></div>
            <p className="text-sm text-gray-600">Loading bukid statistics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
        <div className="bg-white rounded-lg w-full max-w-md shadow-xl border border-gray-200">
          <div className="p-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900 mb-1">Error Loading Statistics</h3>
            <p className="text-sm text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl shadow-xl border border-gray-200 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bukid Statistics</h3>
              <div className="text-xs text-gray-600 flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Home className="w-3 h-3" /> {bukid?.name}
                </span>
                <span>•</span>
                <span>ID: #{bukid?.id}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded flex items-center justify-center hover:bg-gray-200 transition-colors"
            title="Close"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {summary?.assignmentCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Assignments</div>
                  </div>
                </div>
                <div className="text-xs text-blue-700">
                  {summary?.activeAssignments || 0} active assignments
                </div>
              </div>

              <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {summary?.pitakCount || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Pitaks</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-700">
                  {summary?.totalLuwang || 0} total luwang
                </div>
              </div>

              <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200 p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {bukid?.status?.charAt(0).toUpperCase() + bukid?.status?.slice(1) || 'Active'}
                    </div>
                    <div className="text-sm text-gray-600">Current Status</div>
                  </div>
                </div>
                <div className="text-xs text-amber-700">
                  {bukid?.status === 'active' ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Operational
                    </span>
                  ) : (
                    <span className="flex items-center gap-1">
                      <XCircle className="w-3 h-3" /> Inactive
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Detailed Information */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bukid Information */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Home className="w-4 h-4" />
                  Bukid Information
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Name:</span>
                    <span className="text-sm font-medium text-gray-900">{bukid?.name}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Location:</span>
                    <span className="text-sm text-gray-900">{bukid?.location || 'Not specified'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Created:</span>
                    <span className="text-sm text-gray-900">
                      {bukid?.createdAt ? formatDate(bukid.createdAt) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Last Updated:</span>
                    <span className="text-sm text-gray-900">
                      {bukid?.updatedAt ? formatDate(bukid.updatedAt) : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Statistics Summary */}
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <PieChart className="w-4 h-4" />
                  Statistics Summary
                </h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Average Luwang per Pitak:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {summary?.pitakCount ? 
                        Math.round(summary.totalLuwang / summary.pitakCount) : 0
                      }
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Productivity Score:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {summary?.assignmentCount ? 
                        Math.min(Math.round((summary.activeAssignments / summary.assignmentCount) * 100), 100) : 0
                      }%
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Utilization Rate:</span>
                    <span className="text-sm font-medium text-gray-900">
                      {summary?.totalLuwang ? 
                        Math.min(Math.round((summary.totalLuwang / 100) * 100), 100) : 0
                      }%
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            {bukid?.notes && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-5">
                <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Notes
                </h4>
                <div className="text-sm text-gray-700 bg-white p-3 rounded border border-gray-200">
                  {bukid.notes}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-xs text-gray-600 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              Last updated: {bukid?.updatedAt ? formatDate(bukid.updatedAt) : 'N/A'}
            </div>
            <div className="flex items-center gap-2">
              {onEdit && (
                <button
                  onClick={() => onEdit(id)}
                  className="px-4 py-2 rounded text-sm font-medium border border-gray-300 hover:bg-gray-100 text-gray-700 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Bukid
                </button>
              )}
              <button
                onClick={onClose}
                className="px-4 py-2 rounded text-sm font-medium bg-gray-600 hover:bg-gray-700 text-white"
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

export default ViewStatsDialog;