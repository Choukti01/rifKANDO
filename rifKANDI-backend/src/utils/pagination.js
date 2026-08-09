const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

const parsePositiveInteger = (value, fallback) => {
  const normalized = String(value ?? '');
  if (!/^[1-9]\d*$/.test(normalized)) return fallback;

  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const getPagination = (query = {}, options = {}) => {
  const defaultLimit = options.defaultLimit || DEFAULT_PAGE_SIZE;
  const maxLimit = options.maxLimit || MAX_PAGE_SIZE;
  const page = parsePositiveInteger(query.page, 1);
  const requestedLimit = parsePositiveInteger(query.limit, defaultLimit);
  const limit = Math.min(requestedLimit, maxLimit);

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

const createPaginationMetadata = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
  };
};

module.exports = {
  createPaginationMetadata,
  getPagination,
};
