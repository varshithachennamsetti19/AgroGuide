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
export async function sendChatMessage(message, history = []) {
  try {
    const response = await api.post('/chat', { message, history });
    
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

export default api;
