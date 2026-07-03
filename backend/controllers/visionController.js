import fs from 'fs';
import path from 'path';
import axios from 'axios';
import DiseaseHistory from '../models/DiseaseHistory.js';
import User from '../models/User.js';
import Notification from '../models/Notification.js';
import { retrieve } from '../rag/retriever.js';
import { generateReply } from '../services/gemini.js';
import { fetchCurrentWeather } from '../services/weatherService.js';
import { cacheGet, cacheSet } from '../cache/redisClient.js';
import { addJob } from '../queues/queueManager.js';

const VISION_SERVICE_URL = process.env.VISION_SERVICE_URL || 'http://localhost:8000/analyze';

/**
 * Helper to get weather warnings based on rules (Part 6)
 */
function getWeatherPesticideWarning(weatherData) {
  if (!weatherData) return null;
  
  const wind = weatherData.windSpeed || 0;
  const temp = weatherData.temperature || 25;
  const cond = (weatherData.weatherCondition || '').toLowerCase();
  
  if (cond.includes('rain') || cond.includes('drizzle') || cond.includes('storm')) {
    return '🌧 Warning: Rainfall expected in your region. Do not apply pesticide or chemical sprays today to avoid chemical run-off. Wait until conditions clear.';
  }
  if (wind > 5.0) {
    return '💨 Warning: High wind speed detected. Postpone pesticide spraying to avoid drift and safeguard neighboring plots.';
  }
  if (temp > 32.0) {
    return '☀️ Warning: High temperature detected. Avoid chemical applications during peak noon hours to prevent leaf scorching. Apply early morning or late evening.';
  }
  return null;
}

/**
 * POST /api/vision/upload
 * Stores image file locally and returns path
 */
export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No image file uploaded.' });
    }

    const fileUrl = `http://localhost:5000/uploads/${req.file.filename}`;
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully.',
      filePath: req.file.path,
      fileUrl
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/vision/analyze
 * Submits image to Python Vision service, grounds with RAG & Weather, and queries Gemini.
 */
