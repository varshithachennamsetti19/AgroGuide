import React, { useState } from 'react';
import { Bot, MapPin, Sprout, Tractor, User, HelpCircle, Loader2 } from 'lucide-react';
import { createFarm } from '../services/api';

export default function ProfileWizard({ onComplete, updateLocation }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    state: '',
    district: '',
    village: '',
    primaryCrop: 'Rice',
    plantingDate: '',
    farmSize: '',
    farmSizeUnit: 'Acres',
    soilType: 'Loamy',
    waterSource: 'Borewell',
    irrigationMethod: 'Drip',
    farmingType: 'Traditional',
    experienceYears: '',
    preferredLanguage: 'en-US'
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Simple validations
    if (!formData.fullName.trim()) {
      setError('Please provide your full name');
      return;
    }
    if (!formData.state.trim() || !formData.district.trim() || !formData.village.trim()) {
      setError('Please fill in state, district, and village information');
      return;
    }
    if (!formData.plantingDate) {
      setError('Please select a planting date');
      return;
    }
    if (!formData.farmSize || isNaN(formData.farmSize)) {
      setError('Please enter a valid farm size (number)');
      return;
    }

    setIsLoading(true);

    try {
      // 1. Update the User profile using the Context location updater
      const userRes = await updateLocation({
        fullName: formData.fullName,
        phone: formData.phone,
        state: formData.state,
        district: formData.district,
        village: formData.village,
        primaryCrop: formData.primaryCrop,
        plantingDate: new Date(formData.plantingDate),
        farmSize: parseFloat(formData.farmSize),
        farmSizeUnit: formData.farmSizeUnit,
        soilType: formData.soilType,
        waterSource: formData.waterSource,
        irrigationMethod: formData.irrigationMethod,
        farmingType: formData.farmingType,
        experienceYears: parseInt(formData.experienceYears) || 0,
        preferredLanguage: formData.preferredLanguage,
        isProfileCompleted: true
      });

      if (!userRes.success) {
        throw new Error(userRes.error || 'Failed to save profile');
      }

      // 2. Automatically create the primary farm record in the DB
      await createFarm({
        farmName: `${formData.primaryCrop} Primary Farm`,
        location: `${formData.village}, ${formData.district}`,
        soilType: formData.soilType,
        crop: formData.primaryCrop,
        cropStage: 'Vegetative Stage',
        area: parseFloat(formData.farmSize),
        areaUnit: formData.farmSizeUnit,
        waterSource: formData.waterSource,
        plantingDate: new Date(formData.plantingDate)
      });

      // 3. Callback to close wizard and render dashboard
      onComplete();

    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while saving your profile.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="auth-page-container" style={{ padding: '24px', overflowY: 'auto' }}>
      <div className="auth-card" style={{ maxWidth: '650px', width: '100%', padding: '32px', margin: '40px auto' }}>
        <div className="auth-logo-section">
          <div className="auth-logo-glow" style={{ width: '60px', height: '60px' }}>
            <Bot size={32} style={{ color: 'var(--accent-cyan)' }} />
          </div>
          <h1>Farmer Profile Setup</h1>
          <p className="auth-subtitle">Configure AgroGuide to personalize your AI advisory feed</p>
        </div>

        {error && (
          <div className="auth-error-banner" style={{ marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          
          {/* Personal Information */}
          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginTop: '8px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '1rem' }}>
              <User size={16} />
              <span>Personal Details</span>
            </h3>
          </div>

          <div className="auth-input-group">
            <label htmlFor="fullName">Full Name *</label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="e.g. Varshitha Chennamsetti"
              required
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="phone">Phone Number</label>
            <input
              type="text"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="e.g. +91 9876543210"
            />
          </div>

          <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="preferredLanguage">Preferred Assistant Language</label>
            <select
              id="preferredLanguage"
              name="preferredLanguage"
              value={formData.preferredLanguage}
              onChange={handleChange}
              className="auth-select"
            >
              <option value="en-US">English</option>
              <option value="te-IN">తెలుగు (Telugu)</option>
              <option value="hi-IN">हिन्दी (Hindi)</option>
            </select>
          </div>

          {/* Location details */}
          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginTop: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '1rem' }}>
              <MapPin size={16} />
              <span>Farm Location</span>
            </h3>
          </div>

          <div className="auth-input-group">
            <label htmlFor="state">State *</label>
            <input
              type="text"
              id="state"
              name="state"
              value={formData.state}
              onChange={handleChange}
              placeholder="e.g. Andhra Pradesh"
              required
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="district">District *</label>
            <input
              type="text"
              id="district"
              name="district"
              value={formData.district}
              onChange={handleChange}
              placeholder="e.g. Guntur"
              required
            />
          </div>

          <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="village">Village *</label>
            <input
              type="text"
              id="village"
              name="village"
              value={formData.village}
              onChange={handleChange}
              placeholder="e.g. Tadikonda"
              required
            />
          </div>

          {/* Farm Details */}
          <div style={{ gridColumn: 'span 2', borderBottom: '1px solid var(--border-light)', paddingBottom: '8px', marginTop: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-cyan)', fontSize: '1rem' }}>
              <Sprout size={16} />
              <span>Crop & Farm Specifications</span>
            </h3>
          </div>

          <div className="auth-input-group">
            <label htmlFor="primaryCrop">Primary Crop *</label>
            <select
              id="primaryCrop"
              name="primaryCrop"
              value={formData.primaryCrop}
              onChange={handleChange}
              className="auth-select"
            >
              <option value="Rice">Rice (వరి)</option>
              <option value="Cotton">Cotton (ప్రత్తి)</option>
              <option value="Maize">Maize (మొక్కజొన్న)</option>
              <option value="Tomato">Tomato (టమోటా)</option>
              <option value="Groundnut">Groundnut (వేరుశనగ)</option>
              <option value="Sugarcane">Sugarcane (చెరకు)</option>
            </select>
          </div>

          <div className="auth-input-group">
            <label htmlFor="plantingDate">Planting Date *</label>
            <input
              type="date"
              id="plantingDate"
              name="plantingDate"
              value={formData.plantingDate}
              onChange={handleChange}
              required
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="farmSize">Farm Size *</label>
            <input
              type="number"
              step="0.1"
              id="farmSize"
              name="farmSize"
              value={formData.farmSize}
              onChange={handleChange}
              placeholder="e.g. 5.5"
              required
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="farmSizeUnit">Unit</label>
            <select
              id="farmSizeUnit"
              name="farmSizeUnit"
              value={formData.farmSizeUnit}
              onChange={handleChange}
              className="auth-select"
            >
              <option value="Acres">Acres</option>
              <option value="Hectares">Hectares</option>
              <option value="Guntas">Guntas</option>
              <option value="Bighas">Bighas</option>
            </select>
          </div>

          <div className="auth-input-group">
            <label htmlFor="soilType">Soil Type</label>
            <select
              id="soilType"
              name="soilType"
              value={formData.soilType}
              onChange={handleChange}
              className="auth-select"
            >
              <option value="Loamy">Loamy Soil</option>
              <option value="Clay">Clayey Soil</option>
              <option value="Sandy">Sandy Soil</option>
              <option value="Black">Black Cotton Soil</option>
              <option value="Red">Red Soil</option>
            </select>
          </div>

          <div className="auth-input-group">
            <label htmlFor="waterSource">Water Source</label>
            <select
              id="waterSource"
              name="waterSource"
              value={formData.waterSource}
              onChange={handleChange}
              className="auth-select"
            >
              <option value="Borewell">Borewell</option>
              <option value="Canal">Canal Irrigation</option>
              <option value="Rainfed">Rainfed Only</option>
              <option value="River">River Pump</option>
            </select>
          </div>

          <div className="auth-input-group">
            <label htmlFor="irrigationMethod">Irrigation Method</label>
            <select
              id="irrigationMethod"
              name="irrigationMethod"
              value={formData.irrigationMethod}
              onChange={handleChange}
              className="auth-select"
            >
              <option value="Drip">Drip Irrigation</option>
              <option value="Sprinkler">Sprinkler Irrigation</option>
              <option value="Flood">Flood/Basin Irrigation</option>
            </select>
          </div>

          <div className="auth-input-group">
            <label htmlFor="farmingType">Farming Type</label>
            <select
              id="farmingType"
              name="farmingType"
              value={formData.farmingType}
              onChange={handleChange}
              className="auth-select"
            >
              <option value="Traditional">Traditional</option>
              <option value="Organic">Organic Farming</option>
              <option value="Natural">ZBNF / Natural</option>
              <option value="Commercial">Commercial/Modern</option>
            </select>
          </div>

          <div className="auth-input-group" style={{ gridColumn: 'span 2' }}>
            <label htmlFor="experienceYears">Farming Experience (Years)</label>
            <input
              type="number"
              id="experienceYears"
              name="experienceYears"
              value={formData.experienceYears}
              onChange={handleChange}
              placeholder="e.g. 15"
            />
          </div>

          <div style={{ gridColumn: 'span 2', marginTop: '16px' }}>
            <button
              type="submit"
              className="auth-submit-btn"
              disabled={isLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px'
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="spinner" size={18} />
                  <span>Configuring Profile Details...</span>
                </>
              ) : (
                <>
                  <Tractor size={18} />
                  <span>Start Assistant</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
