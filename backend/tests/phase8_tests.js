/**
 * AgroGuide Phase 8 - Caching, Job Queues, Notifications & Streaming Test Suite
 * Run with: node tests/phase8_tests.js
 */

import assert from 'assert';
import mongoose from 'mongoose';
import { cacheSet, cacheGet, cacheDel } from '../cache/redisClient.js';
import { addJob, registerMockProcessor } from '../queues/queueManager.js';
import { executeJob } from '../workers/queueWorkers.js';
import Notification from '../models/Notification.js';
import { triggerDailyCronJobsNow } from '../schedulers/cronJobs.js';

let testsPassed = 0;
let testsFailed = 0;

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
console.log('🧪 Starting AgroGuide Phase 8 Test Suite');
console.log('====================================================\n');

// 1. CACHING & EXPIRATION TESTS
runTest('Caching - Set & Get Values', async () => {
  await cacheSet('test_key', { data: 'test_value' }, 100);
  const result = await cacheGet('test_key');
  assert.deepStrictEqual(result, { data: 'test_value' });
});

runTest('Caching - Delete values', async () => {
  await cacheSet('test_key_del', 'hello', 100);
  await cacheDel('test_key_del');
  const result = await cacheGet('test_key_del');
  assert.strictEqual(result, null);
});

runTest('Caching - TTL Expiration Fallback', async () => {
  // Set with 1s expiration
  await cacheSet('test_expire', 'expired_msg', 1);
  
  // Wait 1.5 seconds
  await new Promise(r => setTimeout(r, 1500));
  
  const result = await cacheGet('test_expire');
  assert.strictEqual(result, null); // should be expired and cleaned up
});


// 2. BULLMQ BACKGROUND TASK QUEUES
runTest('Queues - Add background jobs & Fallback emitters', async () => {
  let processed = false;
  
  registerMockProcessor(async (queue, job, data) => {
    if (queue === 'ReminderQueue' && job === 'cropTask') {
      assert.strictEqual(data.taskName, 'Weeding');
      processed = true;
    }
  });

  await addJob('ReminderQueue', 'cropTask', { taskName: 'Weeding' });

  // Wait for setImmediate tick
  await new Promise(r => setTimeout(r, 100));
  assert.strictEqual(processed, true);
});


// 3. NOTIFICATION SYSTEM
runTest('Notifications - Mongoose Instantiation', () => {
  const notif = new Notification({
    userId: new mongoose.Types.ObjectId(),
    title: 'Severe Rainfall Alert',
    message: 'Heavy downpours forecasted for this region next hour.',
    priority: 'high',
    type: 'weather'
  });

  assert.strictEqual(notif.priority, 'high');
  assert.strictEqual(notif.isRead, false);
});


// 4. CRON OVERRIDES
runTest('Cron Jobs - Manual trigger pipeline', async () => {
  const result = await triggerDailyCronJobsNow();
  assert.strictEqual(result.success, true);
});

// Run async tests
(async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 2000));
    console.log('\n====================================================');
    console.log(`📊 TEST SUMMARY: Passed: ${testsPassed} | Failed: ${testsFailed}`);
    console.log('====================================================');
    process.exit(testsFailed > 0 ? 1 : 0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
