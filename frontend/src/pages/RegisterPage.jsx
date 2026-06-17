import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bot, User, Mail, Lock, Globe, ArrowRight, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [preferredLanguage, setPreferredLanguage] = useState('en-US');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { register, user, error, setError } = useAuth();
  const navigate = useNavigate();

  // Clear errors on load
  useEffect(() => {
    setError(null);
    setLocalError('');
  }, [setError]);

  // Redirect if logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!name || !email || !password || !preferredLanguage) {
      setLocalError('Please fill in all fields');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    setSubmitting(true);
    const result = await register(name, email, password, preferredLanguage);
    setSubmitting(false);

    if (result && result.success) {
      navigate('/');
    }
  };

  return (
    <div className="auth-page-container">
      <div className="auth-card">
        <div className="auth-logo-section">
          <div className="auth-logo-glow">
            <Bot size={40} />
          </div>
          <h1>Create Account</h1>
          <p className="auth-subtitle">Join AgroGuide Multilingual Farmer Assistant</p>
        </div>

        {(localError || error) && (
          <div className="auth-error-banner">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-input-group">
            <label htmlFor="name">Full Name</label>
            <div className="auth-input-wrapper">
              <User className="auth-input-icon" size={18} />
              <input
                type="text"
                id="name"
                placeholder="Varshitha Chennamsetti"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="email">Email Address</label>
            <div className="auth-input-wrapper">
              <Mail className="auth-input-icon" size={18} />
              <input
                type="email"
                id="email"
                placeholder="farmer@agroguide.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">Password</label>
            <div className="auth-input-wrapper">
              <Lock className="auth-input-icon" size={18} />
              <input
                type="password"
                id="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label htmlFor="language">Preferred Language</label>
            <div className="auth-input-wrapper">
              <Globe className="auth-input-icon" size={18} />
              <select
                id="language"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                disabled={submitting}
                className="auth-select"
                required
              >
                <option value="en-US">English</option>
                <option value="te-IN">తెలుగు (Telugu)</option>
                <option value="hi-IN">हिन्दी (Hindi)</option>
                <option value="ta-IN">தமிழ் (Tamil)</option>
                <option value="kn-IN">ಕನ್ನಡ (Kannada)</option>
                <option value="ml-IN">മലയാളം (Malayalam)</option>
                <option value="mr-IN">मराठी (Marathi)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            <span>{submitting ? 'Registering...' : 'Sign Up'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account? </span>
          <Link to="/login" className="auth-link">
            Log In
          </Link>
        </div>
      </div>
    </div>
  );
}
