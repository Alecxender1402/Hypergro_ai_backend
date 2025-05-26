const redis = require('../config/redis');

const cacheMiddleware = (expiry = 3600) => {
  return async (req, res, next) => {
    const key = `cache:${req.originalUrl}`;
    try {
      const cachedData = await redis.get(key);
      if (cachedData) {
        return res.json(JSON.parse(cachedData));
      }
      const originalSend = res.send;
      res.send = (body) => {
        if (res.statusCode === 200) {
          redis.setex(key, expiry, body);
        }
        return originalSend.call(res, body);
      };
      next();
    } catch (err) {
      console.error('Cache error:', err);
      next();
    }
  };
};

module.exports = cacheMiddleware;
