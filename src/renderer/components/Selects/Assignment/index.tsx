// components/AssignmentSelect.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown, Loader, Calendar, Filter, User } from 'lucide-react';
import type { Assignment } from '../../../apis/assignment';
import assignmentAPI from '../../../apis/assignment';
import workerAPI from '../../../apis/worker'; // Import workerAPI

interface AssignmentSelectProps {
  value: number | null;
  onChange: (assignmentId: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  includeWorkerFilter?: boolean; // New prop to optionally show worker filter
}

const AssignmentSelect: React.FC<AssignmentSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select an assignment',
  includeWorkerFilter = true // Default to true
}) => {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [filteredAssignments, setFilteredAssignments] = useState<Assignment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [workerFilter, setWorkerFilter] = useState<number | null>(null); // New state for worker filter
  const [workers, setWorkers] = useState<any[]>([]); // Store worker list
  const [loadingWorkers, setLoadingWorkers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        setLoading(true);
        const response = await assignmentAPI.getAllAssignments({});
        
        if (response.status && response.data) {
          setAssignments(response.data);
          setFilteredAssignments(response.data);
        }
      } catch (err) {
        console.error('Error fetching assignments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Fetch workers for filter dropdown
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!includeWorkerFilter) return;
      
      try {
        setLoadingWorkers(true);
        const response = await workerAPI.getAllWorkers({ limit: 100 });
        
        if (response.status && response.data && response.data.workers) {
          setWorkers(response.data.workers);
        }
      } catch (err) {
        console.error('Error fetching workers:', err);
      } finally {
        setLoadingWorkers(false);
      }
    };

    fetchWorkers();
  }, [includeWorkerFilter]);

  // Filter assignments based on worker filter and search term
  useEffect(() => {
    let filtered = assignments;
    
    // First filter by worker if selected
    if (workerFilter) {
      filtered = filtered.filter(assignment => 
        assignment.worker && assignment.worker.id === workerFilter
      );
    }
    
    // Then filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(assignment =>
        assignment.worker?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.pitak?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assignment.assignmentDate.includes(searchTerm) ||
        assignment.status.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredAssignments(filtered);
  }, [searchTerm, assignments, workerFilter]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get worker name for display
  const getWorkerName = (workerId: number) => {
    const worker = workers.find(w => w.id === workerId);
    return worker ? worker.name : `Worker #${workerId}`;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleWorkerFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setWorkerFilter(value ? parseInt(value) : null);
  };

  const handleSelect = (assignmentId: number) => {
    onChange(assignmentId);
    setIsOpen(false);
    setSearchTerm('');
    setWorkerFilter(null); // Reset filter after selection
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleClearFilters = () => {
    setWorkerFilter(null);
    setSearchTerm('');
  };

  const selectedAssignment = assignments.find(a => a.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-3 rounded-lg text-left flex justify-between items-center text-sm ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
        }`}
        style={{
          backgroundColor: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--text-primary)',
          minHeight: '44px'
        }}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedAssignment ? (
            <>
              <Calendar className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
              <div className="truncate">
                <div className="font-medium">
                  {selectedAssignment.worker?.name || 'Unassigned'}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {new Date(selectedAssignment.assignmentDate).toLocaleDateString()} • {selectedAssignment.pitak?.name || 'No plot'}
                </div>
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedAssignment && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-gray-100 rounded"
              style={{ color: 'var(--accent-rust)' }}
            >
              ×
            </button>
          )}
          <ChevronDown
            className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
            style={{ color: 'var(--text-secondary)' }}
          />
        </div>
      </button>

      {isOpen && (
        <div
          className="absolute z-50 w-full mt-1 rounded-lg shadow-lg"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--border-color)',
            maxHeight: '400px',
            overflow: 'hidden'
          }}
        >
          {/* Worker Filter */}
          {includeWorkerFilter && (
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Filter by Worker
                    </span>
                  </div>
                  {(workerFilter || searchTerm) && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-xs px-2 py-1 rounded hover:bg-gray-100"
                      style={{ color: 'var(--accent-rust)' }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
                <select
                  value={workerFilter || ''}
                  onChange={handleWorkerFilterChange}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  disabled={loadingWorkers}
                >
                  <option value="">All Workers</option>
                  {loadingWorkers ? (
                    <option disabled>Loading workers...</option>
                  ) : (
                    workers.map((worker) => (
                      <option key={worker.id} value={worker.id}>
                        {worker.name} {worker.contact ? `(${worker.contact})` : ''}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" 
                       style={{ color: 'var(--text-secondary)' }} />
                <input
                  type="text"
                  placeholder="Search assignments by worker, plot, date, or status..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  className="w-full pl-9 pr-3 py-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Show filters summary */}
          {(workerFilter || searchTerm) && filteredAssignments.length > 0 && (
            <div className="px-3 py-2 text-xs border-b" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                Showing {filteredAssignments.length} assignment{filteredAssignments.length !== 1 ? 's' : ''}
                {workerFilter && ` for ${getWorkerName(workerFilter)}`}
                {searchTerm && ` matching "${searchTerm}"`}
              </div>
            </div>
          )}

          {loading && (
            <div className="p-4 text-center">
              <Loader className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--accent-green)' }} />
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Loading assignments...
              </p>
            </div>
          )}

          {!loading && (
            <div className="max-h-60 overflow-y-auto">
              {filteredAssignments.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {searchTerm || workerFilter ? 'No assignments found matching your criteria' : 'No assignments available'}
                  </div>
                  {(searchTerm || workerFilter) && (
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className="text-sm px-3 py-1 rounded hover:bg-gray-100"
                      style={{ color: 'var(--accent-green)' }}
                    >
                      Clear filters
                    </button>
                  )}
                </div>
              ) : (
                filteredAssignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    type="button"
                    onClick={() => handleSelect(assignment.id)}
                    className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${
                      assignment.id === value ? 'bg-gray-50' : ''
                    }`}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                      assignment.id === value ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                    }`}>
                      {assignment.id === value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <User className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                      <div className="flex-1 text-left min-w-0">
                        <div className="font-medium text-sm truncate">
                          {assignment.worker?.name || 'Unassigned'}
                        </div>
                        <div className="text-xs flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                          <span className="truncate">{assignment.pitak?.name || 'No plot'}</span>
                          <span>•</span>
                          <span>{new Date(assignment.assignmentDate).toLocaleDateString()}</span>
                          <span>•</span>
                          <span className={`px-1 rounded ${
                            assignment.status === 'active' ? 'bg-green-100 text-green-800' :
                            assignment.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {assignment.status}
                          </span>
                        </div>
                      </div>
                      {assignment.luwangCount && (
                        <div className="text-xs font-medium px-2 py-1 rounded bg-gray-100" style={{ color: 'var(--text-secondary)' }}>
                          {assignment.luwangCount} luwang
                        </div>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AssignmentSelect;