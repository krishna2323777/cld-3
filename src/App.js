import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import KYCDocuments from './components/KYCDocuments';
import FinancialDocuments from './components/FinancialDocuments';
import UserProfileForm from './components/UserProfileForm';
import UserProfileView from './components/UserProfileView';
import Layout from './components/Layout';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Layout wraps all authenticated routes */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/documents/kyc" element={<KYCDocuments />} />
          <Route path="/documents/financial" element={<FinancialDocuments />} />
          
          {/* User profile routes */}
          <Route path="/profile" element={<UserProfileView />} />
          <Route path="/profile/edit" element={<UserProfileForm />} />
        </Route>

        <Route path="/" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;