// components/Bukid/hooks/useBukidData.ts
import { useState, useEffect, useCallback } from 'react';
import type { BukidData, BukidFilters, BukidStatsData, BukidSummaryData } from '../../../../apis/bukid';
import bukidAPI from '../../../../apis/bukid';
import { showError } from '../../../../utils/notification';

export const useBukidData = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data states
  const [bukids, setBukids] = useState<BukidData[]>([]);
  const [summary, setSummary] = useState<BukidSummaryData[]>([]);
  const [stats, setStats] = useState<BukidStatsData | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  // View options
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedBukids, setSelectedBukids] = useState<number[]>([]);

  // Fetch bukid data
  const fetchBukids = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: BukidFilters = {
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };

      let response;
      if (searchQuery.trim()) {
        response = await bukidAPI.search(searchQuery, filters);
      } else {
        response = await bukidAPI.getAll(filters);
      }

      if (response.status) {
        setBukids(response.data.bukids || []);
        setTotalPages(response.data.pagination.totalPages);
        setTotalItems(response.data.pagination.total);
      } else {
        throw new Error(response.message || 'Failed to fetch bukid data');
      }

    } catch (err: any) {
      setError(err.message);
      showError(err.message);
      console.error('Failed to fetch bukid data:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, limit, searchQuery, statusFilter, sortBy, sortOrder]);

  // Fetch summary and stats
  const fetchSummaryAndStats = async () => {
    try {
      const [summaryRes, statsRes] = await Promise.all([
        bukidAPI.getStats(),
        bukidAPI.getActive({ limit: 5 })
      ]);

      if (summaryRes.status) {
        setStats(summaryRes.data.summary);
      }

      if (statsRes.status && statsRes.data.bukids) {
        const summaryData = await Promise.all(
          statsRes.data.bukids.map(async (bukid) => {
            try {
              const summary = await bukidAPI.getSummary(bukid.id!);
              return summary.status ? summary.data.summary : null;
            } catch {
              return null;
            }
          })
        );
        setSummary(summaryData.filter(Boolean) as BukidSummaryData[]);
      }
    } catch (err) {
      console.error('Failed to fetch summary/stats:', err);
    }
  };

  // Initial load
  useEffect(() => {
    fetchBukids();
    fetchSummaryAndStats();
  }, [fetchBukids]);

  // Search handler with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (currentPage !== 1) {
        setCurrentPage(1);
      } else {
        fetchBukids();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, fetchBukids]);

  // Refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchBukids(), fetchSummaryAndStats()]);
  };

  return {
    bukids,
    summary,
    stats,
    loading,
    refreshing,
    error,
    currentPage,
    totalPages,
    totalItems,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    viewMode,
    setViewMode,
    selectedBukids,
    setSelectedBukids,
    fetchBukids,
    handleRefresh,
    setCurrentPage,
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder
  };
};