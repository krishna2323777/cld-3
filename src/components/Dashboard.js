import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import { Link } from 'react-router-dom';
import './Dashboard.css';

// Initialize Supabase client

const Dashboard = () => {
  const [financialData, setFinancialData] = useState(null); // Set to null initially
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    fetchFinancialData();
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) return;

      const userId = sessionData.session.user.id;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
        return;
      }

      setUserProfile(data || null);
    } catch (error) {
      console.error('Error in fetchUserProfile:', error);
    }
  };

  const fetchFinancialData = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;

      if (!sessionData.session) {
        console.error('No user logged in');
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;
      console.log('User ID:', userId);
      console.log('Access Token:', sessionData.session.access_token);

      const { data, error } = await supabase
        .from('financial_data')
        .select('cash_balance, revenue, expenses, net_burn')
        .eq('client_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching financial data:', JSON.stringify(error, null, 2));
        throw error;
      }

      setFinancialData(data || null); // Set to null if no data exists
    } catch (error) {
      console.error('Error in fetchFinancialData:', JSON.stringify(error, null, 2));
    } finally {
      setLoading(false);
    }
  };

  const formatEuro = (amount) => {
    return new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(amount);
  };

  if (loading)
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );

  return (
    <div className="dashboard-container">
      <h1>Financial Dashboard</h1>

      {/* Profile Status Section */}
      <div className="profile-status">
        {userProfile ? (
          <div className="profile-summary">
            <h3>Welcome, {userProfile.name} from HOCEbranch.AI</h3>
            <Link to="/profile" className="profile-link">View Profile</Link>
          </div>
        ) : (
          <div className="profile-setup-reminder">
            <p>Please complete your profile information to enhance your experience.</p>
            <Link to="/profile/edit" className="profile-link">Complete Profile</Link>
          </div>
        )}
      </div>

      {financialData ? (
        <div className="financial-summary">
          <div className="financial-card cash-balance">
            <div className="card-icon">💶</div>
            <div className="card-content">
              <h3>Cash Balance</h3>
              <p className="card-value">{formatEuro(financialData.cash_balance)}</p>
              <p className="card-change positive">+2.3% from last month</p>
            </div>
          </div>
          <div className="financial-card revenue">
            <div className="card-icon">📈</div>
            <div className="card-content">
              <h3>Revenue</h3>
              <p className="card-value">{formatEuro(financialData.revenue)}</p>
            </div>
          </div>
          <div className="financial-card expenses">
            <div className="card-icon">📉</div>
            <div className="card-content">
              <h3>Expenses</h3>
              <p className="card-value">{formatEuro(financialData.expenses)}</p>
            </div>
          </div>
          <div className="financial-card net-burn">
            <div className="card-icon">🔥</div>
            <div className="card-content">
              <h3>Net Burn</h3>
              <p className="card-value">{formatEuro(financialData.net_burn)}</p>
              <p className="card-change positive">+6.4% from last month</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data-message">
          <p>No financial data available.</p>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
