/**
 * AgroGuide Phase 10 - Production security, storage, and documentation tests
 * Run with: node tests/phase10_tests.js
 */

import assert from 'assert';
import { spawn } from 'child_process';
import path from 'path';
import axios from 'axios';
import { uploadImageToStorage } from '../services/storageService.js';

let testsPassed = 0;
let testsFailed = 0;
let nodeServerProcess = null;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(error);
    testsFailed++;
  }
}

console.log('====================================================');
console.log('🧪 Starting AgroGuide Phase 10 Production Test Suite');
console.log('====================================================\n');

// 1. PLUGGABLE STORAGE LOCAL FALLBACK TEST
runTest('Storage Service - Local Storage Upload Path Resolution', async () => {
  const mockFile = {
    originalname: 'test_leaf.png',
    filename: 'test_leaf_12345.png',
    path: 'uploads/test_leaf_12345.png'
  };

  const uploadRes = await uploadImageToStorage(mockFile);
  assert.strictEqual(uploadRes.success, true);
  assert.strictEqual(uploadRes.filePath, 'uploads/test_leaf_12345.png');
  assert.strictEqual(uploadRes.fileUrl, '/uploads/test_leaf_12345.png');
});

// Helper to spawn Node Server in background
function startNodeServer() {
  return new Promise((resolve) => {
    console.log('⚙️ Starting local Express server in background for security scans...');
    const scriptPath = path.resolve('server.js');
    
    // Set development port to 5001 for test isolation
    nodeServerProcess = spawn('node', [scriptPath], {
      env: { ...process.env, PORT: '5001', NODE_ENV: 'development', IGNORE_DB_ERRORS: 'true' }
    });

    nodeServerProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      if (msg.includes('Express is running') || msg.includes('Server is running') || msg.includes('Health Check')) {
        console.log('📡 Express server is online.');
        resolve(true);
      }
    });

    nodeServerProcess.stderr.on('data', (data) => {
      // console.log("Node stderr:", data.toString());
    });

    // Timeout fallback if it takes too long
    setTimeout(() => {
      console.log('⌛ Node startup check timeout. Proceeding with tests...');
      resolve(true);
    }, 4000);
  });
}

async function runSecurityIntegrationTests() {
  const BASE_URL = 'http://localhost:5001';

  try {
    // 2. HELMET SECURITY HEADERS TEST
    try {
      const res = await axios.get(`${BASE_URL}/health`);
      const headers = res.headers;

      // Helmet sets these security headers:
      assert.ok(headers['x-dns-prefetch-control'], 'Helmet missing x-dns-prefetch-control header');
      assert.ok(headers['x-frame-options'], 'Helmet missing x-frame-options header');
      assert.ok(headers['x-content-type-options'], 'Helmet missing x-content-type-options header');
      
      console.log('✅ PASS: Security - Helmet HTTP header hardening verified');
      testsPassed++;
    } catch (err) {
      console.error('❌ FAIL: Security - Helmet HTTP header hardening verified', err.message);
      testsFailed++;
    }

    // 3. SWAGGER DOCUMENTATION ENDPOINT TEST
    try {
      const res = await axios.get(`${BASE_URL}/api-docs/`);
      assert.strictEqual(res.status, 200);
      assert.ok(res.data.includes('swagger') || res.data.includes('Swagger'), 'Swagger UI failed to render UI assets');
      
      console.log('✅ PASS: Documentation - Swagger UI OpenAPI endpoints online');
      testsPassed++;
    } catch (err) {
      console.error('❌ FAIL: Documentation - Swagger UI OpenAPI endpoints online', err.message);
      testsFailed++;
    }

  } catch (err) {
    console.error('Network failure connecting to local test server:', err.message);
  }
}

// Startup, execute, teardown
(async () => {
  await startNodeServer();
  await runSecurityIntegrationTests();

  // Shut down background processes
  if (nodeServerProcess) {
    console.log('🔌 Shutting down local Express server background process...');
    nodeServerProcess.kill();
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: Passed: ${testsPassed} | Failed: ${testsFailed}`);
  console.log('====================================================');
  
  process.exit(testsFailed > 0 ? 1 : 0);
})();
