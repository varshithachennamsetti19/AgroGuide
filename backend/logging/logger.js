/**
 * Unified Logging Service for AgroGuide
 * Stores error messages with detailed categories and timestamps in backend/error.log.
 */

import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve('error.log');

/**
 * Appends a formatted message to the error.log file.
 * @param {string} category - Log category (e.g. GEMINI, REDIS)
 * @param {Error|string} error - The error details
 */
export function writeLog(category, error) {
  const timestamp = new Date().toISOString();
  const errMsg = error instanceof Error ? error.message : error;
  const errStack = error instanceof Error ? `\nSTACK: ${error.stack}` : '';
  const logMessage = `[${timestamp}] [${category.toUpperCase()}] ERROR: ${errMsg}${errStack}\n\n`;

  console.error(`🔴 [Logger - ${category}] ${errMsg}`);

  try {
    const dir = path.dirname(LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
  } catch (fsErr) {
    console.error('CRITICAL: Failed to write to log file:', fsErr.message);
  }
}

export function logApiError(err) {
  writeLog('API', err);
}

export function logGeminiError(err) {
  writeLog('GEMINI', err);
}

export function logWeatherError(err) {
  writeLog('WEATHER', err);
}

export function logRedisError(err) {
  writeLog('REDIS', err);
}

export function logBullMqError(err) {
  writeLog('BULLMQ', err);
}
