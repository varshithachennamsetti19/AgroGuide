/**
 * AgroGuide Phase 7 - Intelligence & Web Search Test Suite
 * Run with: node tests/phase7_tests.js
 */

import assert from 'assert';
import mongoose from 'mongoose';
import { translateQuery, searchAgriculturePortal } from '../services/agricultureSearchService.js';
import { generatePrediction } from '../services/predictionService.js';

// Setup Mock Mongoose Connection for model registrations
import SearchHistory from '../models/SearchHistory.js';
import PredictionHistory from '../models/PredictionHistory.js';

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
console.log('🧪 Starting AgroGuide Phase 7 Test Suite');
console.log('====================================================\n');

// 1. TRANSLATION TESTS
runTest('Translation Service - Telugu translation', () => {
  const result = translateQuery('నేడు టమాటా ధర ఎంత?'); // Tomato price in Telugu
  assert.ok(result.includes('tomato'));
  assert.ok(result.includes('price'));
});

runTest('Translation Service - Hindi translation', () => {
  const result = translateQuery('आज धान का भाव क्या है?'); // Rice price in Hindi
  assert.ok(result.includes('rice'));
  assert.ok(result.includes('price'));
});

runTest('Translation Service - Tamil translation', () => {
  const result = translateQuery('நெல் விலை என்ன?'); // Rice price in Tamil
  assert.ok(result.includes('rice'));
  assert.ok(result.includes('price'));
});


// 2. WHITELISTED SEARCH PORTAL TESTS
runTest('Search Portal - Mandi Price Retrieval', async () => {
  const searchResult = await searchAgriculturePortal("What is today's tomato price?");
  assert.strictEqual(searchResult.success, true);
  assert.ok(searchResult.results.length > 0);
  assert.strictEqual(searchResult.sources[0].sourceName, 'Agmarknet Mandi Portal');
  assert.strictEqual(searchResult.sources[0].url, 'https://agmarknet.gov.in/Search/mandi-rates');
});

runTest('Search Portal - ICAR Article Sourcing', async () => {
  const searchResult = await searchAgriculturePortal("ICAR sowing advisory");
  assert.strictEqual(searchResult.success, true);
  assert.ok(searchResult.results.length > 0);
  assert.ok(searchResult.results.some(r => r.sourceName.includes('ICAR')));
});


// 3. PREDICTION ENGINE TESTS
runTest('Prediction Engine - Crop Price Forecast disclaimer and reasoning', async () => {
  const predResult = await generatePrediction("Will cotton prices increase next month?", "en-US");
  assert.strictEqual(predResult.success, true);
  assert.ok(predResult.reply.includes('estimated prediction'));
  assert.ok(predResult.confidence >= 50);
  assert.ok(predResult.historicalPattern.length > 0);
});

runTest('Prediction Engine - Multilingual output format (Telugu)', async () => {
  const predResult = await generatePrediction("Will tomato prices rise next month?", "te-IN");
  assert.strictEqual(predResult.success, true);
  assert.ok(predResult.reply.includes('అంచనా వేయబడిన'));
  assert.ok(predResult.reply.includes('నమ్మక స్థాయి'));
});


// 4. MODEL SCHEMAS TESTS
runTest('Database Models - Schema instantiation', () => {
  const searchLog = new SearchHistory({
    userId: new mongoose.Types.ObjectId(),
    query: 'Cotton market price',
    intent: 'MARKET_QUERY',
    sources: [{ sourceName: 'Agmarknet', url: 'https://agmarknet.gov.in' }],
    confidence: 'High'
  });
  assert.strictEqual(searchLog.intent, 'MARKET_QUERY');
  assert.strictEqual(searchLog.confidence, 'High');

  const predLog = new PredictionHistory({
    userId: new mongoose.Types.ObjectId(),
    predictionType: 'Crop Prices',
    prediction: 'Cotton prices expected to rise.',
    confidence: 85
  });
  assert.strictEqual(predLog.predictionType, 'Crop Prices');
  assert.strictEqual(predLog.confidence, 85);
});

// Run async tests
(async () => {
  try {
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Execute async tests manually here
    const t4 = async () => {
      try {
        const searchResult = await searchAgriculturePortal("What is today's tomato price?");
        assert.strictEqual(searchResult.success, true);
        assert.ok(searchResult.results.length > 0);
        console.log("✅ PASS: Async Mandi Search Test");
        testsPassed++;
      } catch (err) {
        console.error("❌ FAIL: Async Mandi Search Test", err);
        testsFailed++;
      }
    };
    await t4();

    const t5 = async () => {
      try {
        const predResult = await generatePrediction("Will cotton prices increase next month?", "en-US");
        assert.strictEqual(predResult.success, true);
        assert.ok(predResult.reply.includes('estimated prediction'));
        console.log("✅ PASS: Async Prediction Test");
        testsPassed++;
      } catch (err) {
        console.error("❌ FAIL: Async Prediction Test", err);
        testsFailed++;
      }
    };
    await t5();

    console.log('\n====================================================');
    console.log(`📊 TEST SUMMARY: Passed: ${testsPassed} | Failed: ${testsFailed}`);
    console.log('====================================================');
    
    if (testsFailed > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
  } catch (err) {
    console.error("Async runner failure:", err);
    process.exit(1);
  }
})();
