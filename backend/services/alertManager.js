/**
 * Weather Alert Manager (Future-ready architecture)
 * This module is prepared for Phase 5 to integrate Redis, BullMQ,
 * and push notifications for real-time weather alerts (heatwaves, cyclones, rain, etc.)
 */

// import Queue from 'bull'; // Future dependency
// import Redis from 'ioredis'; // Future dependency

/**
 * Checks weather data for severe events and places notifications on a processing queue.
 * @param {Object} weatherData - Combined current weather data from weatherService
 * @param {string} userId - User ID to send the notifications to
 */
export async function checkAndQueueAlerts(weatherData, userId) {
  try {
    if (!weatherData) return;

    // 1. Identify severe weather conditions from weatherData
    const isSevere = detectSevereWeather(weatherData);

    if (isSevere) {
      console.log(`📡 [Alert Manager System] Hook Triggered: Severe weather detected for User ${userId} in ${weatherData.city}. Condition: ${weatherData.weatherCondition}, Temp: ${weatherData.temperature}°C, Wind: ${weatherData.windSpeed}m/s.`);
      
      // 2. Redis/BullMQ Queue Insertion stub (For Future Phase)
      /*
      const alertQueue = new Queue('weather-alerts', {
        redis: { host: process.env.REDIS_HOST || '127.0.0.1', port: 6379 }
      });

      await alertQueue.add('sendSevereAlert', {
        userId,
        city: weatherData.city,
        condition: weatherData.weatherCondition,
        temperature: weatherData.temperature,
        windSpeed: weatherData.windSpeed,
        severity: isSevere.severity,
        message: isSevere.message
      }, {
        attempts: 3,
        backoff: 5000 // 5 seconds delay before retry
      });
      */

      // 3. Log event trace
      console.log(`[Alert Manager System - Queue Trace] stub: job 'sendSevereAlert' queued in Redis for processing.`);
    }
  } catch (error) {
    console.error('Failed to process/queue weather alert checks:', error.message);
  }
}

/**
 * Helper to check threshold triggers.
 */
function detectSevereWeather(weather) {
  if (!weather) return null;

  // Temperature Thresholds (e.g. Heatwaves >= 40°C, Coldwaves <= 10°C)
  if (weather.temperature >= 40) {
    return { severity: 'CRITICAL', type: 'HEATWAVE', message: 'Extreme heatwave warning. Avoid outdoor activities.' };
  }

  // Wind Speed Thresholds (e.g. Cyclone/Strong wind >= 15 m/s)
  if (weather.windSpeed >= 15) {
    return { severity: 'CRITICAL', type: 'CYCLONE', message: 'Severe windstorm / cyclone warning.' };
  }

  // Heavy Rainfall Thresholds (e.g. Rain >= 50mm)
  if (weather.rainfall >= 50) {
    return { severity: 'WARNING', type: 'RAIN_ALERT', message: 'Heavy rainfall warning. Check field drainage.' };
  }

  return null;
}
