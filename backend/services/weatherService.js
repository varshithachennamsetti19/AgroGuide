import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_BASE_URL = 'https://api.openweathermap.org/geo/1.0';

/**
 * Helper to estimate UV Index based on latitude, clouds, and time of day.
 */
export function estimateUVIndex(lat, lon, clouds) {
  const hours = new Date().getHours();
  // Peak UV around noon (12:00 - 14:00)
  const timeFactor = Math.max(0, 1 - Math.abs(hours - 13) / 6); // 0 outside 7am - 7pm, peak at 1pm
  const latFactor = Math.max(0.1, 1 - Math.abs(lat || 0) / 90);
  const cloudFactor = 1 - (clouds || 0) / 100 * 0.7; // clouds reduce UV up to 70%
  const uv = 12 * timeFactor * latFactor * cloudFactor;
  return Math.round(uv * 10) / 10;
}

/**
 * Returns dynamic, realistic weather data for testing/fallback.
 * Useful when WEATHER_API_KEY is not defined or is invalid.
 */
function getMockCurrentWeather(city) {
  const cleanCity = city.trim().toLowerCase();
  
  // Seed basic parameters based on city name to keep it semi-predictable
  let temp = 30.0;
  let humidity = 65;
  let condition = "Sunny";
  let windSpeed = 3.5;
  let pressure = 1008;
  
  if (cleanCity.includes('vijayawada') || cleanCity.includes('guntur')) {
    temp = 32.5;
    humidity = 82;
    condition = "Rainy";
    windSpeed = 5.2;
  } else if (cleanCity.includes('hyderabad')) {
    temp = 28.0;
    humidity = 55;
    condition = "Cloudy";
    windSpeed = 2.8;
  } else if (cleanCity.includes('bangalore') || cleanCity.includes('bengaluru')) {
    temp = 24.5;
    humidity = 60;
    condition = "Cloudy";
    windSpeed = 4.0;
  }

  // Add small random deviations
  temp = Math.round((temp + (Math.random() * 4 - 2)) * 10) / 10;
  humidity = Math.min(100, Math.max(10, Math.round(humidity + (Math.random() * 10 - 5))));
  windSpeed = Math.round((windSpeed + (Math.random() * 2 - 1)) * 10) / 10;

  const clouds = condition === "Cloudy" ? 75 : (condition === "Rainy" ? 90 : 15);
  const lat = cleanCity.includes('hyderabad') ? 17.3850 : (cleanCity.includes('vijayawada') ? 16.5062 : 16.3067);
  const lon = cleanCity.includes('hyderabad') ? 78.4867 : (cleanCity.includes('vijayawada') ? 80.6480 : 80.4365);

  return {
    city: city.charAt(0).toUpperCase() + city.slice(1),
    latitude: lat,
    longitude: lon,
    temperature: temp,
    feelsLike: Math.round((temp + (humidity > 70 ? 2 : -1)) * 10) / 10,
    humidity: humidity,
    pressure: pressure,
    windSpeed: windSpeed,
    weatherCondition: condition,
    visibility: 10, // km
    sunrise: Math.round(Date.now() / 1000 - 18000), // ~5 hours ago
    sunset: Math.round(Date.now() / 1000 + 18000),  // ~5 hours from now
    rainfall: condition === "Rainy" ? 15.5 : 0.0,   // mm
    cloudCoverage: clouds,
    airQuality: 'Fair',
    airQualityIndex: 2,
    uvIndex: estimateUVIndex(lat, lon, clouds),
    rainProbability: condition === "Rainy" ? 80 : (condition === "Cloudy" ? 30 : 5),
    lastUpdated: new Date().toISOString(),
    isMock: true
  };
}

/**
 * Returns dynamic, realistic 5-day forecast mock data.
 */
function getMockForecast(city) {
  const cleanCity = city.trim().toLowerCase();
  const current = getMockCurrentWeather(city);
  const forecastList = [];
  
  // Create 5 daily steps
  for (let i = 1; i <= 5; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);
    
    let temp = current.temperature + (Math.random() * 4 - 2);
    let humidity = current.humidity + Math.round(Math.random() * 20 - 10);
    humidity = Math.min(100, Math.max(10, humidity));
    
    let condition = "Sunny";
    if (humidity > 75) condition = "Rainy";
    else if (humidity > 55) condition = "Cloudy";

    forecastList.push({
      date: date.toISOString().split('T')[0],
      temperature: Math.round(temp * 10) / 10,
      feelsLike: Math.round((temp + (humidity > 70 ? 2 : -1)) * 10) / 10,
      humidity: humidity,
      weatherCondition: condition,
      rainProbability: condition === "Rainy" ? 80 : (condition === "Cloudy" ? 30 : 5)
    });
  }

  return {
    city: current.city,
    latitude: current.latitude,
    longitude: current.longitude,
    forecast: forecastList,
    isMock: true
  };
}

/**
 * Direct Geocoding API: converts city name to lat/lon.
 */
