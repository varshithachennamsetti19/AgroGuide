import fs from 'fs';
import path from 'path';
import User from '../models/User.js';
import { fetchCurrentWeather } from '../services/weatherService.js';
import { generateDailyFarmOverview } from '../services/gemini.js';

/**
 * @desc    Get aggregated personalized dashboard status
 * @route   GET /api/dashboard/status
 * @access  Private
 */
export const getDashboardStatus = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User account not found',
      });
    }

    if (!user.isProfileCompleted) {
      return res.status(200).json({
        success: true,
        isProfileCompleted: false,
        message: 'Onboarding profile is not completed yet.',
      });
    }

    // 1. Fetch current weather for user city/coordinates
    const cityQuery = user.preferredCity || user.district || 'Vijayawada';
    let weather = null;
    try {
      weather = await fetchCurrentWeather(cityQuery);
    } catch (err) {
      console.error('Failed to fetch weather for dashboard:', err.message);
      // Fallback
      weather = {
        city: cityQuery,
        temperature: 28.5,
        weatherCondition: 'Cloudy',
        humidity: 70,
        windSpeed: 4.5,
        uvIndex: 4.2,
        cloudCoverage: 60,
        rainProbability: 25,
        rainfall: 0,
        airQuality: 'Fair',
        lastUpdated: new Date().toISOString(),
      };
    }

    // 2. Crop Lifecycle Math
    const plantingDate = user.plantingDate ? new Date(user.plantingDate) : new Date();
    const daysSincePlanting = Math.max(0, Math.floor((Date.now() - plantingDate) / (1000 * 60 * 60 * 24)));
    
    // Fallback/Default crop harvest durations
    const cropDurations = {
      'Rice': 120,
      'Cotton': 180,
      'Maize': 100,
      'Tomato': 90,
      'Groundnut': 120,
      'Sugarcane': 365,
    };
    const cropName = user.primaryCrop || 'Rice';
    const duration = cropDurations[cropName] || 120;
    
    let expectedHarvest = user.expectedHarvestDate ? new Date(user.expectedHarvestDate) : null;
    if (!expectedHarvest) {
      expectedHarvest = new Date(plantingDate);
      expectedHarvest.setDate(expectedHarvest.getDate() + duration);
    }
    const daysUntilHarvest = Math.max(0, Math.floor((expectedHarvest - Date.now()) / (1000 * 60 * 60 * 24)));

    // Determine current stage if not explicitly set
    let currentStage = user.cropStage || 'Vegetative Stage';
    if (!user.cropStage) {
      if (daysSincePlanting < 10) currentStage = 'Seeding';
      else if (daysSincePlanting < 20) currentStage = 'Germination';
      else if (daysSincePlanting < 50) currentStage = 'Vegetative Stage';
      else if (daysSincePlanting < 80) currentStage = 'Flowering';
      else if (daysSincePlanting < 110) currentStage = 'Fruit Development';
      else currentStage = 'Harvest';
    }

    // 3. Crop Calendar timeline calculations
    // Next Irrigation
    const nextIrrigationDate = new Date();
    let irrigationDelay = 3;
    if (weather.weatherCondition.toLowerCase().includes('rain') || weather.rainProbability > 50) {
      irrigationDelay = 6; // Delay if rain expected
    } else if (weather.temperature > 30) {
      irrigationDelay = 1; // Sooner if hot
    }
    nextIrrigationDate.setDate(nextIrrigationDate.getDate() + irrigationDelay);

    // Next Fertilizer (Schedules: Day 0, Day 25, Day 55, Day 80)
    const nextFertilizerDate = new Date(plantingDate);
    let fertTargetDay = 25;
    if (daysSincePlanting >= 25 && daysSincePlanting < 55) {
      fertTargetDay = 55;
    } else if (daysSincePlanting >= 55 && daysSincePlanting < 80) {
      fertTargetDay = 80;
    } else if (daysSincePlanting >= 80) {
      fertTargetDay = daysSincePlanting + 20;
    }
    nextFertilizerDate.setDate(nextFertilizerDate.getDate() + fertTargetDay);
    if (nextFertilizerDate < new Date()) {
      nextFertilizerDate.setDate(new Date().getDate() + 2);
    }

    // Next Pesticide (Schedules: Day 15, Day 45, Day 75)
    const nextPesticideDate = new Date(plantingDate);
    let pestTargetDay = 15;
    if (daysSincePlanting >= 15 && daysSincePlanting < 45) {
      pestTargetDay = 45;
    } else if (daysSincePlanting >= 45 && daysSincePlanting < 75) {
      pestTargetDay = 75;
    } else if (daysSincePlanting >= 75) {
      pestTargetDay = daysSincePlanting + 25;
    }
    nextPesticideDate.setDate(nextPesticideDate.getDate() + pestTargetDay);
    if (nextPesticideDate < new Date()) {
      nextPesticideDate.setDate(new Date().getDate() + 3);
    }

    // 4. Government Scheme Reminders
    let schemeReminder = null;
    try {
      const schemesPath = path.join(process.cwd(), 'data', 'schemes.json');
      if (fs.existsSync(schemesPath)) {
        const rawSchemes = fs.readFileSync(schemesPath, 'utf8');
        const schemes = JSON.parse(rawSchemes);
        
        // Find matching scheme
        const isAP = user.state && (user.state.toLowerCase().includes('andhra') || user.state.toLowerCase().includes('ap') || user.state.toLowerCase().includes('ఆంధ్ర'));
        if (isAP) {
          schemeReminder = schemes.find(s => s.scheme.includes('Rythu Bharosa')) || schemes[0];
        } else {
          schemeReminder = schemes.find(s => s.scheme.includes('PM Kisan')) || schemes[0];
        }
      }
    } catch (err) {
      console.error('Failed to load schemes for dashboard:', err.message);
    }

    if (!schemeReminder) {
      schemeReminder = {
        scheme: "PM Kisan Samman Nidhi",
        content: "Ensure your e-KYC is completed on the PM-Kisan portal to receive the next installment of Rs. 2,000.",
      };
    }

    // 5. Daily Personalized AI Overview recommendation
    const langCode = user.preferredLanguage || 'en-US';
    const personalizedRecommendation = await generateDailyFarmOverview(weather, user, langCode);

    res.status(200).json({
      success: true,
      isProfileCompleted: true,
      profile: {
        fullName: user.fullName || user.name,
        state: user.state,
        district: user.district,
        village: user.village,
        primaryCrop: cropName,
        soilType: user.soilType,
        waterSource: user.waterSource,
        irrigationMethod: user.irrigationMethod,
        cropStage: currentStage,
        plantingDate: user.plantingDate,
        expectedHarvestDate: expectedHarvest,
        daysSincePlanting,
        daysUntilHarvest,
        farmSize: user.farmSize,
        farmSizeUnit: user.farmSizeUnit,
      },
      weather,
      cropCalendar: {
        nextIrrigation: nextIrrigationDate.toISOString().split('T')[0],
        nextFertilizer: nextFertilizerDate.toISOString().split('T')[0],
        nextPesticide: nextPesticideDate.toISOString().split('T')[0],
        expectedHarvest: expectedHarvest.toISOString().split('T')[0],
      },
      schemeReminder,
      personalizedRecommendation,
      upcomingRainAlert: weather.rainProbability > 50 || weather.weatherCondition.toLowerCase().includes('rain'),
    });

  } catch (error) {
    console.error('Dashboard status error:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Server error loading dashboard status',
    });
  }
};
