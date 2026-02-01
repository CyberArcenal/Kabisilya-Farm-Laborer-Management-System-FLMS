import React, { useState } from 'react';
import { 
  MapPin, Home, Hash, Package, Users, Eye, Edit, 
  MoreVertical, Trash2, User, BookOpen, Layers, 
  FileText, CheckCircle, XCircle, Crop, ChevronRight,
  Calendar, History, List
} from 'lucide-react';
import PitakActionsDropdown from './PitakActionsDropdown';
import { formatDate, formatNumber } from '../../../../utils/formatters';

interface PitakTableRowProps {
  pitak: any;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number) => void;
  onAssign: (id: number, pitakData: any) => void;
  onUpdateLuWang: (id: number, totalLuwang: number | null) => void;
  onViewAssignedWorkers: (id: number, location?: string) => void;
  onViewReport: (id: number) => void;
  onMarkAsHarvested: (id: number) => void;
  onUpdateStatus: (id: number, currentStatus: string) => void;
  // New props for assignment viewing
  onViewAssignment: (assignmentId: number) => void;
  onViewPitakAssignments: (pitakId: number) => void;
}

const PitakTableRow: React.FC<PitakTableRowProps> = ({
  pitak,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onUpdateLuWang,
  onViewAssignedWorkers,
  onViewReport,
  onMarkAsHarvested,
  onUpdateStatus,
  onViewAssignment,
  onViewPitakAssignments,
}) => {
  const getStatusBadge = (status: string = 'active') => {
    const statusConfig = {
      active: {
        text: 'Active',
        bg: 'var(--status-planted-bg)',
        color: 'var(--status-planted)',
        border: 'rgba(56, 161, 105, 0.3)',
        icon: CheckCircle
      },
      inactive: {
        text: 'Inactive',
        bg: 'var(--status-fallow-bg)',
        color: 'var(--status-fallow)',
        border: 'rgba(113, 128, 150, 0.3)',
        icon: XCircle
      },
      completed: {
        text: 'Completed',
        bg: 'var(--accent-gold-light)',
        color: 'var(--accent-gold)',
        border: 'rgba(214, 158, 46, 0.3)',
        icon: Crop
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 whitespace-nowrap"
        style={{
          background: config.bg,
          color: config.color,
          border: `1px solid ${config.border}`
        }}
      >
        <Icon className="w-3 h-3" />
        {config.text}
      </span>
    );
  };

  const ExpandedView = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-3">
      <div className="p-3 rounded-lg border" style={{ 
        background: 'var(--card-bg)',
        borderColor: 'var(--border-color)'
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Package className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Assignments
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {pitak.stats?.assignments.total || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {pitak.stats?.assignments.active || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Completed:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {pitak.stats?.assignments.completed || 0}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg border" style={{ 
        background: 'var(--card-bg)',
        borderColor: 'var(--border-color)'
      }}>
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Luwang
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Capacity:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {formatNumber(pitak.totalLuwang)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Assigned:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {formatNumber(pitak.stats?.assignments.totalLuWangAssigned || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Utilization:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {pitak.stats?.utilizationRate ? `${pitak.stats.utilizationRate.toFixed(1)}%` : '0%'}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg border" style={{ 
        background: 'var(--card-bg)',
        borderColor: 'var(--border-color)'
      }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Payments
          </span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {pitak.stats?.payments.total || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Gross Pay:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              ₱{formatNumber(pitak.stats?.payments.totalGrossPay || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Net Pay:</span>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              ₱{formatNumber(pitak.stats?.payments.totalNetPay || 0)}
            </span>
          </div>
        </div>
      </div>

      <div className="p-3 rounded-lg border" style={{ 
        background: 'var(--card-bg)',
        borderColor: 'var(--border-color)'
      }}>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Last Updated
          </span>
        </div>
        <div className="space-y-2">
          <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {formatDate(pitak.updatedAt, 'MMM dd, yyyy HH:mm')}
          </div>
          <div className="text-xs pt-2" style={{ color: 'var(--text-tertiary)' }}>
            ID: {pitak.id}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors border-b border-gray-200">
        <td className="p-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300 focus:ring-blue-500"
            style={{ borderColor: 'var(--border-color)' }}
          />
        </td>
        <td className="p-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-green-light)' }}>
              <MapPin className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            </div>
            <div className="min-w-0">
              <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                {pitak.location || 'No location'}
              </div>
              {pitak.stats && (
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    <Package className="w-3 h-3 inline mr-1" />
                    {pitak.stats.assignments.total} assignments
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    <Users className="w-3 h-3 inline mr-1" />
                    {pitak.stats.assignments.active} active
                  </span>
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
            <span className="text-sm truncate" style={{ color: 'var(--text-secondary)', maxWidth: '150px' }}>
              {pitak.bukid?.name || `Bukid #${pitak.bukidId}`}
            </span>
          </div>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
            <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
              {formatNumber(pitak.totalLuwang)}
            </span>
          </div>
          {pitak.stats && (
            <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
              Used: {formatNumber(pitak.stats.assignments.totalLuWangAssigned)} ({pitak.stats.utilizationRate?.toFixed(1) || 0}%)
            </div>
          )}
        </td>
        <td className="p-3">
          {getStatusBadge(pitak.status)}
        </td>
        <td className="p-3">
          <div className="text-sm whitespace-nowrap" style={{ color: 'var(--text-secondary)' }}>
            {formatDate(pitak.createdAt, 'MMM dd, yyyy')}
          </div>
        </td>
        <td className="p-3">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onView(pitak.id)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
            </button>
            <button
              onClick={() => onEdit(pitak.id)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4" style={{ color: 'var(--accent-gold)' }} />
            </button>
            
            {/* Updated Actions Dropdown with Windows-friendly design */}
            <PitakActionsDropdown
              pitak={pitak}
              onAssign={() => onAssign(pitak.id, pitak)}
              // onViewAssignments={() => onViewPitakAssignments(pitak.id)}
              onViewAssignedWorkers={() => onViewAssignedWorkers(pitak.id, pitak.location)}
              onUpdateLuWang={() => onUpdateLuWang(pitak.id, pitak.totalLuwang)}
              onViewReport={() => onViewReport(pitak.id)}
              onUpdateStatus={() => onUpdateStatus(pitak.id, pitak.status)}
              onMarkAsHarvested={() => onMarkAsHarvested(pitak.id)}
              onDelete={() => onDelete(pitak.id)}
              // New assignment viewing options
              onViewAssignments={() => {
                // Get first assignment ID if available
                const firstAssignment = pitak.assignments?.[0];
                if (firstAssignment) {
                  onViewAssignment(firstAssignment.id);
                } else {
                  // Fallback to viewing all assignments
                  onViewPitakAssignments(pitak.id);
                }
              }}
            />
            
            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="More Details"
            >
              <ChevronRight className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </td>
      </tr>
      
      {/* Expanded Row */}
      {isExpanded && (
        <tr>
          <td colSpan={7} className="p-0 border-b border-gray-200">
            <div className="px-4 py-3" style={{ background: 'var(--card-secondary-bg)' }}>
              <ExpandedView />
            </div>
          </td>
        </tr>
      )}
    </>
  );
};

export default PitakTableRow;