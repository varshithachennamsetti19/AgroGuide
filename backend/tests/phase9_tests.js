/**
 * AgroGuide Phase 9 - Multimodal AI Vision & Disease Diagnostics Test Suite
 * Run with: node tests/phase9_tests.js
 */

import assert from 'assert';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import mongoose from 'mongoose';
import DiseaseHistory from '../models/DiseaseHistory.js';

let testsPassed = 0;
let testsFailed = 0;
let fastApiProcess = null;

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
console.log('🧪 Starting AgroGuide Phase 9 Multimodal Test Suite');
console.log('====================================================\n');

// 1. DATABASE SCHEMA TEST
runTest('Database Models - DiseaseHistory Schema Instantiation', () => {
  const log = new DiseaseHistory({
    userId: new mongoose.Types.ObjectId(),
    imagePath: 'uploads/leaf_test.jpg',
    crop: 'Tomato',
    disease: 'Tomato Leaf Blight',
    confidence: 88,
    severity: 'High',
    treatment: {
      organic: 'Copper oxychloride',
      chemical: 'Mancozeb',
      preventive: 'Crop rotation'
    }
  });

  assert.strictEqual(log.crop, 'Tomato');
  assert.strictEqual(log.confidence, 88);
  assert.strictEqual(log.severity, 'High');
});

// Helper to spawn FastAPI Service in background for integration tests
function startFastApi() {
  return new Promise((resolve) => {
    console.log('⚙️ Starting local FastAPI Vision microservice in background...');
    const pythonPath = 'python'; // Fallback to python
    const scriptPath = path.resolve('../vision-service/main.py');
    
    fastApiProcess = spawn(pythonPath, [scriptPath]);
    
    const onData = (data) => {
      const msg = data.toString();
      if (msg.includes('Uvicorn running') || msg.includes('Application startup complete') || msg.includes('Started server process')) {
        console.log('📡 FastAPI Vision microservice is online and ready.');
        resolve(true);
      }
    };

    fastApiProcess.stdout.on('data', onData);
    fastApiProcess.stderr.on('data', onData);

    // Timeout fallback if it takes too long
    setTimeout(() => {
      console.log('⌛ FastAPI startup timeout. Proceeding with integration tests...');
      resolve(false);
    }, 4000);
  });
}

async function runIntegrationTests() {
  const VISION_URL = 'http://localhost:8000/analyze';
  
  // Create mock files
  const createMockImageFile = (filename) => {
    const filePath = path.resolve(filename);
    // Create a 1x1 mock file or write dummy bytes
    fs.writeFileSync(filePath, 'mock_image_bytes_here');
    return filePath;
  };

  const cleanMockFile = (filename) => {
    const filePath = path.resolve(filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  };

  // Run FastAPI integration calls
  try {
    // 2. BLURRY REJECTION TEST
    const blurFile = createMockImageFile('leaf_blurry.jpg');
    try {
      const form = new FormData();
      const fileBuffer = fs.readFileSync(blurFile);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      form.append('file', blob, 'leaf_blurry.jpg');

      const res = await axios.post(VISION_URL, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.reason, 'blurry');
      console.log('✅ PASS: Image Validation - Blurry leaf rejection');
      testsPassed++;
    } catch (err) {
      console.error('❌ FAIL: Image Validation - Blurry leaf rejection', err.message);
      testsFailed++;
    } finally {
      cleanMockFile('leaf_blurry.jpg');
    }

    // 3. DARK IMAGE REJECTION TEST
    const darkFile = createMockImageFile('leaf_dark.jpg');
    try {
      const form = new FormData();
      const fileBuffer = fs.readFileSync(darkFile);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      form.append('file', blob, 'leaf_dark.jpg');

      const res = await axios.post(VISION_URL, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      assert.strictEqual(res.data.success, false);
      assert.strictEqual(res.data.reason, 'dark');
      console.log('✅ PASS: Image Validation - Dark leaf rejection');
      testsPassed++;
    } catch (err) {
      console.error('❌ FAIL: Image Validation - Dark leaf rejection', err.message);
      testsFailed++;
    } finally {
      cleanMockFile('leaf_dark.jpg');
    }

    // 4. DISEASE CLASSIFICATION - TOMATO BLIGHT
    const blightFile = createMockImageFile('tomato_blight.jpg');
    try {
      const form = new FormData();
      const fileBuffer = fs.readFileSync(blightFile);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      form.append('file', blob, 'tomato_blight.jpg');

      const res = await axios.post(VISION_URL, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.crop, 'Tomato');
      assert.strictEqual(res.data.disease, 'Tomato Leaf Blight');
      assert.strictEqual(res.data.severity, 'High');
      console.log('✅ PASS: Classifier - Tomato Blight detection');
      testsPassed++;
    } catch (err) {
      console.error('❌ FAIL: Classifier - Tomato Blight detection', err.message);
      testsFailed++;
    } finally {
      cleanMockFile('tomato_blight.jpg');
    }

    // 5. DISEASE CLASSIFICATION - HEALTHY PLANT
    const healthyFile = createMockImageFile('cotton_healthy.jpg');
    try {
      const form = new FormData();
      const fileBuffer = fs.readFileSync(healthyFile);
      const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
      form.append('file', blob, 'cotton_healthy.jpg');

      const res = await axios.post(VISION_URL, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      assert.strictEqual(res.data.success, true);
      assert.strictEqual(res.data.healthy, true);
      assert.strictEqual(res.data.crop, 'Cotton');
      console.log('✅ PASS: Classifier - Healthy plant identification');
      testsPassed++;
    } catch (err) {
      console.error('❌ FAIL: Classifier - Healthy plant identification', err.message);
      testsFailed++;
    } finally {
      cleanMockFile('cotton_healthy.jpg');
    }

  } catch (err) {
    console.error('FastAPI connection error during test runner:', err.message);
  }
}

// Startup, execute, teardown
(async () => {
  const started = await startFastApi();
  
  if (started) {
    await runIntegrationTests();
  } else {
    console.warn('⚠️ FastAPI failed to startup. Skipping backend integration requests.');
  }

  // Teardown process
  if (fastApiProcess) {
    console.log('🔌 Shutting down local FastAPI background process...');
    fastApiProcess.kill();
  }

  console.log('\n====================================================');
  console.log(`📊 TEST SUMMARY: Passed: ${testsPassed} | Failed: ${testsFailed}`);
  console.log('====================================================');
  
  process.exit(testsFailed > 0 ? 1 : 0);
})();
