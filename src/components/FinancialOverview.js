import React from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './FinancialOverview.css';

const FinancialOverview = ({ userEmail }) => {
  return (
    <div className="app-container">
      <Header userEmail={userEmail} />
      <Sidebar />
      <main className="main-content">
        <div className="financial-overview">
          <h1>Financial Overview</h1>
          <p>coming soon..</p>
        </div>
      </main>
    </div>
  );
};

export default FinancialOverview; 