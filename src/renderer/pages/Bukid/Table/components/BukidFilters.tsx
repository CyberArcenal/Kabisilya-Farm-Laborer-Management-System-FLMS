// components/Bukid/components/BukidFilters.tsx
import React from 'react';
import { Search, RefreshCw, List, Grid } from 'lucide-react';

interface BukidFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  viewMode: 'grid' | 'table';
  setViewMode: (mode: 'grid' | 'table') => void;
  handleRefresh: () => void;
  refreshing: boolean;
  handleStatusFilterChange: (status: string) => void;
}

const BukidFilters: React.FC<BukidFiltersProps> = ({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  viewMode,
  setViewMode,
  handleRefresh,
  refreshing,
  handleStatusFilterChange
}) => {
  return (
    <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-5 rounded-xl"
      style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--border-color)'
      }}
    >
      <div className="flex flex-col sm:flex-row gap-3 flex-1">
        {/* Search */}
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
          <input
            type="text"
            placeholder="Search bukid by name, location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg text-sm"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-2">
          {['all', 'active', 'inactive'].map((status) => (
            <button
              key={status}
              onClick={() => handleStatusFilterChange(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${statusFilter === status ? '' : 'opacity-70 hover:opacity-100'}`}
              style={{
                background: statusFilter === status ? 'var(--primary-color)' : 'var(--card-secondary-bg)',
                color: statusFilter === status ? 'var(--sidebar-text)' : 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* View Toggle */}
        <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-color)' }}>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 ${viewMode === 'table' ? 'bg-gray-100' : 'bg-white'}`}
            style={{ color: viewMode === 'table' ? 'var(--primary-color)' : 'var(--text-secondary)' }}
          >
            <List className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : 'bg-white'}`}
            style={{ color: viewMode === 'grid' ? 'var(--primary-color)' : 'var(--text-secondary)' }}
          >
            <Grid className="w-4 h-4" />
          </button>
        </div>

        {/* Refresh */}
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="p-2 rounded-lg transition-all duration-200 hover:shadow-md"
          style={{
            background: 'var(--card-secondary-bg)',
            color: 'var(--text-secondary)',
            border: '1px solid var(--border-color)'
          }}
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
};

export default BukidFilters;