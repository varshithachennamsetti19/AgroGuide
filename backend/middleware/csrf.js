import crypto from 'crypto';

/**
 * CSRF Protection Middleware using Double-Submit Cookie Pattern
 */
export const csrfProtection = (req, res, next) => {
  // 1. Generate CSRF token on GET requests if not present in cookies
  if (req.method === 'GET' && !req.cookies['csrfToken']) {
    const token = crypto.randomBytes(24).toString('hex');
    res.cookie('csrfToken', token, {
      httpOnly: false, // Must be readable by client JS to set the header
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
  }

  // 2. Bypass verification for safe HTTP methods (GET, HEAD, OPTIONS)
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  // 3. For mutative requests, compare custom header with cookie value
  const csrfCookie = req.cookies['csrfToken'];
  const csrfHeader = req.headers['x-csrf-token'];

  if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({
      success: false,
      error: 'CSRF token mismatch. Action forbidden.'
    });
  }

  next();
};
