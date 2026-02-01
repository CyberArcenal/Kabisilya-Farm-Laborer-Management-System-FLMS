// components/Bukid/components/BukidActionsDropdown.tsx
import React, { useRef, useEffect } from 'react';
import {
  Eye, Edit, CheckCircle, XCircle, Trash2,
  FileText, BarChart2, Upload, Download, MoreVertical, PlusCircle
} from 'lucide-react';

interface BukidActionsDropdownProps {
  bukid: any;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onUpdateStatus: (id: number, status: string) => void;
  onDelete: (id: number, name: string) => void;
  onAddNote: (id: number) => void;
  onViewStats: (id: number) => void;
  onImportCSV: (id: number) => void;
  onExportCSV: (id: number) => void;
}

const BukidActionsDropdown: React.FC<BukidActionsDropdownProps> = ({
  bukid,
  onView,
  onEdit,
  onUpdateStatus,
  onDelete,
  onAddNote,
  onViewStats,
  onImportCSV,
  onExportCSV
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleToggle = () => setIsOpen(!isOpen);
  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getDropdownPosition = () => {
    if (!buttonRef.current) return {};

    const rect = buttonRef.current.getBoundingClientRect();
    const dropdownHeight = 400;
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
    <div className="bukid-actions-dropdown-container" ref={dropdownRef}>
      <button
        ref={buttonRef}
        onClick={handleToggle}
        className="p-1.5 rounded hover:bg-gray-100 transition-colors relative"
        title="More Actions"
      >
        <MoreVertical className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
      </button>

      {isOpen && (
        <div
          className="fixed bg-white rounded-lg shadow-xl border border-gray-200 w-64 z-50 max-h-96 overflow-y-auto"
          style={getDropdownPosition()}
        >
          <div className="py-1">
            {/* General */}
            <button onClick={() => handleAction(() => onView(bukid.id))} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
              <Eye className="w-4 h-4 text-sky-500" /> <span>View Details</span>
            </button>
            <button onClick={() => handleAction(() => onEdit(bukid.id))} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
              <Edit className="w-4 h-4 text-yellow-500" /> <span>Edit Bukid</span>
            </button>
            <button onClick={() => handleAction(() => onAddNote(bukid.id))} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
              <FileText className="w-4 h-4 text-blue-500" /> <span>Add Note</span>
            </button>

            {/* Status */}
            <button onClick={() => handleAction(() => onUpdateStatus(bukid.id, bukid.status === 'active' ? 'inactive' : 'active'))} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
              {bukid.status === 'active' ? (
                <>
                  <XCircle className="w-4 h-4 text-red-500" /> <span>Deactivate</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 text-green-500" /> <span>Activate</span>
                </>
              )}
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Statistics */}
            <button onClick={() => handleAction(() => onViewStats(bukid.id))} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
              <BarChart2 className="w-4 h-4 text-purple-500" /> <span>View Stats</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Batch / Import / Export */}
            <button onClick={() => handleAction(() => onImportCSV(bukid.id))} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
              <Upload className="w-4 h-4 text-blue-600" /> <span>Import CSV</span>
            </button>
            <button onClick={() => handleAction(() => onExportCSV(bukid.id))} className="w-full flex items-center gap-2 px-4 py-2 text-sm hover:bg-gray-100">
              <Download className="w-4 h-4 text-green-600" /> <span>Export CSV</span>
            </button>

            {/* Divider */}
            <div className="border-t border-gray-200 my-1"></div>

            {/* Delete */}
            <button onClick={() => handleAction(() => onDelete(bukid.id, bukid.name))} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50">
              <Trash2 className="w-4 h-4" /> <span>Delete Bukid</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BukidActionsDropdown;