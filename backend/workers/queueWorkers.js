/**
 * Queue Workers Service for AgroGuide
 * Handles background task execution for BullMQ queues and In-Memory fallbacks.
 */

import { Worker } from 'bullmq';
import { getRedisStatus } from '../cache/redisClient.js';
import { registerMockProcessor, queueStats } from '../queues/queueManager.js';
import { logBullMqError } from '../logging/logger.js';
import Notification from '../models/Notification.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';

// Core Business Logic Executor for Job Tasks
export async function executeJob(queueName, jobName, data) {
  console.log(`👷 [Worker] Processing task: "${jobName}" in queue: "${queueName}"`);
  
  try {
    switch (queueName) {
      case 'WeatherQueue':
        if (jobName === 'weatherAlert') {
          // Create weather notification alert
          await Notification.create({
            userId: data.userId,
            title: `🌦 Weather Alert: ${data.city}`,
            message: `Rain probability is high (${data.rainProbability}%). Safeguard your harvested crop stocks and adjust irrigation.`,
            priority: 'high',
            type: 'weather'
          });
        }
        break;

      case 'MarketQueue':
        if (jobName === 'priceAlert') {
          await Notification.create({
            userId: data.userId,
            title: `📈 Price Alert: ${data.crop}`,
            message: `Market rates for ${data.crop} changed by Rs. ${data.change} per Quintal today at ${data.market}. Check details in dashboard.`,
            priority: 'medium',
            type: 'market'
          });
        }
        break;

      case 'SchemeQueue':
        if (jobName === 'schemeReminder') {
          await Notification.create({
            userId: data.userId,
            title: `🏛 Government Benefit: ${data.schemeName}`,
            message: `A new installment update is registered for ${data.schemeName}. Complete your bank KYC validation.`,
            priority: 'low',
            type: 'scheme'
          });
        }
        break;

      case 'ReminderQueue':
        if (jobName === 'cropTask') {
          await Notification.create({
            userId: data.userId,
            title: `🌾 Cultivation Task: ${data.crop}`,
            message: `Based on your planting date, it is time to perform ${data.taskName} for your ${data.crop} crop.`,
            priority: 'medium',
            type: 'crop'
          });
        }
        break;

      default:
        console.log(`❓ Unknown queue name: "${queueName}"`);
    }
  } catch (error) {
    console.error(`Error executing job ${jobName}:`, error.message);
    throw error;
  }
}

// Start Workers
export function startWorkers() {
  const isRedisAvailable = getRedisStatus();

  if (isRedisAvailable) {
    const queueNames = ['WeatherQueue', 'MarketQueue', 'SchemeQueue', 'ReminderQueue'];
    
    queueNames.forEach(name => {
      try {
        const worker = new Worker(name, async (job) => {
          queueStats.activeJobs++;
          try {
            await executeJob(name, job.name, job.data);
            queueStats.processedJobs++;
          } catch (err) {
            queueStats.failedJobs++;
            throw err;
          } finally {
            queueStats.activeJobs = Math.max(0, queueStats.activeJobs - 1);
          }
        }, {
          connection: {
            url: REDIS_URL
          }
        });

        worker.on('failed', (job, err) => {
          logBullMqError(new Error(`Worker ${name} Job ${job.name} Failed: ${err.message}`));
        });
      } catch (err) {
        logBullMqError(err);
      }
    });
    console.log('👷 BullMQ workers initialized and active.');
  } else {
    // Register mock runner
    registerMockProcessor(executeJob);
    console.log('👷 Mock Local Queue Worker registered and active.');
  }
}
