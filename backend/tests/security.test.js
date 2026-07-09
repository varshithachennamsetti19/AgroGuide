import { csrfProtection } from '../middleware/csrf.js';
import { requestLogger } from '../middleware/loggingMiddleware.js';
import { uploadImageToStorage } from '../services/storageService.js';
import { jest } from '@jest/globals';

describe('Phase 10 — Production Security & Logging Middlewares', () => {
  
  // 1. CSRF Middleware Tests
  describe('CSRF Protection Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'GET',
        headers: {},
        cookies: {}
      };
      res = {
        cookie: jest.fn(),
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    it('should generate and set a csrfToken cookie on GET requests if not present', () => {
      csrfProtection(req, res, next);
      
      expect(res.cookie).toHaveBeenCalledWith(
        'csrfToken',
        expect.any(String),
        expect.objectContaining({
          httpOnly: false,
          sameSite: 'strict',
          path: '/'
        })
      );
      expect(next).toHaveBeenCalled();
    });

    it('should bypass verification for safe HTTP methods (GET, HEAD, OPTIONS)', () => {
      req.method = 'HEAD';
      csrfProtection(req, res, next);
      
      expect(next).toHaveBeenCalled();
    });

    it('should block POST requests (403) when CSRF cookie/header is missing', () => {
      req.method = 'POST';
      csrfProtection(req, res, next);
      
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          error: 'CSRF token mismatch. Action forbidden.'
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should allow POST requests when CSRF cookie and X-CSRF-Token header match', () => {
      req.method = 'POST';
      req.cookies['csrfToken'] = 'matching_token_val_123';
      req.headers['x-csrf-token'] = 'matching_token_val_123';
      
      csrfProtection(req, res, next);
      
      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  // 2. Request Logging Middleware Tests
  describe('Structured Request Logger Middleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        method: 'GET',
        originalUrl: '/api/weather/current?lat=12&lon=77',
        headers: {},
        user: { _id: 'user_123' },
        ip: '127.0.0.1'
      };
      res = {
        setHeader: jest.fn(),
        on: jest.fn()
      };
      next = jest.fn();
    });

    it('should assign a Request ID and invoke next', () => {
      requestLogger(req, res, next);
      
      expect(req.id).toBeDefined();
      expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', req.id);
      expect(res.on).toHaveBeenCalledWith('finish', expect.any(Function));
      expect(next).toHaveBeenCalled();
    });
  });

  // 3. Local Pluggable Storage Tests
  describe('Storage Service Local Fallback', () => {
    it('should resolve to local storage URLs when STORAGE_PROVIDER is local', async () => {
      const mockFile = {
        originalname: 'tomato_leaf.png',
        filename: 'tomato_leaf_12345.png',
        path: 'uploads/tomato_leaf_12345.png'
      };

      const res = await uploadImageToStorage(mockFile);
      
      expect(res.success).toBe(true);
      expect(res.filePath).toBe('uploads/tomato_leaf_12345.png');
      expect(res.fileUrl).toBe('/uploads/tomato_leaf_12345.png');
    });
  });
});
