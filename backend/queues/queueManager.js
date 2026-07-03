/**
 * Queue Manager Service for AgroGuide
 * Manages BullMQ job queues and provides a transparent event-driven fallback if Redis is offline.
 */

import { Queue, QueueEvents } from 'bullmq';
import { getRedisStatus } from '../cache/redisClient.js';
import { logBullMqError } from '../logging/logger.js';
import EventEmitter from 'events';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

const queueNames = [
  'WeatherQueue',
  'MarketQueue',
  'SchemeQueue',
  'NotificationQueue',
  'VoiceQueue',
  'ReminderQueue'
];

const queues = {};
const mockQueueEmitter = new EventEmitter();

// In-Memory Job Tracking for Telemetry
export const queueStats = {
  processedJobs: 0,
  failedJobs: 0,
  activeJobs: 0
};

// Initialize real BullMQ queues if Redis is connected
export function initializeQueues() {
  const isRedisAvailable = getRedisStatus();

  if (isRedisAvailable) {
    console.log('⚡ Initializing BullMQ queues with Redis...');
    queueNames.forEach(name => {
      try {
        queues[name] = new Queue(name, {
          connection: {
            url: REDIS_URL
          }
        });
        
        // Handle connections
        queues[name].on('error', (err) => {
          logBullMqError(new Error(`Queue ${name} Error: ${err.message}`));
        });
      } catch (err) {
        logBullMqError(err);
      }
    });
  } else {
    console.warn('⚠️ Redis is offline. Initializing Mock In-Memory Job Queues.');
  }
}

/**
 * Adds a background task job to a specific queue
 * @param {string} queueName - Name of target queue
 * @param {string} jobName - Name of job task
 * @param {Object} data - Context data payload for the task
 */
export async function addJob(queueName, jobName, data = {}) {
  const isRedisAvailable = getRedisStatus();
  queueStats.activeJobs++;

  if (isRedisAvailable && queues[queueName]) {
    try {
      await queues[queueName].add(jobName, data, {
        attempts: 3,
        backoff: 1000
      });
      console.log(`[BullMQ Queue] Job "${jobName}" added to "${queueName}" successfully.`);
      return;
    } catch (err) {
      logBullMqError(err);
      console.warn(`[BullMQ Warning] Failed to queue job via Redis. Falling back to local runner.`);
    }
  }

  // Fallback: Run immediately or schedule in event loop (async simulation)
  setImmediate(() => {
    mockQueueEmitter.emit('job', { queueName, jobName, data });
  });
}

/**
 * Register job callback processor for the Mock Queue
 * @param {Function} processor - (queueName, jobName, data) => Promise
 */
export function registerMockProcessor(processor) {
  mockQueueEmitter.on('job', async ({ queueName, jobName, data }) => {
    try {
      await processor(queueName, jobName, data);
      queueStats.processedJobs++;
    } catch (err) {
      queueStats.failedJobs++;
      logBullMqError(err);
      console.error(`Mock Queue Job Failure [${queueName} - ${jobName}]:`, err.message);
    } finally {
      queueStats.activeJobs = Math.max(0, queueStats.activeJobs - 1);
    }
  });
}

// Initialise on module load
initializeQueues();
