/**
 * Input Validator Middleware for AgroGuide
 * Intercepts incoming messages to prevent security vulnerabilities and spam.
 */

const messageHistory = new Map(); // Store last message per user: userId -> { text, timestamp }

export const validateInput = (req, res, next) => {
  const { message } = req.body;
  const userId = req.user ? req.user._id.toString() : 'anonymous';

  // 1. Check if parameter exists
  if (message === undefined || message === null) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Message parameter is required.'
    });
  }

  // 2. Ensure format is string
  if (typeof message !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Message must be a text string.'
    });
  }

  // 3. Ensure not empty
  const trimmed = message.trim();
  if (trimmed === '') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Message cannot be empty.'
    });
  }

  // 4. Ensure message is not too long (> 2000 characters)
  if (trimmed.length > 2000) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error: Message exceeds the maximum limit of 2000 characters.'
    });
  }

  // 5. Detect SQL Injection attempts
  const sqlRegex = /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE|CREATE|REPLACE)\b)|(['"]\s*(OR|AND)\s*['"]?\d+['"]?\s*=\s*['"]?\d+)|(--)|(\/\*)/i;
  if (sqlRegex.test(trimmed)) {
    return res.status(400).json({
      success: false,
      error: 'Security Warning: Unsafe database operations detected.'
    });
  }

  // 6. Detect XSS & HTML Injection attempts (including script tags, iframe, object, embed, javascript URLs, event handlers)
  const xssRegex = /(<script\b[^>]*>|[\s\S]*<\/script>|<iframe\b|<object\b|<embed\b|javascript:|onerror\s*=|onload\s*=|<[^>]+>)/i;
  if (xssRegex.test(trimmed)) {
    return res.status(400).json({
      success: false,
      error: 'Security Warning: Unsafe script or HTML markup content detected.'
    });
  }

  // 7. Spam Protection: Block duplicate messages sent within 5 seconds
  const now = Date.now();
  if (messageHistory.has(userId)) {
    const lastMsg = messageHistory.get(userId);
    if (lastMsg.text === trimmed && (now - lastMsg.timestamp) < 5000) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error: Repeated message detected. Please wait a few seconds before re-sending.'
      });
    }
  }

  // Update spam cache
  messageHistory.set(userId, { text: trimmed, timestamp: now });

  // Clean old entries in cache occasionally to prevent memory leaks (older than 10 mins)
  if (messageHistory.size > 1000) {
    for (const [key, value] of messageHistory.entries()) {
      if (now - value.timestamp > 600000) {
        messageHistory.delete(key);
      }
    }
  }

  next();
};
