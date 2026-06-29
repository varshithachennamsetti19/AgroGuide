import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.WEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

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

  return {
    city: city.charAt(0).toUpperCase() + city.slice(1),
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
    cloudCoverage: condition === "Cloudy" ? 75 : (condition === "Rainy" ? 90 : 15),
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
    forecast: forecastList,
    isMock: true
  };
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

    return {
      city: data.name,
      temperature: data.main.temp,
      feelsLike: data.main.feels_like,
      humidity: data.main.humidity,
      pressure: data.main.pressure,
      windSpeed: data.wind.speed,
      weatherCondition: data.weather[0]?.main || 'Clear',
      visibility: Math.round((data.visibility || 10000) / 1000), // convert to km
      sunrise: data.sys.sunrise,
      sunset: data.sys.sunset,
      rainfall: data.rain?.['1h'] || data.rain?.['3h'] || 0.0,
      cloudCoverage: data.clouds?.all || 0,
      isMock: false
    };
  } catch (error) {
    // If it's a 404 city check, rethrow it directly rather than falling back to mock (so we can tell the user the city is invalid)
    if (error.statusCode === 404) {
      throw error;
    }
    console.error(`❌ Weather Service Error for "${city}":`, error.message);
    // For general network errors, fall back to mock data so the app remains resilient
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
    // The API returns entries every 3 hours. We will group by date.
    const dailyMap = {};
    data.list.forEach(entry => {
      const dateStr = entry.dt_txt.split(' ')[0];
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = {
          temps: [],
          feels: [],
          humidities: [],
          conditions: [],
          pop: 0 // Probability of precipitation (0 to 1)
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

    // Generate average list, excluding today if we want the next 5 days
    const dates = Object.keys(dailyMap).sort();
    const forecastList = dates.slice(0, 5).map(d => {
      const day = dailyMap[d];
      const avgTemp = day.temps.reduce((a, b) => a + b, 0) / day.temps.length;
      const avgFeels = day.feels.reduce((a, b) => a + b, 0) / day.feels.length;
      const avgHumid = day.humidities.reduce((a, b) => a + b, 0) / day.humidities.length;
      
      // Get most frequent weather condition
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
