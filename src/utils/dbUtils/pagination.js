// src/utils/dbUtils/pagination.js

/**
 * Apply pagination to a TypeORM QueryBuilder and return paginated result
 * 
 * @param {import("typeorm").SelectQueryBuilder<any>} qb - QueryBuilder instance
 * @param {Object} options - Pagination options
 * @param {number} [options.page=1] - Page number (1-based)
 * @param {number} [options.limit=50] - Items per page
 * @returns {Promise<{ data: any[], pagination: { page: number, limit: number, total: number, pages: number } }>}
 */
async function paginateQueryBuilder(qb, { page = 1, limit = 50 }) {
  // Normalize and validate
  let safePage = parseInt(page) || 1;
  let safeLimit = parseInt(limit) || 50;
  if (safePage < 1) safePage = 1;
  if (safeLimit < 1) safeLimit = 50;

  // Get total count first (without pagination)
  const total = await qb.getCount();

  // Calculate offset
  const offset = (safePage - 1) * safeLimit;

  // Apply pagination
  qb.skip(offset).take(safeLimit);

  // Get data
  const data = await qb.getMany();

  // Calculate total pages
  const pages = Math.ceil(total / safeLimit);

  return {
    data,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      pages,
    },
  };
}

module.exports = { paginateQueryBuilder };