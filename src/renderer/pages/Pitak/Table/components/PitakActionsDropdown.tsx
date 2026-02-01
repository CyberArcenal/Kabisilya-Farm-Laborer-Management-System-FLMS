// components/Pitak/components/PitakActionsDropdown.tsx
import React, { useRef, useEffect } from 'react';
import {
  User, BookOpen, Layers, FileText,
  CheckCircle, XCircle, Crop, Trash2, MoreVertical,
  Users, History
} from 'lucide-react';

interface PitakActionsDropdownProps {
  pitak: any;
  onAssign: () => void;
  onViewAssignments: () => void;
  onViewAssignedWorkers: () => void;
  onUpdateLuWang: () => void;
  onViewReport: () => void;
  onUpdateStatus: () => void;
  onMarkAsHarvested: () => void;
  onDelete: () => void;
}

const PitakActionsDropdown: React.FC<PitakActionsDropdownProps> = ({
  pitak,
  onAssign,
  onViewAssignments,
  onViewAssignedWorkers,
  onUpdateLuWang,
  onViewReport,
  onUpdateStatus,
  onMarkAsHarvested,
  onDelete
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Adaptive positioning
  const getDropdownPosition = () => {
    if (!buttonRef.current) return {};
    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 320;
    const windowHeight = window.innerHeight;

    if (rect.bottom + dropdownHeight > windowHeight) {
      return {
        bottom: `${windowHeight - rect.top + 5}px`,
        right: `${window.innerWidth - rect.right}px`,
      };
    }
    return {
      top: `${rect.bottom + 5}px`,
      right: `${window.innerWidth - rect.right}px`,
    };
  };

  return (
    <div className="pitak-actions-dropdown-container relative" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors relative z-50"
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
      </button>

      {isOpen && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 min-w-[200px] z-50 max-h-80 overflow-y-auto"
          style={getDropdownPosition()}
        >
          <div className="py-2">
            {/* Header */}
            <div className="px-4 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Pitak Actions
            </div>

            {/* Assignments Section */}
            <div className="px-4 py-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Assignments
            </div>
            <button onClick={() => handleAction(onAssign)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50">
              <User className="w-4 h-4 text-sky-500" /> <span>Assign Worker</span>
            </button>
            <button onClick={() => handleAction(onViewAssignments)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50">
              <BookOpen className="w-4 h-4 text-green-500" /> <span>View Assignments</span>
            </button>
            <button onClick={() => handleAction(onViewAssignedWorkers)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50">
              <Users className="w-4 h-4 text-amber-600" /> <span>Assigned Workers</span>
            </button>

            {/* Management Section */}
            <div className="px-4 py-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Management
            </div>
            <button onClick={() => handleAction(onUpdateLuWang)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50">
              <Layers className="w-4 h-4 text-yellow-500" /> <span>Update LuWang</span>
            </button>
            <button onClick={() => handleAction(onViewReport)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50">
              <FileText className="w-4 h-4 text-blue-500" /> <span>Generate Report</span>
            </button>

            {/* Status Section */}
            <div className="px-4 py-1 text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>
              Status
            </div>
            {pitak.status !== 'completed' && (
              <>
                <button onClick={() => handleAction(onUpdateStatus)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50">
                  {pitak.status === 'active' ? (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" /> <span>Deactivate Pitak</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" /> <span>Activate Pitak</span>
                    </>
                  )}
                </button>
                <button onClick={() => handleAction(onMarkAsHarvested)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-gray-50">
                  <Crop className="w-4 h-4 text-orange-500" /> <span>Mark as Completed</span>
                </button>
              </>
            )}

            {/* Danger Zone */}
            <div className="border-t border-gray-200 my-1"></div>
            <div className="px-4 py-1 text-xs font-medium uppercase tracking-wider text-red-600">
              Danger Zone
            </div>
            <button onClick={() => handleAction(onDelete)} className="flex items-center gap-3 w-full px-4 py-2.5 text-sm hover:bg-red-50 text-red-600">
              <Trash2 className="w-4 h-4" /> <span>Delete Pitak</span>
            </button>

            {/* Footer */}
            <div className="px-4 py-2 text-xs text-gray-400">
              ID: {pitak.id} • Status: {pitak.status}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PitakActionsDropdown;