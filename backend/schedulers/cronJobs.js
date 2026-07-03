/**
 * Cron Schedulers Service for AgroGuide
 * Registers cron schedules for daily weather alerts, hourly mandi refreshes, and daily scheme updates.
 */

import cron from 'node-cron';
import { addJob } from '../queues/queueManager.js';
import User from '../models/User.js';
import { logApiError } from '../logging/logger.js';

// Cron job instances list
const activeCrons = [];

/**
 * Initializes and schedules background cron tasks
 */
export function startSchedulers() {
  console.log('⏰ Initializing Agricultural Cron Schedulers...');

  // 1. Morning Weather Alerts: Runs daily at 6:00 AM (0 6 * * *)
  const weatherCron = cron.schedule('0 6 * * *', async () => {
    console.log('[Cron] Dispatching daily morning weather alerts...');
    try {
      const users = await User.find({ isProfileCompleted: true });
      for (const user of users) {
        await addJob('WeatherQueue', 'weatherAlert', {
          userId: user._id,
          city: user.preferredCity || 'Your Location',
          rainProbability: 75
        });
      }
    } catch (err) {
      logApiError(err);
    }
  });
  activeCrons.push(weatherCron);

  // 2. Hourly Market Price Refresh: Runs every hour (0 * * * *)
  const marketCron = cron.schedule('0 * * * *', async () => {
    console.log('[Cron] Executing hourly market price refreshes...');
    try {
      const users = await User.find({ isProfileCompleted: true });
      for (const user of users) {
        if (user.primaryCrop) {
          await addJob('MarketQueue', 'priceAlert', {
            userId: user._id,
            crop: user.primaryCrop,
            market: user.preferredCity ? `${user.preferredCity} Mandi` : 'Local Mandi',
            change: Math.floor(Math.random() * 200) - 100 // Rs. -100 to +100
          });
        }
      }
    } catch (err) {
      logApiError(err);
    }
  });
  activeCrons.push(marketCron);

  // 3. Daily Government Scheme Updates: Runs daily at midnight (0 0 * * *)
  const schemeCron = cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Checking daily government scheme updates...');
    try {
      const users = await User.find({ isProfileCompleted: true });
      for (const user of users) {
        await addJob('SchemeQueue', 'schemeReminder', {
          userId: user._id,
          schemeName: 'PM Kisan'
        });
      }
    } catch (err) {
      logApiError(err);
    }
  });
  activeCrons.push(schemeCron);

  // 4. Daily Crop Recommendations: Runs daily at midnight (0 0 * * *)
  const recommendationCron = cron.schedule('0 0 * * *', async () => {
    console.log('[Cron] Pushing daily crop recommendations...');
    try {
      const users = await User.find({ isProfileCompleted: true });
      for (const user of users) {
        if (user.primaryCrop) {
          await addJob('ReminderQueue', 'cropTask', {
            userId: user._id,
            crop: user.primaryCrop,
            taskName: 'Weeding and Soil Moisture Check'
          });
        }
      }
    } catch (err) {
      logApiError(err);
    }
  });
  activeCrons.push(recommendationCron);
}

/**
 * Utility function to trigger cron jobs immediately on-demand (e.g. for testing/admin dashboard)
 */
export async function triggerDailyCronJobsNow() {
  console.log('[Cron Manual Override] Triggering cron jobs manually now...');
  try {
    const users = await User.find({ isProfileCompleted: true });
    for (const user of users) {
      // Trigger Weather alert job
      await addJob('WeatherQueue', 'weatherAlert', {
        userId: user._id,
        city: user.preferredCity || 'Your Location',
        rainProbability: 80
      });

      // Trigger Market price alert job
      if (user.primaryCrop) {
        await addJob('MarketQueue', 'priceAlert', {
          userId: user._id,
          crop: user.primaryCrop,
          market: user.preferredCity ? `${user.preferredCity} Mandi` : 'Local Mandi',
          change: 50
        });

        // Trigger Crop recommendation reminder job
        await addJob('ReminderQueue', 'cropTask', {
          userId: user._id,
          crop: user.primaryCrop,
          taskName: 'Nitrogen Application & Soil Wetness Check'
        });
      }
    }
    return { success: true, message: 'Cron jobs manually executed.' };
  } catch (err) {
    logApiError(err);
    return { success: false, error: err.message };
  }
}