export async function geocodeCity(city) {
  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    throw new Error('City parameter is required.');
  }

  if (!API_KEY || API_KEY.trim() === '') {
    console.warn(`⚠️ Weather Service: WEATHER_API_KEY is missing. Using mock geocoding for city "${city}".`);
    const mock = getMockCurrentWeather(city);
    return {
      city: mock.city,
      state: 'Andhra Pradesh',
      country: 'IN',
      latitude: mock.latitude,
      longitude: mock.longitude
    };
  }

  try {
    const url = `${GEO_BASE_URL}/direct?q=${encodeURIComponent(city)}&limit=1&appid=${API_KEY}`;
    const response = await fetch(url);

    if (response.status === 401) {
      console.warn(`⚠️ Weather Service: Invalid OpenWeatherMap API Key (401). Falling back to mock geocoding.`);
      const mock = getMockCurrentWeather(city);
      return { city: mock.city, state: 'Andhra Pradesh', country: 'IN', latitude: mock.latitude, longitude: mock.longitude };
    }

    if (!response.ok) {
      throw new Error(`OpenWeatherMap Geocoding server error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const loc = data[0];
      return {
        city: loc.name,
        state: loc.state || '',
        country: loc.country,
        latitude: loc.lat,
        longitude: loc.lon
      };
    } else {
      const err = new Error(`City "${city}" not found.`);
      err.statusCode = 404;
      throw err;
    }
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`❌ Geocode Error for "${city}":`, error.message);
    const mock = getMockCurrentWeather(city);
    return {
      city: mock.city,
      state: 'Andhra Pradesh',
      country: 'IN',
      latitude: mock.latitude,
      longitude: mock.longitude
    };
  }
}

/**
 * Reverse Geocoding API: converts lat/lon to city name.
 */
export async function reverseGeocode(lat, lon) {
  if (lat === undefined || lon === undefined) {
    throw new Error('Latitude and Longitude parameters are required.');
  }

  if (!API_KEY || API_KEY.trim() === '') {
    console.warn(`⚠️ Weather Service: WEATHER_API_KEY is missing. Using mock reverse geocoding.`);
    return {
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      country: 'IN',
      latitude: lat,
      longitude: lon
    };
  }

  try {
    const url = `${GEO_BASE_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`;
    const response = await fetch(url);

    if (response.status === 401) {
      console.warn(`⚠️ Weather Service: Invalid OpenWeatherMap API Key (401). Falling back to mock reverse geocoding.`);
      return { city: 'Vijayawada', state: 'Andhra Pradesh', district: 'Krishna', country: 'IN', latitude: lat, longitude: lon };
    }

    if (!response.ok) {
      throw new Error(`OpenWeatherMap Reverse Geocoding server error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.length > 0) {
      const loc = data[0];
      return {
        city: loc.name,
        state: loc.state || '',
        district: loc.local_names?.en || loc.name,
        country: loc.country,
        latitude: loc.lat,
        longitude: loc.lon
      };
    } else {
      throw new Error('No location found for these coordinates.');
    }
  } catch (error) {
    console.error('❌ Reverse Geocode Error:', error.message);
    return {
      city: 'Vijayawada',
      state: 'Andhra Pradesh',
      district: 'Krishna',
      country: 'IN',
      latitude: lat,
      longitude: lon
    };
  }
}

/**
 * Air Pollution API: fetches AQI details.
 */
export async function fetchAirPollution(lat, lon) {
  if (lat === undefined || lon === undefined) {
    throw new Error('Latitude and Longitude parameters are required.');
  }

  if (!API_KEY || API_KEY.trim() === '') {
    return {
      aqi: 2, // Fair
      co: 201.94,
      no2: 0.82,
      o3: 68.66,
      pm2_5: 12.5,
      pm10: 20.4
    };
  }

  try {
    const url = `${BASE_URL}/air_pollution?lat=${lat}&lon=${lon}&appid=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`OpenWeatherMap Air Pollution server error: ${response.statusText}`);
    }

    const data = await response.json();
    if (data && data.list && data.list.length > 0) {
      const item = data.list[0];
      return {
        aqi: item.main.aqi,
        co: item.components.co,
        no2: item.components.no2,
        o3: item.components.o3,
        pm2_5: item.components.pm2_5,
        pm10: item.components.pm10
      };
    } else {
      throw new Error('No air pollution details found.');
    }
  } catch (error) {
    console.error('❌ Air Pollution API Error:', error.message);
    return {
      aqi: 2,
      co: 201.94,
      no2: 0.82,
      o3: 68.66,
      pm2_5: 12.5,
      pm10: 20.4
    };
  }
}

/**
 * Fetch current weather for a city.
 */
export async function fetchCurrentWeather(city) {
  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    throw new Error('City parameter is required.');
  }

  // Fallback if key is missing
  if (!API_KEY || API_KEY.trim() === '') {
    console.warn(`⚠️ Weather Service: WEATHER_API_KEY is missing. Using local mock generator for city "${city}".`);
    return getMockCurrentWeather(city);
  }

  try {
    const url = `${BASE_URL}/weather?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);
    
    if (response.status === 401) {
      console.warn(`⚠️ Weather Service: Invalid OpenWeatherMap API Key (401). Falling back to mock generator.`);
      return getMockCurrentWeather(city);
    }
    
    if (response.status === 404) {
      const err = new Error(`City "${city}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (response.status === 429) {
      const err = new Error('OpenWeatherMap API rate limit exceeded.');
      err.statusCode = 429;
      throw err;
    }

    if (!response.ok) {
      throw new Error(`OpenWeatherMap server error: ${response.statusText}`);
    }

    const data = await response.json();
    const lat = data.coord.lat;
    const lon = data.coord.lon;
    const clouds = data.clouds?.all || 0;

    // Call Air Pollution API
    const pollution = await fetchAirPollution(lat, lon).catch(() => ({ aqi: 2 }));
    const estimatedUv = estimateUVIndex(lat, lon, clouds);

    const aqiLabels = ['Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const aqiText = aqiLabels[pollution.aqi - 1] || 'Fair';

    const cond = data.weather[0]?.main || 'Clear';

    return {
      city: data.name,
      latitude: lat,
      longitude: lon,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      weatherCondition: cond,
      visibility: Math.round((data.visibility || 10000) / 1000), // convert to km
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] || 0.0,
      cloudCoverage: clouds,
      airQuality: aqiText,
      airQualityIndex: pollution.aqi,
      uvIndex: estimatedUv,
      rainProbability: cond === 'Rain' || cond === 'Drizzle' || cond === 'Thunderstorm' ? 85 : (clouds > 50 ? 40 : 10),
      lastUpdated: new Date().toISOString(),
      isMock: false
    };
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`❌ Weather Service Error for "${city}":`, error.message);
    console.log(`⚠️ Falling back to mock weather data for "${city}" due to network/API error.`);
    return getMockCurrentWeather(city);
  }
}

/**
 * Fetch 5-day weather forecast for a city.
 */
export async function fetchWeatherForecast(city) {
  if (!city || typeof city !== 'string' || city.trim().length === 0) {
    throw new Error('City parameter is required.');
  }

  // Fallback if key is missing
  if (!API_KEY || API_KEY.trim() === '') {
    console.warn(`⚠️ Weather Service: WEATHER_API_KEY is missing. Using local mock forecast for city "${city}".`);
    return getMockForecast(city);
  }

  try {
    const url = `${BASE_URL}/forecast?q=${encodeURIComponent(city)}&appid=${API_KEY}&units=metric`;
    const response = await fetch(url);

    if (response.status === 401) {
      console.warn(`⚠️ Weather Service: Invalid OpenWeatherMap API Key (401). Falling back to mock forecast.`);
      return getMockForecast(city);
    }

    if (response.status === 404) {
      const err = new Error(`City "${city}" not found.`);
      err.statusCode = 404;
      throw err;
    }

    if (response.status === 429) {
      const err = new Error('OpenWeatherMap API rate limit exceeded.');
      err.statusCode = 429;
      throw err;
    }

    if (!response.ok) {
      throw new Error(`OpenWeatherMap server error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Group forecast data by daily averages/max probabilities
    const dailyMap = {};
    data.list.forEach(entry => {
      const dateStr = entry.dt_txt.split(' ')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          temps: [],
          feels: [],
          humidities: [],
          conditions: [],
          pop: 0
        };
      }
      dailyMap[dateStr].temps.push(entry.main.temp);
      dailyMap[dateStr].feels.push(entry.main.feels_like);
      dailyMap[dateStr].humidities.push(entry.main.humidity);
      dailyMap[dateStr].conditions.push(entry.weather[0]?.main || 'Clear');
      if (entry.pop > dailyMap[dateStr].pop) {
        dailyMap[dateStr].pop = entry.pop;
      }
    });

    const dates = Object.keys(dailyMap).sort();
    const forecastList = dates.slice(0, 5).map(d => {
      const day = dailyMap[d];
      const avgTemp = day.temps.reduce((a, b) => a + b, 0) / day.temps.length;
      const avgFeels = day.feels.reduce((a, b) => a + b, 0) / day.feels.length;
      const avgHumid = day.humidities.reduce((a, b) => a + b, 0) / day.humidities.length;
      
      const condCounts = {};
      let dominantCondition = 'Clear';
      let maxCount = 0;
      day.conditions.forEach(c => {
        condCounts[c] = (condCounts[c] || 0) + 1;
        if (condCounts[c] > maxCount) {
          maxCount = condCounts[c];
          dominantCondition = c;
        }
      });

      return {
        date: d,
        temperature: Math.round(avgTemp * 10) / 10,
        feelsLike: Math.round(avgFeels * 10) / 10,
        humidity: Math.round(avgHumid),
        weatherCondition: dominantCondition,
        rainProbability: Math.round(day.pop * 100)
      };
    });

    return {
      city: data.city?.name || city,
      latitude: data.city?.coord?.lat,
      longitude: data.city?.coord?.lon,
      forecast: forecastList,
      isMock: false
    };
  } catch (error) {
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`❌ Weather Service Error for "${city}":`, error.message);
    console.log(`⚠️ Falling back to mock forecast for "${city}" due to network/API error.`);
    return getMockForecast(city);
  }
}