export const analyzeImage = async (req, res) => {
  const { imagePath } = req.body;
  const userId = req.user._id;

  if (!imagePath) {
    return res.status(400).json({ success: false, error: 'imagePath is required.' });
  }

  try {
    const user = await User.findById(userId);
    const lang = user?.preferredLanguage || 'en-US';

    // 1. Check file existence
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ success: false, error: 'Uploaded file not found on disk.' });
    }

    // 2. Proxy request to FastAPI Vision Service
    console.log(`📤 Proxying image to Python Vision Classifier: ${imagePath}`);
    const fileStream = fs.createReadStream(imagePath);
    const formData = new FormData();
    // Wrap stream in a Blob so native fetch/formdata handles it correctly in Node
    const stats = fs.statSync(imagePath);
    const fileBuffer = fs.readFileSync(imagePath);
    
    // We can use standard axios with form-data post
    const form = new FormData();
    const blob = new Blob([fileBuffer], { type: 'image/jpeg' });
    form.append('file', blob, path.basename(imagePath));

    const visionRes = await axios.post(VISION_SERVICE_URL, form, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });

    const visionData = visionRes.data;

    // Handle image validation failures (blurry/dark/bright) (Part 3)
    if (!visionData.success) {
      return res.status(200).json({
        success: false,
        error: visionData.error,
        reason: visionData.reason
      });
    }

    const { crop, disease, confidence, severity, healthy, unknown } = visionData;

    // If confidence is lower than 70%, refuse analysis (Part 4)
    if (confidence < 0.70 && !healthy) {
      return res.status(200).json({
        success: false,
        error: "I'm unable to confidently identify this disease. Please upload a clearer image.",
        reason: "low_confidence"
      });
    }

    // 3. Fetch Weather info for advice grounding (Part 6)
    let weatherData = null;
    let weatherWarning = null;
    if (user && user.preferredCity) {
      const weatherCacheKey = `weather:current:${user.preferredCity.toLowerCase().trim()}`;
      weatherData = await cacheGet(weatherCacheKey);
      if (!weatherData) {
        try {
          weatherData = await fetchCurrentWeather(user.preferredCity);
          await cacheSet(weatherCacheKey, weatherData, 600);
        } catch (err) {
          console.warn('Weather fetch failed during diagnosis:', err.message);
        }
      }
      weatherWarning = getWeatherPesticideWarning(weatherData);
    }

    // 4. Retrieve RAG details for Grounding (Part 5)
    let ragContext = "";
    if (!healthy && !unknown) {
      const ragCacheKey = `rag:vision:${crop.toLowerCase()}:${disease.toLowerCase()}`;
      const cachedRAG = await cacheGet(ragCacheKey);
      if (cachedRAG) {
        ragContext = cachedRAG;
      } else {
        const chunks = await retrieve(`${crop} ${disease} organic treatment control`, 3);
        if (chunks && chunks.length > 0) {
          ragContext = chunks.map(c => c.text).join('\n\n');
          await cacheSet(ragCacheKey, ragContext, 3600);
        }
      }
    }

    // 5. Generate Gemini Explanation (Part 5)
    let explanation = "";
    let insuranceScheme = null;

    let promptLanguage = "English";
    if (lang === 'te-IN') promptLanguage = "Telugu";
    if (lang === 'hi-IN') promptLanguage = "Hindi";
    if (lang === 'ta-IN') promptLanguage = "Tamil";

    if (healthy) {
      explanation = {
        'en-US': "The plant appears healthy! Continue standard irrigation and fertilizer practices.",
        'te-IN': "మొక్క ఆరోగ్యంగా ఉంది! సాధారణ నీటి పారుదల మరియు ఎరువుల పద్ధతులను కొనసాగించండి.",
        'hi-IN': "पौधा स्वस्थ प्रतीत होता है! सामान्य सिंचाई और उर्वरक प्रथाओं को जारी रखें।",
        'ta-IN': "பயிர் ஆரோக்கியமாக உள்ளது! வழக்கமான நீர்ப்பாசனம் மற்றும் உர நடைமுறைகளைத் தொடரவும்."
      }[lang] || "The plant appears healthy!";
    } else {
      // Determine insurance suggestions if severity is High (Part 7)
      if (severity === 'High') {
        insuranceScheme = {
          'en-US': 'PM Fasal Bima Yojana (PMFBY) - Crop loss relief schemes for severe leaf diseases. Apply for compensation via the national farmer portal.',
          'te-IN': 'PM ఫసల్ బీమా యోజన (PMFBY) - తీవ్రమైన వ్యాధుల వల్ల పంట నష్టపోతే పరిహారం. జాతీయ రైతు పోర్టల్ ద్వారా దరఖాస్తు చేసుకోండి.',
          'hi-IN': 'प्रधानमंत्री फसल बीमा योजना (PMFBY) - फसल नुकसान राहत योजना। राष्ट्रीय किसान पोर्टल के माध्यम से मुआवजे के लिए आवेदन करें।',
          'ta-IN': 'பிரதம மந்திரி பயிர் காப்பீட்டுத் திட்டம் (PMFBY) - பயிர் இழப்பு நிவாரண உதவி.'
        }[lang] || 'PM Fasal Bima Yojana (PMFBY)';
      }

      const prompt = `
You are AgroGuide AI Multimodal Diagnostic System.
Explain the diagnosed crop disease:

Crop: ${crop}
Disease: ${disease}
Severity: ${severity}
Weather Conditions: ${weatherData ? `${weatherData.weatherCondition}, Temp: ${weatherData.temperature}°C, Wind: ${weatherData.windSpeed}m/s` : 'Unknown'}
Weather Warning to include: ${weatherWarning || 'None'}
RAG Treatment Guidelines:
${ragContext || 'Apply standard organic/chemical crop disease treatment guidelines.'}

Please write a highly detailed crop diagnosis report in ${promptLanguage}. Include:
1. Cause of the disease (bacteria/fungi/virus)
2. Main visible symptoms
3. Propagation / Spread factors
4. Detailed Organic Treatment (safe bio-fertilizers/pesticides)
5. Chemical Treatment (recommended active chemicals)
6. Preventive Measures & Precautions

Response (Plain text format only, do not use JSON wrappers):
`;

      const geminiRes = await generateReply(prompt, [], "");
      explanation = geminiRes.text;
    }

    // 6. Save in DiseaseHistory database (Part 9)
    const newDiagnosis = await DiseaseHistory.create({
      userId,
      imagePath,
      crop,
      disease,
      confidence: Math.round(confidence * 100),
      severity,
      treatment: {
        organic: healthy ? 'N/A' : 'Organic spray recommendations included in report.',
        chemical: healthy ? 'N/A' : 'Chemical formulations included in report.',
        preventive: healthy ? 'N/A' : 'Crop hygiene and rotation.',
        precautions: weatherWarning || 'Standard safety gear.'
      },
      weather: weatherData,
      location: user?.lastKnownLocation || user?.preferredCity || 'India'
    });

    // 7. Severe Alert & Reminder via BullMQ (Part 12)
    if (severity === 'High') {
      // Dispatch immediate notification
      await Notification.create({
        userId,
        title: `🚨 Severe Disease Detected: ${disease}`,
        message: `High severity ${disease} detected on your ${crop} crops. Check the treatments dashboard and apply remedies immediately.`,
        priority: 'high',
        type: 'crop'
      });

      // Queue a BullMQ task to repeat inspection in 3 days (simulated here)
      await addJob('ReminderQueue', 'cropTask', {
        userId,
        crop,
        taskName: `Repeat inspection for ${disease} control (High severity detected 3 days ago)`
      });
    }

    res.status(200).json({
      success: true,
      analysis: {
        crop,
        disease,
        confidence: Math.round(confidence * 100),
        severity,
        healthy,
        unknown
      },
      explanation,
      weatherWarning,
      insuranceScheme,
      diagnosisId: newDiagnosis._id
    });

  } catch (error) {
    console.error('Error analyzing leaf image:', error.message);
    res.status(500).json({ success: false, error: 'Failed to process crop disease diagnosis.' });
  }
};

