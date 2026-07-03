/**
 * Redis Client and In-Memory Fallback Caching Service
 * Manages connections to Redis and implements a robust TTL-based local Map cache on connection errors.
 */

import Redis from 'ioredis';
import { logRedisError } from '../logging/logger.js';

let redis = null;
let isRedisAvailable = false;

// Local In-Memory Cache Fallback Store (keys map to { value, expiryTime })
const localCache = new Map();

// Load config
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

try {
  redis = new Redis(REDIS_URL, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2000,
    retryStrategy: (times) => {
      // Limit retries so it falls back to local memory quickly
      if (times > 2) {
        isRedisAvailable = false;
        console.warn('⚠️ Redis connection timed out. Falling back to In-Memory Caching.');
        return null; // Stop retrying
      }
      return 1000;
    }
  });

  redis.on('connect', () => {
    isRedisAvailable = true;
    console.log('📡 Redis client connected successfully.');
  });

  redis.on('error', (err) => {
    isRedisAvailable = false;
    logRedisError(err);
  });
} catch (error) {
  isRedisAvailable = false;
  console.warn('⚠️ Failed to initialize Redis. Running with In-Memory cache fallback.');
}

/**
 * Get a cached key
 * @param {string} key
 * @returns {Promise<any|null>} Cached value or null
 */
export async function cacheGet(key) {
  if (isRedisAvailable && redis) {
    try {
      const data = await redis.get(key);
      if (data) return JSON.parse(data);
    } catch (err) {
      console.warn(`Redis Get Error: ${err.message}. Fetching from local fallback cache.`);
    }
  }

  // Fallback to Local Map Cache
  const localData = localCache.get(key);
  if (localData) {
    if (Date.now() < localData.expiryTime) {
      return localData.value;
    }
    // Expired - clean it up
    localCache.delete(key);
  }
  return null;
}

/**
 * Set a key in the cache with a Time-To-Live (seconds)
 * @param {string} key
 * @param {any} value
 * @param {number} ttlSeconds
 */
export async function cacheSet(key, value, ttlSeconds = 3600) {
  const valueStr = JSON.stringify(value);

  if (isRedisAvailable && redis) {
    try {
      await redis.set(key, valueStr, 'EX', ttlSeconds);
      return;
    } catch (err) {
      console.warn(`Redis Set Error: ${err.message}. Storing in local fallback cache.`);
    }
  }

  // Fallback to Local Map Cache
  localCache.set(key, {
    value,
    expiryTime: Date.now() + (ttlSeconds * 1000)
  });
}

/**
 * Delete a key from cache
 * @param {string} key
 */
export async function cacheDel(key) {
  if (isRedisAvailable && redis) {
    try {
      await redis.del(key);
      return;
    } catch (err) {
      console.warn(`Redis Del Error: ${err.message}`);
    }
  }
  localCache.delete(key);
}

/**
 * Clear all cache entries
 */
export async function cacheClear() {
  if (isRedisAvailable && redis) {
    try {
      await redis.flushdb();
    } catch (err) {
      console.warn(`Redis Flush DB Error: ${err.message}`);
    }
  }
  localCache.clear();
}

/**
 * Check if Redis is actively being used
 * @returns {boolean}
 */
export function getRedisStatus() {
  return isRedisAvailable;
}
