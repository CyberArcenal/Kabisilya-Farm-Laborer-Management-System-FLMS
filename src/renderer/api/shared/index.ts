// src/renderer/api/shared/index.ts
// Common types shared across all API modules

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  pagination: PaginationInfo;
}

export interface ApiResponse<T = any> {
  status: boolean;
  message: string;
  data: T;
}

export interface ApiError {
  status: false;
  message: string;
  data?: null;
}

// Common filter options that can be extended
export interface BaseFilters {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "ASC" | "DESC";
  includeDeleted?: boolean;
  search?: string;
}