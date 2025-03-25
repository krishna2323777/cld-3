import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import { createOrUpdateUserProfile, getUserProfile } from '../utils/userDataService';
import './UserProfile.css';

const UserProfileForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    companyName: '',
    address: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [userId, setUserId] = useState(null);

  // Fetch current user data
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        // Get the current authenticated user
        const { data } = await supabase.auth.getSession();
        if (data && data.session) {
          const currentUserId = data.session.user.id;
          setUserId(currentUserId);
          
          // Get the user profile from database
          const response = await getUserProfile(currentUserId);
          if (response.success && response.data) {
            // Convert DB field names to form field names
            setFormData({
              name: response.data.name || '',
              companyName: response.data.company_name || '',
              address: response.data.address || '',
              email: response.data.email || '',
              phone: response.data.phone || '',
            });
          }
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        setMessage({
          text: 'Failed to load profile: ' + error.message,
          type: 'error'
        });
      }
    };

    loadUserProfile();
  }, []);

  // Handle form input changes
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (!userId) {
        throw new Error('No user is logged in');
      }

      // Save the profile data
      const result = await createOrUpdateUserProfile({
        id: userId,
        ...formData
      });

      if (result.success) {
        setMessage({
          text: 'Profile saved successfully!',
          type: 'success'
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({
        text: 'Failed to save profile: ' + error.message,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="user-profile-form">
      <h2>Your Profile</h2>
      
      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="name">Full Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="companyName">Company Name</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone Number</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            required
          />
        </div>
        
        <button 
          type="submit" 
          className="submit-btn" 
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default UserProfileForm; 