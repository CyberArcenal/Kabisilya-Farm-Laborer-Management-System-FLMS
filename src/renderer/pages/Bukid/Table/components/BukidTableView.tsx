// components/Bukid/components/BukidTableView.tsx
import React, { useState } from 'react';
import { ChevronRight as ChevronRightIcon } from 'lucide-react';
import type { BukidData, BukidSummaryData } from '../../../../apis/bukid';
import BukidTableRow from './BukidTableRow';

interface BukidTableViewProps {
  bukids: BukidData[];
  summary: BukidSummaryData[];
  selectedBukids: number[];
  toggleSelectAll: () => void;
  toggleSelectBukid: (id: number) => void;
  onView: (id: number) => void;
  onEdit: (id: number) => void;
  onDelete: (id: number, name: string) => void;
  onUpdateStatus: (id: number, currentStatus: string) => void;
  onAddNote: (id: number) => void;
  onViewStats: (id: number) => void;
  onImportCSV: (id: number) => void;
  onExportCSV: (id: number) => void;
  sortBy: string;
  sortOrder: 'ASC' | 'DESC';
  onSort: (field: string) => void;
}

const BukidTableView: React.FC<BukidTableViewProps> = ({
  bukids,
  summary,
  selectedBukids,
  toggleSelectAll,
  toggleSelectBukid,
  onView,
  onEdit,
  onDelete,
  onUpdateStatus,
  onAddNote,
  onViewStats,
  onImportCSV,
  onExportCSV,
  sortBy,
  sortOrder,
  onSort
}) => {
  const [expandedBukid, setExpandedBukid] = useState<number | null>(null);

  const toggleExpandBukid = (id: number) => {
    setExpandedBukid(prev => prev === id ? null : id);
  };

  return (
    <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--table-header-bg)' }}>
              <th className="p-4 text-left">
                <input
                  type="checkbox"
                  checked={selectedBukids.length === bukids.length && bukids.length > 0}
                  onChange={toggleSelectAll}
                  className="rounded"
                  style={{ borderColor: 'var(--border-color)' }}
                />
              </th>
              <th className="p-4 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <button
                  onClick={() => onSort('name')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  Name
                  {sortBy === 'name' && (
                    <ChevronRightIcon className={`w-3 h-3 transform ${sortOrder === 'ASC' ? 'rotate-90' : '-rotate-90'}`} />
                  )}
                </button>
              </th>
              <th className="p-4 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Location
              </th>
              <th className="p-4 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Status
              </th>
              <th className="p-4 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                <button
                  onClick={() => onSort('createdAt')}
                  className="flex items-center gap-1 hover:text-primary"
                >
                  Created
                  {sortBy === 'createdAt' && (
                    <ChevronRightIcon className={`w-3 h-3 transform ${sortOrder === 'ASC' ? 'rotate-90' : '-rotate-90'}`} />
                  )}
                </button>
              </th>
              <th className="p-4 text-left text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {bukids.map((bukid) => {
              const bukidSummary = summary.find(s => s.id === bukid.id);
              return (
                <BukidTableRow
                  key={bukid.id}
                  bukid={bukid}
                  bukidSummary={bukidSummary}
                  isSelected={selectedBukids.includes(bukid.id!)}
                  isExpanded={expandedBukid === bukid.id}
                  onSelect={() => toggleSelectBukid(bukid.id!)}
                  onToggleExpand={() => toggleExpandBukid(bukid.id!)}
                  onView={onView}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onUpdateStatus={onUpdateStatus}
                  onAddNote={onAddNote}
                  onViewStats={onViewStats}
                  onImportCSV={onImportCSV}
                  onExportCSV={onExportCSV}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default BukidTableView;