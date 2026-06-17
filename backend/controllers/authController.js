import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Helper: Generate JWT token and set in HTTP-only cookie
const sendTokenResponse = (user, statusCode, res) => {
  // Sign JWT
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    expiresIn: '30d',
  });

  const cookieOptions = {
    httpOnly: true,
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  };

  res
    .status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        preferredLanguage: user.preferredLanguage,
      },
    });
};

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  const { name, email, password, preferredLanguage } = req.body;

  try {
    // Check if user already exists
    const userExists = await User.findOne({ email });

    if (userExists) {
      return res.status(400).json({
        success: false,
        error: 'A user with this email address already exists',
      });
    }

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      preferredLanguage: preferredLanguage || 'en-US',
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('Registration error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message || 'Server error occurred during registration',
    });
  }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Validate request fields
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and password',
      });
    }

    // Check for user
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials',
      });
    }

    // Check if password matches
    const isMatch = await user.comparePassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password credentials',
      });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    console.error('Login error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error occurred during login',
    });
  }
};

/**
 * @desc    Log user out / clear cookie
 * @route   POST /api/auth/logout
 * @access  Public
 */
export const logout = async (req, res) => {
  try {
    res.cookie('token', 'none', {
      httpOnly: true,
      expires: new Date(Date.now() + 5 * 1000), // expires in 5 seconds
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error occurred during logout',
    });
  }
};

/**
 * @desc    Get currently logged in user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      user: req.user,
    });
  } catch (error) {
    console.error('Profile fetch error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Server error retrieving user profile',
    });
  }
};
