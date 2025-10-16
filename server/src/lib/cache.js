// Simple in-memory cache for dashboard data
let dashboardCache = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 30000; // 30 seconds

// Function to invalidate cache
export const invalidateCache = () => {
  dashboardCache = null;
  cacheTimestamp = 0;
};

// Function to get cache
export const getCache = () => {
  const now = Date.now();
  if (dashboardCache && (now - cacheTimestamp) < CACHE_DURATION) {
    return dashboardCache;
  }
  return null;
};

// Function to set cache
export const setCache = (data) => {
  dashboardCache = data;
  cacheTimestamp = Date.now();
};

// Function to check if cache is valid
export const isCacheValid = () => {
  const now = Date.now();
  return dashboardCache && (now - cacheTimestamp) < CACHE_DURATION;
};
