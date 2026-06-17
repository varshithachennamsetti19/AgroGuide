import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Bot, Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { login, user, error, setError } = useAuth();
  const navigate = useNavigate();

  // Clear auth error when page is loaded/changed
  useEffect(() => {
    setError(null);
    setLocalError('');
  }, [setError]);

  // If user is already logged in, redirect to home
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    const result = await login(email, password);
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
          <h1>AgroGuide Login</h1>
          <p className="auth-subtitle">AI-Powered Multilingual Farmer Assistant</p>
        </div>

        {(localError || error) && (
          <div className="auth-error-banner">
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{localError || error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                required
              />
            </div>
          </div>

          <button type="submit" className="auth-submit-btn" disabled={submitting}>
            <span>{submitting ? 'Authenticating...' : 'Sign In'}</span>
            <ArrowRight size={18} />
          </button>
        </form>

        <div className="auth-footer">
          <span>New to AgroGuide? </span>
          <Link to="/register" className="auth-link">
            Create an Account
          </Link>
        </div>
      </div>
    </div>
  );
}
