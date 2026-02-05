// components/PitakSelect.tsx
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ChevronDown, Loader, Layers, Filter } from 'lucide-react';
import type { PitakData } from '../../../apis/pitak';
import pitakAPI from '../../../apis/pitak';
import bukidAPI from '../../../apis/bukid'; // Import bukidAPI

interface PitakSelectProps {
  value: number | null;
  onChange: (pitakId: number | null) => void;
  disabled?: boolean;
  placeholder?: string;
  includeBukidFilter?: boolean; // New prop to optionally show bukid filter
}

const PitakSelect: React.FC<PitakSelectProps> = ({
  value,
  onChange,
  disabled = false,
  placeholder = 'Select a plot',
  includeBukidFilter = true // Default to true
}) => {
  const [pitaks, setPitaks] = useState<PitakData[]>([]);
  const [filteredPitaks, setFilteredPitaks] = useState<PitakData[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bukidFilter, setBukidFilter] = useState<number | null>(null); // New state for bukid filter
  const [bukids, setBukids] = useState<any[]>([]); // Store bukid list
  const [loadingBukids, setLoadingBukids] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch pitaks
  useEffect(() => {
    const fetchPitaks = async () => {
      try {
        setLoading(true);
        const response = await pitakAPI.getAllPitaks({});

        if (response.status && response.data) {
          const pitakList = Array.isArray(response.data) ? response.data : response.data || [];
          setPitaks(pitakList);
          setFilteredPitaks(pitakList);
        }
      } catch (err) {
        console.error('Error fetching plots:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPitaks();
  }, []);

  // Fetch bukids for filter dropdown
  useEffect(() => {
    const fetchBukids = async () => {
      if (!includeBukidFilter) return;
      
      try {
        setLoadingBukids(true);
        const response = await bukidAPI.getAll({ limit: 100 });
        
        if (response.status && response.data && response.data.bukids) {
          setBukids(response.data.bukids);
        }
      } catch (err) {
        console.error('Error fetching farms:', err);
      } finally {
        setLoadingBukids(false);
      }
    };

    fetchBukids();
  }, [includeBukidFilter]);

  // Filter pitaks based on bukid filter and search term
  useEffect(() => {
    let filtered = pitaks;
    
    // First filter by bukid if selected
    if (bukidFilter) {
      filtered = filtered.filter(pitak => 
        pitak.bukid && pitak.bukid.id === bukidFilter
      );
    }
    
    // Then filter by search term
    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(pitak =>
        pitak.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pitak.status?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (pitak.bukid?.name?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredPitaks(filtered);
  }, [searchTerm, pitaks, bukidFilter]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Get bukid name for display
  const getBukidName = (bukidId: number) => {
    const bukid = bukids.find(b => b.id === bukidId);
    return bukid ? bukid.name : `Farm #${bukidId}`;
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  const handleBukidFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setBukidFilter(value ? parseInt(value) : null);
  };

  const handleSelect = (pitakId: number) => {
    onChange(pitakId);
    setIsOpen(false);
    setSearchTerm('');
    setBukidFilter(null); // Reset filter after selection
  };

  const handleClear = () => {
    onChange(null);
  };

  const handleClearFilters = () => {
    setBukidFilter(null);
    setSearchTerm('');
  };

  const selectedPitak = pitaks.find(p => p.id === value);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`w-full p-3 rounded-lg text-left flex justify-between items-center text-sm ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
          }`}
        style={{
          backgroundColor: 'var(--input-bg)',
          border: '1px solid var(--input-border)',
          color: 'var(--text-primary)',
          minHeight: '44px'
        }}
      >
        <div className="flex items-center gap-2 truncate">
          {selectedPitak ? (
            <>
              <Layers className="w-4 h-4" style={{ color: 'var(--accent-green)' }} />
              <div className="truncate">
                <div className="font-medium">{selectedPitak.location || `Plot #${selectedPitak.id}`}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {selectedPitak.bukid?.name ? `Farm: ${selectedPitak.bukid.name}` : ''}
                </div>
              </div>
            </>
          ) : (
            <span style={{ color: 'var(--text-secondary)' }}>{placeholder}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {selectedPitak && (
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
          {/* Bukid Filter */}
          {includeBukidFilter && (
            <div className="p-3 border-b" style={{ borderColor: 'var(--border-color)' }}>
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                      Filter by Farm
                    </span>
                  </div>
                  {(bukidFilter || searchTerm) && (
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
                  value={bukidFilter || ''}
                  onChange={handleBukidFilterChange}
                  className="w-full p-2 rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    border: '1px solid var(--input-border)',
                    color: 'var(--text-primary)'
                  }}
                  disabled={loadingBukids}
                >
                  <option value="">All Farms</option>
                  {loadingBukids ? (
                    <option disabled>Loading farms...</option>
                  ) : (
                    bukids.map((bukid) => (
                      <option key={bukid.id} value={bukid.id}>
                        {bukid.name} {bukid.location ? `(${bukid.location})` : ''}
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
                  placeholder="Search plots by location, status, or farm name..."
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
          {(bukidFilter || searchTerm) && filteredPitaks.length > 0 && (
            <div className="px-3 py-2 text-xs border-b" style={{ borderColor: 'var(--border-light)', backgroundColor: 'var(--bg-secondary)' }}>
              <div style={{ color: 'var(--text-secondary)' }}>
                Showing {filteredPitaks.length} plot{filteredPitaks.length !== 1 ? 's' : ''}
                {bukidFilter && ` in ${getBukidName(bukidFilter)}`}
                {searchTerm && ` matching "${searchTerm}"`}
              </div>
            </div>
          )}

          {loading && (
            <div className="p-4 text-center">
              <Loader className="w-5 h-5 animate-spin mx-auto" style={{ color: 'var(--accent-green)' }} />
              <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                Loading plots...
              </p>
            </div>
          )}

          {!loading && (
            <div className="max-h-60 overflow-y-auto">
              {filteredPitaks.length === 0 ? (
                <div className="p-4 text-center">
                  <div className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                    {searchTerm || bukidFilter ? 'No plots found matching your criteria' : 'No plots available'}
                  </div>
                  {(searchTerm || bukidFilter) && (
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
                filteredPitaks.map((pitak) => (
                  <button
                    key={pitak.id}
                    type="button"
                    onClick={() => handleSelect(pitak.id)}
                    className={`w-full p-3 text-left hover:bg-gray-50 transition-colors flex items-center gap-3 ${pitak.id === value ? 'bg-gray-50' : ''
                      }`}
                    style={{
                      borderBottom: '1px solid var(--border-light)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${pitak.id === value ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
                      }`}>
                      {pitak.id === value && (
                        <div className="w-2 h-2 rounded-full bg-white"></div>
                      )}
                    </div>
                    <Layers className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--accent-green)' }} />
                    <div className="flex-1 text-left min-w-0">
                      <div className="font-medium text-sm truncate">{pitak.location || `Plot #${pitak.id}`}</div>
                      <div className="text-xs flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                        <span className="truncate">{pitak.bukid?.name || `Farm #${pitak.bukid.id}`}</span>
                        <span>•</span>
                        <span>{pitak.status || 'No status'}</span>
                        <span>•</span>
                        <span>{pitak.totalLuwang || 0} luwang</span>
                      </div>
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

export default PitakSelect;