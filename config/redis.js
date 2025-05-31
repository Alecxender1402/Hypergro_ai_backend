const Redis = require('ioredis');

let redisClient = null;

// Redis configuration
const config = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || '',
  // Connection options
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    // Retry with exponential backoff
    const delay = Math.min(times * 100, 2000);
    return delay;
  }
};

// Connect to Redis
const connectRedis = async () => {
  if (!redisClient) {
    try {
      console.log(`Connecting to Redis at ${config.host}:${config.port}...`);
      
      redisClient = new Redis(config);
      
      // Connection event handlers
      redisClient.on('connect', () => {
        console.log('Redis connection established');
      });
      
      redisClient.on('ready', () => {
        console.log('Redis client ready to use');
      });
      
      redisClient.on('error', (err) => {
        console.error('Redis error:', err.message);
      });
      
      redisClient.on('close', () => {
        console.log('Redis connection closed');
      });
      
      // Test the connection
      await redisClient.ping();
      console.log('Redis PING successful');
      
      return redisClient;
    } catch (error) {
      console.error(`Redis connection error: ${error.message}`);
      if (redisClient) {
        redisClient.disconnect();
        redisClient = null;
      }
      throw error;
    }
  }
  return redisClient;
};

// Disconnect from Redis
const disconnectRedis = async () => {
  if (redisClient) {
    console.log('Disconnecting from Redis...');
    try {
      await redisClient.quit();
      redisClient = null;
      console.log('Redis disconnected successfully');
    } catch (error) {
      console.error(`Redis disconnect error: ${error.message}`);
      redisClient.disconnect();
      redisClient = null;
    }
  }
};

// Get Redis client
const getRedisClient = () => {
  return redisClient;
};

module.exports = {
  connectRedis,
  disconnectRedis,
  getRedisClient
};