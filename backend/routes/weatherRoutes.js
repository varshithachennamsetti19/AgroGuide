import express from 'express';
import { fetchCurrentWeather, fetchWeatherForecast } from '../services/weatherService.js';
import { protect } from '../middleware/auth.js';
import WeatherHistory from '../models/WeatherHistory.js';

const router = express.Router();

// Apply auth middleware to protect weather API endpoints
router.use(protect);

/**
 * @desc    Get current weather for a city
 * @route   GET /api/weather/current
 * @access  Private
 */
router.get('/current', async (req, res) => {
  const { city } = req.query;

  if (!city || typeof city !== 'string' || city.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'City parameter is required.'
    });
  }

  try {
    const weather = await fetchCurrentWeather(city);
    
    // Save query to database history for future analytics
    await WeatherHistory.create({
      userId: req.user._id,
      city: weather.city,
      temperature: weather.temperature,
      weatherCondition: weather.weatherCondition
    });

    res.json({
      success: true,
      weather
    });
  } catch (error) {
    console.error('Weather route error:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      error: error.message || 'Failed to retrieve current weather'
    });
  }
});

/**
 * @desc    Get 5-day forecast for a city
 * @route   GET /api/weather/forecast
 * @access  Private
 */
router.get('/forecast', async (req, res) => {
  const { city } = req.query;

  if (!city || typeof city !== 'string' || city.trim() === '') {
    return res.status(400).json({
      success: false,
      error: 'City parameter is required.'
    });
  }

  try {
    const forecast = await fetchWeatherForecast(city);
    
    res.json({
      success: true,
      forecast
    });
  } catch (error) {
    console.error('Forecast route error:', error.message);
    const status = error.statusCode || 500;
    res.status(status).json({
      success: false,
      error: error.message || 'Failed to retrieve weather forecast'
    });
  }
});

export default router;
