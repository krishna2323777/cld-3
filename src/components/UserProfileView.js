import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import { getUserProfile } from '../utils/userDataService';
import { Link } from 'react-router-dom';
import './UserProfile.css';

const UserProfileView = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        // Get the current authenticated user
        const { data } = await supabase.auth.getSession();
        if (data && data.session) {
          const userId = data.session.user.id;
          
          // Get the user profile
          const response = await getUserProfile(userId);
          if (response.success) {
            setProfile(response.data);
          } else {
            setError(response.error);
          }
        } else {
          setError('No authenticated user found');
        }
      } catch (err) {
        setError('Error loading profile: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, []);

  if (loading) {
    return (
      <div className="loading">Loading profile...</div>
    );
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <p>
          <Link to="/profile/edit" className="button">
            Set up your profile
          </Link>
        </p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="no-profile">
        <p>You haven't set up your profile yet.</p>
        <Link to="/profile/edit" className="button">
          Set up your profile
        </Link>
      </div>
    );
  }

  return (
    <div className="user-profile-view">
      <h2>Your Profile</h2>
      
      <div className="profile-card">
        <div className="profile-section">
          <h3>Personal Information</h3>
          <p><strong>Name:</strong> {profile.name}</p>
          <p><strong>Email:</strong> {profile.email}</p>
          <p><strong>Phone:</strong> {profile.phone}</p>
        </div>
        
        <div className="profile-section">
          <h3>Company Information</h3>
          <p><strong>Company Name:</strong> {profile.company_name}</p>
          <p><strong>Address:</strong> {profile.address}</p>
        </div>
        
        <div className="profile-actions">
          <Link to="/profile/edit" className="button">
            Edit Profile
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UserProfileView; 