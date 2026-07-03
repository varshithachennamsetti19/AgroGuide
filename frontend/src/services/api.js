import axios from 'axios';

// Base URL configuration pointing to the Express server
const API_BASE_URL = 'http://localhost:5000/api';

// Create a configured Axios instance with credentials enabled for cookies
const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sends a user message and the current chat history to the backend.
 * 
 * @param {string} message - The current message entered by the user.
 * @param {Array} history - The chat conversation history: Array of { role: 'user' | 'model', text: string }
 * @returns {Promise<Object>} The response details containing the AI reply.
 */
export async function sendChatMessage(message, history = [], latitude = null, longitude = null) {
  try {
    const response = await api.post('/chat', { message, history, latitude, longitude });
    
    if (response.data && response.data.success) {
      return response.data;
    } else {
      throw new Error(response.data?.error || 'Unknown error response from assistant.');
    }
  } catch (error) {
    console.error('API service error:', error);
    const errorMsg = error.response?.data?.error || 
                     error.message || 
                     'Unable to connect to the backend server. Please verify it is running on port 5000.';
    throw new Error(errorMsg);
  }
}

/**
 * User Registration
 */
export async function registerUser(name, email, password, preferredLanguage) {
  try {
    const response = await api.post('/auth/register', { name, email, password, preferredLanguage });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Registration failed');
  }
}

/**
 * User Login
 */
export async function loginUser(email, password) {
  try {
    const response = await api.post('/auth/login', { email, password });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Login failed');
  }
}

/**
 * User Logout
 */
export async function logoutUser() {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Logout failed');
  }
}

/**
 * Get current user profile (session verification)
 */
export async function getMe() {
  try {
    const response = await api.get('/auth/me');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Session expired');
  }
}

/**
 * Get chat history for logged-in user
 */
export async function getChatHistory() {
  try {
    const response = await api.get('/chat/history');
    return response.data.chats || [];
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch chat history');
  }
}

/**
 * Delete a specific chat message
 */
export async function deleteChat(id) {
  try {
    const response = await api.delete(`/chat/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete chat record');
  }
}

/**
 * Clear all chat history
 */
export async function clearChatHistory() {
  try {
    const response = await api.delete('/chat/history');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to clear chat history');
  }
}

/**
 * Fetch current weather for a city
 */
export async function getCurrentWeather(city) {
  try {
    const response = await api.get(`/weather/current`, { params: { city } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || `Failed to fetch current weather for ${city}`);
  }
}

/**
 * Fetch 5-day weather forecast for a city
 */
export async function getWeatherForecast(city) {
  try {
    const response = await api.get(`/weather/forecast`, { params: { city } });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || `Failed to fetch weather forecast for ${city}`);
  }
}

/**
 * Update user location profile
 */
export async function updateUserLocation(locationData) {
  try {
    const response = await api.put('/auth/profile', locationData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update location profile');
  }
}

/**
 * Fetch personalized dashboard status details
 */
export async function getDashboardStatus() {
  try {
    const response = await api.get('/dashboard/status');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch dashboard status');
  }
}

/**
 * Fetch all farms for current user
 */
export async function getFarms() {
  try {
    const response = await api.get('/farms');
    return response.data.farms || [];
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch farms list');
  }
}

/**
 * Create a new farm record
 */
export async function createFarm(farmData) {
  try {
    const response = await api.post('/farms', farmData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to create new farm');
  }
}

/**
 * Update an existing farm record
 */
export async function updateFarm(id, farmData) {
  try {
    const response = await api.put(`/farms/${id}`, farmData);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to update farm details');
  }
}

/**
 * Delete a farm record
 */
export async function deleteFarm(id) {
  try {
    const response = await api.delete(`/farms/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to delete farm');
  }
}

/**
 * Notifications APIs (Phase 8)
 */
export async function getNotifications() {
  try {
    const response = await api.get('/notifications');
    return response.data.notifications || [];
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch notifications');
  }
}

export async function markNotificationRead(id) {
  try {
    const response = await api.put(`/notifications/${id}/read`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to mark notification read');
  }
}

export async function markAllNotificationsRead() {
  try {
    const response = await api.put('/notifications/read-all');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to mark all notifications read');
  }
}

/**
 * Admin Panel APIs (Phase 8)
 */
export async function getAdminMetrics() {
  try {
    const response = await api.get('/admin/metrics');
    return response.data.metrics || null;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to fetch admin statistics');
  }
}

export async function triggerCronOverride() {
  try {
    const response = await api.post('/admin/trigger-jobs');
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to trigger cron override');
  }
}

/**
 * Multimodal Crop Disease Diagnostics APIs (Phase 9)
 */
export async function uploadVisionImage(formData) {
  try {
    const response = await api.post('/vision/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to upload diagnostic image.');
  }
}

export async function analyzeVisionImage(imagePath) {
  try {
    const response = await api.post('/vision/analyze', { imagePath });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to run disease diagnosis analysis.');
  }
}

export async function getVisionHistory() {
  try {
    const response = await api.get('/vision/history');
    return response.data.history || [];
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to retrieve diagnostics history.');
  }
}

export async function getVisionStatistics() {
  try {
    const response = await api.get('/vision/statistics');
    return response.data.statistics || null;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Failed to retrieve diagnostics stats.');
  }
}

export default api;


