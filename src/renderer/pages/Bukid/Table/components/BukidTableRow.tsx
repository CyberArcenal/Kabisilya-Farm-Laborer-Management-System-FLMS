// components/Bukid/components/BukidTableRow.tsx
import React, { useRef, useEffect, useState } from 'react';
import {
  Home, MapPin, Package, ChevronRight,
  Eye, Edit, Trash2, CheckCircle, XCircle,
  Clock, Sprout, MoreVertical, Users,
  FileText, UserPlus, History
} from 'lucide-react';
import { formatDate } from '../../../../utils/formatters';
import type { BukidData, BukidSummaryData } from '../../../../apis/bukid';
import BukidActionsDropdown from './BukidActionsDropdown';

interface BukidTableRowProps {
  bukid: BukidData;
  bukidSummary: BukidSummaryData | undefined;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, name: string) => void;
  onUpdateStatus: (id: number, currentStatus: string) => void;
  onAddNote: (id: number) => void;
  onViewStats: (id: number) => void;
  onImportCSV: (id: number) => void;
  onExportCSV: (id: number) => void;
}

const BukidTableRow: React.FC<BukidTableRowProps> = ({
  bukid,
  bukidSummary,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddNote,
  onViewStats,
  onImportCSV,
  onExportCSV,
}) => {
  const [showActionsDropdown, setShowActionsDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

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
      pending: {
        text: 'Pending',
        bg: 'var(--status-growing-bg)',
        color: 'var(--status-growing)',
        border: 'rgba(214, 158, 46, 0.3)',
        icon: XCircle
      }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.active;
    const Icon = config.icon;

    return (
      <span
        className="px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1"
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setShowActionsDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleActionClick = (action: () => void) => {
    action();
    setShowActionsDropdown(false);
  };

  // Get dropdown position
  const getDropdownPosition = () => {
    if (!buttonRef.current) return {};

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 280; // Estimated height of dropdown
    const windowHeight = window.innerHeight;

    // Check if dropdown would overflow bottom of window
    if (rect.bottom + dropdownHeight > windowHeight) {
      // Show above the button
      return {
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }

    // Show below the button
    return {
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  };

  const ExpandedView = () => (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <div className="p-3 rounded-lg" style={{ background: 'var(--card-bg)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Package className="w-4 h-4" style={{ color: 'var(--accent-sky)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Assignments
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Active:</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {bukidSummary?.activeAssignments || 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total:</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {bukidSummary?.assignmentCount || 0}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg" style={{ background: 'var(--card-bg)' }}>
        <div className="flex items-center gap-2 mb-2">
          <MapPin className="w-4 h-4" style={{ color: 'var(--accent-earth)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Pitaks
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total:</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {bukidSummary?.pitakCount || 0}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Luwang:</span>
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {bukidSummary?.totalLuwang || 0}
          </span>
        </div>
      </div>

      <div className="p-3 rounded-lg" style={{ background: 'var(--card-bg)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Clock className="w-4 h-4" style={{ color: 'var(--accent-purple)' }} />
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            Last Updated
          </span>
        </div>
        <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          {formatDate(bukid.updatedAt, 'MMM dd, yyyy HH:mm')}
        </div>
      </div>
    </div>
  );
  return (
    <>
      <tr className="hover:bg-gray-50 transition-colors"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        <td className="p-4">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="rounded border-gray-300"
          />
        </td>
        <td className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ background: 'var(--accent-green-light)' }}>
              <Home className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
            </div>
            <div>
              <div className="font-medium" style={{ color: 'var(--text-primary)' }}>
                {bukid.name}
              </div>
              {bukidSummary && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    <Package className="w-3 h-3 inline mr-1" />
                    {bukidSummary.assignmentCount} assignments
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                    <MapPin className="w-3 h-3 inline mr-1" />
                    {bukidSummary.pitakCount} pitaks
                  </span>
                </div>
              )}
            </div>
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-600">
              {bukid.location || 'No location'}
            </span>
          </div>
        </td>
        <td className="p-4">
          {getStatusBadge(bukid.status)}
        </td>
        <td className="p-4">
          <div className="text-sm text-gray-600">
            {formatDate(bukid.createdAt, 'MMM dd, yyyy')}
          </div>
        </td>
        <td className="p-4">
          <div className="flex items-center gap-2">
            {/* Quick action buttons */}
            <button
              onClick={() => onView(bukid.id!)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="View Details"
            >
              <Eye className="w-4 h-4 text-blue-500" />
            </button>
            <button
              onClick={() => onEdit(bukid.id!)}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="Edit"
            >
              <Edit className="w-4 h-4 text-yellow-500" />
            </button>


            <BukidActionsDropdown bukid={bukid} onAddNote={onAddNote} onView={onView} onEdit={onEdit} onDelete={onDelete} onUpdateStatus={onUpdateStatus} onViewStats={onViewStats}  onImportCSV={onImportCSV} onExportCSV={onExportCSV} />

            <button
              onClick={onToggleExpand}
              className="p-1.5 rounded hover:bg-gray-100 transition-colors"
              title="More Details"
            >
              <ChevronRight className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
            </button>
          </div>
        </td>
      </tr>

      {/* Expanded Row */}
      {isExpanded && bukidSummary && (
        <tr>
          <td colSpan={6} className="p-4 bg-gray-50">
            <ExpandedView />
          </td>
        </tr>
      )}
    </>
  );
};

export default BukidTableRow;