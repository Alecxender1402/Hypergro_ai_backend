const { getRedisClient } = require('../config/redis');

// Default cache TTL in seconds
const DEFAULT_TTL = 3600; // 1 hour

/**
 * Cache middleware for API responses
 * @param {number} ttl Time to live in seconds
 */
exports.cache = (ttl = DEFAULT_TTL) => {
  return async (req, res, next) => {
    // Skip caching for non-GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    const redisClient = getRedisClient();
    
    // Skip caching if Redis isn't available
    if (!redisClient) {
      console.log('Redis not available, skipping cache for', req.originalUrl);
      return next();
    }
    
    try {
      // Generate unique cache key based on URL and query parameters
      const cacheKey = `cache:${req.originalUrl}`;
      
      console.log(`Checking cache for key: ${cacheKey}`);
      const cachedResponse = await redisClient.get(cacheKey);
      
      if (cachedResponse) {
        // Cache hit - return cached data
        console.log(`Cache hit for ${cacheKey}`);
        return res.json(JSON.parse(cachedResponse));
      }
      
      console.log(`Cache miss for ${cacheKey}`);
      
      // Cache miss - store the original res.json method
      const originalJson = res.json;
      
      // Override res.json to cache successful responses
      res.json = function(body) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            console.log(`Caching response for ${cacheKey} with TTL ${ttl}s`);
            redisClient.setex(cacheKey, ttl, JSON.stringify(body))
              .catch(err => console.error(`Redis caching error: ${err.message}`));
          } catch (err) {
            console.error(`Could not cache response: ${err.message}`);
          }
        }
        
        // Call the original json method
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error) {
      console.error(`Cache middleware error: ${error.message}`);
      // Continue without caching if there's an error
      next();
    }
  };
};

/**
 * Cache invalidation function - removes cached data matching patterns
 * @param {Array} patterns URL patterns to invalidate
 */
exports.invalidateCache = async (patterns = []) => {
  const redisClient = getRedisClient();
  
  if (!redisClient) {
    console.log('Redis not available, skipping cache invalidation');
    return;
  }
  
  try {
    for (const pattern of patterns) {
      const searchPattern = `cache:${pattern}*`;
      console.log(`Searching for cache keys matching: ${searchPattern}`);
      
      // Find all keys matching the pattern
      const keys = await redisClient.keys(searchPattern);
      
      if (keys.length > 0) {
        console.log(`Found ${keys.length} keys to invalidate`);
        await redisClient.del(keys);
        console.log(`Invalidated ${keys.length} cache keys`);
      } else {
        console.log(`No cache keys found matching: ${searchPattern}`);
      }
    }
  } catch (error) {
    console.error(`Cache invalidation error: ${error.message}`);
  }
};