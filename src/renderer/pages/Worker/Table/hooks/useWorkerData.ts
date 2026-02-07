// components/Worker/hooks/useWorkerData.ts
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import workerAPI, { 
  type WorkerData, 
  type WorkerListResponse, 
  type WorkerResponse, 
  type WorkerStats,
  type WorkerSearchParams 
} from "../../../../apis/worker";
import { showError } from "../../../../utils/notification";

export const useWorkerData = () => {
  const [allWorkers, setAllWorkers] = useState<WorkerData[]>([]);
  const [workers, setWorkers] = useState<WorkerData[]>([]);
  const [stats, setStats] = useState<WorkerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [limit] = useState(20);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kabisilyaFilter, setKabisilyaFilter] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedWorkers, setSelectedWorkers] = useState<number[]>([]);

  // Sorting
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"ASC" | "DESC">("ASC");

  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchWorkers = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      // Build search parameters
      const searchParams: WorkerSearchParams = {
        query: searchQuery.trim(),
        page: currentPage,
        limit,
        sortBy,
        sortOrder,
        ...(statusFilter !== "all" && { status: statusFilter }),
      };

      let response: WorkerResponse<WorkerListResponse>;
      
      if (searchQuery.trim()) {
        // Use search endpoint when there's a query
        response = await workerAPI.searchWorkers(searchParams);
      } else if (statusFilter !== "all") {
        // Use status filter endpoint
        response = await workerAPI.getWorkerByStatus(statusFilter, {
          page: currentPage,
          limit
        });
      } else {
        // Get all workers
        response = await workerAPI.getAllWorkers({
          page: currentPage,
          limit,
          sortBy,
          sortOrder,
        });
      }

      if (!response.status) {
        throw new Error(response.message || "Failed to fetch workers");
      }

      if (response.data) {
        const items = response.data.workers;
        const pagination = response.data.pagination;
        
        setAllWorkers(items);
        setTotalItems(pagination.total);
        setTotalPages(pagination.totalPages);
        
        // Update stats if available in response
        if (response.data.stats) {
          setStats(response.data.stats);
        }
      }
    } catch (err: any) {
      setError(err?.message ?? "Unknown error");
      showError(err?.message ?? "Failed to fetch workers");
      console.error("Failed to fetch workers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [
    currentPage,
    limit,
    searchQuery,
    statusFilter,
    sortBy,
    sortOrder,
  ]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await workerAPI.getWorkerStats();
      if (response?.status && response.data) {
        setStats(response.data.stats);
      }
    } catch (err) {
      console.error("Failed to fetch worker stats:", err);
    }
  }, []);

  // Sorting
  const sortedWorkers = useMemo(() => {
    const arr = [...allWorkers];
    arr.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case "name":
          aValue = (a.name || "").toLowerCase();
          bValue = (b.name || "").toLowerCase();
          break;
        case "status":
          aValue = a.status || "";
          bValue = b.status || "";
          break;
        case "createdAt":
          aValue = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          bValue = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          break;
        case "hireDate":
          aValue = a.hireDate ? new Date(a.hireDate).getTime() : 0;
          bValue = b.hireDate ? new Date(b.hireDate).getTime() : 0;
          break;
        default:
          aValue = a.id ?? 0;
          bValue = b.id ?? 0;
      }

      if (aValue === bValue) return 0;
      if (sortOrder === "ASC") return aValue > bValue ? 1 : -1;
      return aValue < bValue ? 1 : -1;
    });
    return arr;
  }, [allWorkers, sortBy, sortOrder]);

  // Pagination: derive visible workers
  useEffect(() => {
    const startIdx = (currentPage - 1) * limit;
    const endIdx = startIdx + limit;
    setWorkers(sortedWorkers.slice(startIdx, endIdx));
  }, [sortedWorkers, currentPage, limit]);

  // Initial load
  useEffect(() => {
    fetchWorkers();
    fetchStats();
  }, [fetchWorkers, fetchStats]);

  // Debounced search: reset to page 1 and fetch
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setCurrentPage(1);
      fetchWorkers();
    }, 500);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [searchQuery, fetchWorkers]);

  // Handle filter changes
  useEffect(() => {
    setCurrentPage(1);
    fetchWorkers();
  }, [statusFilter, sortBy, sortOrder]);

  // Reset selections on page change
  useEffect(() => {
    setSelectedWorkers([]);
  }, [currentPage]);

  const handleRefresh = useCallback(() => {
    fetchWorkers();
  }, [fetchWorkers]);

  const handleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortOrder((prev) => (prev === "ASC" ? "DESC" : "ASC"));
      } else {
        setSortBy(field);
        setSortOrder("ASC");
      }
      setCurrentPage(1);
    },
    [sortBy],
  );

  // Handle page change with fetch
  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page);
    fetchWorkers();
  }, [fetchWorkers]);

  return {
    // Data
    workers,
    allWorkers,
    stats,
    
    // Loading states
    loading,
    refreshing,
    error,
    
    // Pagination
    currentPage,
    totalPages,
    totalItems,
    limit,
    handlePageChange,
    
    // Filters
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    kabisilyaFilter,
    setKabisilyaFilter,
    viewMode,
    setViewMode,
    
    // Selection
    selectedWorkers,
    setSelectedWorkers,
    
    // Sorting
    sortBy,
    setSortBy,
    sortOrder,
    setSortOrder,
    handleSort,
    
    // Actions
    fetchWorkers,
    handleRefresh,
    setCurrentPage,
  };
};