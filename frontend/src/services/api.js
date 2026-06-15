import axios from 'axios';

// Base URL configuration pointing to the Express server
const API_BASE_URL = 'http://localhost:5000/api';

// Create a configured Axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Sends a user message and the current chat history to the backend.
 * 
 * @param {string} message - The current message entered by the user.
 * @param {Array} history - The chat conversation history: Array of { role: 'user' | 'model', text: string }
 * @returns {Promise<string>} The assistant's text reply.
 */
export async function sendChatMessage(message, history = []) {
  try {
    const response = await api.post('/chat', { message, history });
    
    if (response.data && response.data.success) {
      return response.data.reply;
    } else {
      throw new Error(response.data?.error || 'Unknown error response from assistant.');
    }
  } catch (error) {
    console.error('API service error:', error);
    
    // Standardize error message presentation to the user
    const errorMsg = error.response?.data?.error || 
                     error.message || 
                     'Unable to connect to the backend server. Please verify it is running on port 5000.';
    
    throw new Error(errorMsg);
  }
}
