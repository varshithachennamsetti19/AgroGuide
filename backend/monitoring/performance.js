/**
 * Telemetry and Performance Monitoring Service for AgroGuide
 * Gathers system latency metrics, Redis cache statistics, and BullMQ queue statuses.
 */

import { queueStats } from '../queues/queueManager.js';
import { getRedisStatus } from '../cache/redisClient.js';
import QueryLog from '../models/QueryLog.js';

let totalResponseTime = 0;
let responseTimeCount = 0;

let cacheHits = 0;
let cacheMisses = 0;

let weatherQueriesCount = 0;
let predictionQueriesCount = 0;
let blockedQueriesCount = 0;

/**
 * Record API AI response latency
 * @param {number} timeMs
 */
export function recordResponseTime(timeMs) {
  totalResponseTime += timeMs;
  responseTimeCount++;
}

/**
 * Increment Redis cache hit count
 */
export function recordCacheHit() {
  cacheHits++;
}

/**
 * Increment Redis cache miss count
 */
export function recordCacheMiss() {
  cacheMisses++;
}

/**
 * Increment total weather calls count
 */
export function recordWeatherQuery() {
  weatherQueriesCount++;
}

/**
 * Increment total crop prediction calls count
 */
export function recordPredictionQuery() {
  predictionQueriesCount++;
}

/**
 * Increment blocked firewall query count
 */
export function recordBlockedQuery() {
  blockedQueriesCount++;
}

/**
 * Compiles performance telemetry stats
 * @returns {Promise<Object>} Metrics payload
 */
export async function getTelemetryMetrics() {
  const avgResponseTime = responseTimeCount > 0 ? (totalResponseTime / responseTimeCount) : 0;
  const totalCacheLookups = cacheHits + cacheMisses;
  const cacheHitRatio = totalCacheLookups > 0 ? (cacheHits / totalCacheLookups) * 100 : 0;

  // Query database for aggregate analytics
  let totalLogs = 0;
  let blockedDbCount = 0;
  try {
    totalLogs = await QueryLog.countDocuments();
    blockedDbCount = await QueryLog.countDocuments({ status: 'blocked' });
  } catch (err) {
    // fallback if Mongo is slow
    blockedDbCount = blockedQueriesCount;
  }

  return {
    isRedisConnected: getRedisStatus(),
    avgResponseTimeMs: Math.round(avgResponseTime),
    cacheHitRatio: Math.round(cacheHitRatio * 10) / 10,
    cacheHits,
    cacheMisses,
    weatherQueries: weatherQueriesCount,
    predictionQueries: predictionQueriesCount,
    blockedQueries: Math.max(blockedDbCount, blockedQueriesCount),
    queueProcessedJobs: queueStats.processedJobs,
    queueFailedJobs: queueStats.failedJobs,
    queueActiveJobs: queueStats.activeJobs
  };
}
