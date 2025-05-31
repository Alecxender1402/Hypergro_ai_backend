const express = require('express');
const router = express.Router();
const { getRedisClient } = require('../config/redis');

// Test Redis connection
router.get('/redis', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    
    if (!redisClient) {
      return res.status(503).json({
        status: 'error',
        message: 'Redis client not connected'
      });
    }
    
    // Test basic operations
    const testKey = 'test:diagnostics';
    const testValue = new Date().toISOString();
    
    await redisClient.set(testKey, testValue, 'EX', 60);
    const storedValue = await redisClient.get(testKey);
    
    // Get server info
    const info = await redisClient.info();
    
    res.json({
      status: 'success',
      message: 'Redis is working correctly',
      test: {
        key: testKey,
        expectedValue: testValue,
        actualValue: storedValue,
        match: testValue === storedValue
      },
      serverInfo: {
        version: info.split('\n').find(line => line.startsWith('redis_version')),
        clients: info.split('\n').find(line => line.startsWith('connected_clients')),
        memory: info.split('\n').find(line => line.startsWith('used_memory_human'))
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Get cache statistics
router.get('/cache/stats', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    
    if (!redisClient) {
      return res.status(503).json({
        status: 'error',
        message: 'Redis client not connected'
      });
    }
    
    // Find all cache keys
    const cacheKeys = await redisClient.keys('cache:*');
    
    // Get TTLs for each key
    const keyDetails = [];
    for (const key of cacheKeys) {
      const ttl = await redisClient.ttl(key);
      keyDetails.push({
        key,
        ttl,
        expiresIn: `${Math.floor(ttl / 60)} minutes, ${ttl % 60} seconds`
      });
    }
    
    res.json({
      status: 'success',
      cacheStats: {
        totalKeys: cacheKeys.length,
        keys: keyDetails
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// Clear all cache
router.delete('/cache', async (req, res) => {
  try {
    const redisClient = getRedisClient();
    
    if (!redisClient) {
      return res.status(503).json({
        status: 'error',
        message: 'Redis client not connected'
      });
    }
    
    // Find all cache keys
    const cacheKeys = await redisClient.keys('cache:*');
    
    if (cacheKeys.length > 0) {
      await redisClient.del(cacheKeys);
      res.json({
        status: 'success',
        message: `Cleared ${cacheKeys.length} cache entries`
      });
    } else {
      res.json({
        status: 'success',
        message: 'No cache entries to clear'
      });
    }
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;