import React, { useState, useEffect } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { supabase } from './SupabaseClient';
import Header from './Header';
import Sidebar from './Sidebar';
import './Layout.css';

const Layout = () => {
  const [userEmail, setUserEmail] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getSession();
      
      // If no session, redirect to login
      if (!data.session) {
        navigate('/login');
        return;
      }
      
      setUserEmail(data.session.user.email);
    };
    
    getUser();
  }, [navigate]);

  return (
    <div className="app-container">
      <Header userEmail={userEmail} />
      <Sidebar />
      <main className="app-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;