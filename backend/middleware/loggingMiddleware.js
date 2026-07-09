import crypto from 'crypto';
import { writeStructuredLog, logHttpRequest } from '../logging/logger.js';
import { recordHttpResponseTime } from '../monitoring/performance.js';

/**
 * Structured Logging Middleware
 * Attaches a unique request ID, calculates duration, and writes request/response details in JSON format.
 */
export const requestLogger = (req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.id = requestId;
  res.setHeader('X-Request-ID', requestId);

  const startTime = process.hrtime();

  res.on('finish', () => {
    const diff = process.hrtime(startTime);
    const latencyMs = Math.round((diff[0] * 1e3 + diff[1] * 1e-6) * 100) / 100;

    const logData = {
      requestId,
      userId: req.user ? req.user._id : 'anonymous',
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
      latencyMs
    };

    // Log the request to logs
    logHttpRequest(logData);

    // Record response time in Prometheus metrics registry
    const route = req.route ? req.route.path : req.originalUrl.split('?')[0];
    recordHttpResponseTime(req.method, route, res.statusCode, latencyMs);
  });

  next();
};
