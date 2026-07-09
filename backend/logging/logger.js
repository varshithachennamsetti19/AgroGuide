/**
 * Unified Logging Service for AgroGuide
 * Stores error messages with detailed categories and timestamps in backend/error.log.
 * Implements structured JSON logging in backend/app.log.
 */

import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve('error.log');
const APP_LOG_FILE = path.resolve('app.log');

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

/**
 * Appends a structured JSON log entry to the app.log file.
 */
export function writeStructuredLog(level, message, context = {}) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...context
  };

  // Output to standard console
  if (level === 'error') {
    console.error(`🔴 ${message}`, JSON.stringify(context));
  } else {
    console.log(`ℹ️ ${message}`, JSON.stringify(context));
  }

  try {
    const dir = path.dirname(APP_LOG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.appendFileSync(APP_LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (fsErr) {
    console.error('CRITICAL: Failed to write to structured log file:', fsErr.message);
  }
}

/**
 * Logs an HTTP request logData payload
 */
export function logHttpRequest(logData) {
  writeStructuredLog('info', `HTTP ${logData.method} ${logData.url} ${logData.status}`, logData);
}

export function logApiError(err) {
  writeLog('API', err);
  writeStructuredLog('error', 'API execution error', { error: err.message, stack: err.stack });
}

export function logGeminiError(err) {
  writeLog('GEMINI', err);
  writeStructuredLog('error', 'Gemini service exception', { error: err.message, stack: err.stack });
}

export function logWeatherError(err) {
  writeLog('WEATHER', err);
  writeStructuredLog('error', 'Weather service check failed', { error: err.message });
}

export function logRedisError(err) {
  writeLog('REDIS', err);
  writeStructuredLog('error', 'Redis connection exception', { error: err.message });
}

export function logBullMqError(err) {
  writeLog('BULLMQ', err);
  writeStructuredLog('error', 'BullMQ queue worker error', { error: err.message });
}

/**
 * Logs vision-service execution errors
 */
export function logVisionError(err) {
  writeLog('VISION', err);
  writeStructuredLog('error', 'FastAPI Vision connection/analysis failed', { error: err.message });
}
