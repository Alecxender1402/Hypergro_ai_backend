// config/redis.js
const Redis = require('ioredis');

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_URL,
  token: process.env.UPSTASH_REDIS_TOKEN,
})

module.exports = redis; 