/**
 * GET /api/vision/history
 * Fetches diagnostic archives
 */
export const getDiagnosisHistory = async (req, res) => {
  const userId = req.user._id;
  try {
    const list = await DiseaseHistory.find({ userId }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, history: list });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * GET /api/vision/statistics
 * Compiles diagnostic metrics (Part 10)
 */
export const getDiagnosisStatistics = async (req, res) => {
  const userId = req.user._id;
  try {
    const list = await DiseaseHistory.find({ userId });
    
    const total = list.length;
    const healthyCount = list.filter(item => item.disease.toLowerCase().includes('healthy')).length;
    const diseasedCount = total - healthyCount;

    const diseasesStats = {};
    const cropsStats = {};

    list.forEach(item => {
      // count diseases
      diseasesStats[item.disease] = (diseasesStats[item.disease] || 0) + 1;
      // count crops
      cropsStats[item.crop] = (cropsStats[item.crop] || 0) + 1;
    });

    const averageConfidence = total > 0 ? list.reduce((sum, item) => sum + item.confidence, 0) / total : 0;

    res.status(200).json({
      success: true,
      statistics: {
        totalDiagnoses: total,
        healthyPlants: healthyCount,
        diseasedPlants: diseasedCount,
        healthyPercentage: total > 0 ? Math.round((healthyCount / total) * 100) : 100,
        averageConfidence: Math.round(averageConfidence),
        diseasesBreakdown: Object.entries(diseasesStats).map(([name, count]) => ({ name, count })),
        cropsBreakdown: Object.entries(cropsStats).map(([name, count]) => ({ name, count }))
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
