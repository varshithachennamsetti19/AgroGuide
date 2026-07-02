/**
 * Rate Limiter Middleware for AgroGuide
 * Restricts users to 30 AI requests per minute.
 */

const rateLimitStore = new Map(); // userId -> array of request timestamps

export const chatRateLimiter = (req, res, next) => {
  const userId = req.user ? req.user._id.toString() : 'anonymous';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  if (!rateLimitStore.has(userId)) {
    rateLimitStore.set(userId, []);
  }

  const timestamps = rateLimitStore.get(userId);

  // Filter out timestamps older than the 1-minute window
  const validTimestamps = timestamps.filter(ts => (now - ts) < windowMs);

  // Check if limit is exceeded
  if (validTimestamps.length >= 30) {
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests: You have exceeded the limit of 30 requests per minute. Please try again shortly.'
    });
  }

  // Record current request timestamp
  validTimestamps.push(now);
  rateLimitStore.set(userId, validTimestamps);

  // Periodically clean up rate limit store to prevent memory leaks
  if (rateLimitStore.size > 1000) {
    for (const [key, val] of rateLimitStore.entries()) {
      const active = val.filter(ts => (now - ts) < windowMs);
      if (active.length === 0) {
        rateLimitStore.delete(key);
      } else {
        rateLimitStore.set(key, active);
      }
    }
  }

  next();
};
