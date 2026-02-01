import React, { useState } from 'react';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
import PitakTableRow from './PitakTableRow';
import type { PitakWithDetails } from '../../../../apis/pitak';

interface PitakTableViewProps {
  pitaks: PitakWithDetails[];
  selectedPitaks: number[];
  toggleSelectAll: () => void;
  toggleSelectPitak: (id: number) => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, location?: string) => void;
  onAssign: (id: number, pitakData: any) => void;
  onUpdateLuWang: (id: number, totalLuwang: number) => void;
  onViewAssignedWorkers: (id: number) => void;
  onViewReport: (id: number) => void;
  onMarkAsHarvested: (id: number) => void;
  onUpdateStatus: (id: number, currentStatus: string) => void;
  // New props for assignment viewing
  onViewAssignment: (assignmentId: number) => void;
  onViewPitakAssignments: (pitakId: number) => void;
}

const PitakTableView: React.FC<PitakTableViewProps> = ({
  pitaks,
  selectedPitaks,
  toggleSelectAll,
  toggleSelectPitak,
  onView,
  onEdit,
  onDelete,
  onAssign,
  onUpdateLuWang,
  onViewAssignedWorkers,
  onViewReport,
  onMarkAsHarvested,
  onUpdateStatus,
  // New props
  onViewAssignment,
  onViewPitakAssignments,
}) => {
  const [expandedPitak, setExpandedPitak] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<string>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const toggleExpandPitak = (id: number) => {
    setExpandedPitak(prev => prev === id ? null : id);
  };

  const handleOnUpdateLuWang = (id: number, totalLuwang: number | null = null) => {
    if (totalLuwang === null) return;
    onUpdateLuWang(id, totalLuwang);
  }

  const handleOnAssign = (id: number, pitakData: any = null) => {
    if (pitakData === null) return;
    onAssign(id, pitakData);
  }

  const handleOnDelete = (id: number) => {
    const pitak = pitaks.find(p => p.id === id);
    onDelete(id, pitak?.location as string);
  }

  return (
    <div className="pitak-table-container">
      <div className="pitak-table-wrapper">
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedPitaks.length === pitaks.length && pitaks.length > 0}
                      onChange={toggleSelectAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <button
                      onClick={() => handleSort('location')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Location
                      {sortBy === 'location' && (
                        <ChevronRightIcon className={`w-3 h-3 transform ${sortOrder === 'asc' ? 'rotate-90' : '-rotate-90'}`} />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Bukid
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <button
                      onClick={() => handleSort('totalLuwang')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Luwang Capacity
                      {sortBy === 'totalLuwang' && (
                        <ChevronRightIcon className={`w-3 h-3 transform ${sortOrder === 'asc' ? 'rotate-90' : '-rotate-90'}`} />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-1 hover:text-gray-700"
                    >
                      Created
                      {sortBy === 'createdAt' && (
                        <ChevronRightIcon className={`w-3 h-3 transform ${sortOrder === 'asc' ? 'rotate-90' : '-rotate-90'}`} />
                      )}
                    </button>
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {pitaks.map((pitak) => (
                  <PitakTableRow
                    key={pitak.id}
                    pitak={pitak}
                    isSelected={selectedPitaks.includes(pitak.id)}
                    isExpanded={expandedPitak === pitak.id}
                    onSelect={() => toggleSelectPitak(pitak.id)}
                    onToggleExpand={() => toggleExpandPitak(pitak.id)}
                    onView={onView}
                    onEdit={onEdit}
                    onDelete={handleOnDelete}
                    onAssign={handleOnAssign}
                    onUpdateLuWang={handleOnUpdateLuWang}
                    onViewAssignedWorkers={onViewAssignedWorkers}
                    onViewReport={onViewReport}
                    onMarkAsHarvested={onMarkAsHarvested}
                    onUpdateStatus={onUpdateStatus}
                    // Pass new props
                    onViewAssignment={onViewAssignment}
                    onViewPitakAssignments={onViewPitakAssignments}
                 
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PitakTableView;