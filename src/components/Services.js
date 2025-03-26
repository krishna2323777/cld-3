import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Services.css';

const Services = ({ userEmail }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [services] = useState([
  
  ]);

  const filteredServices = activeTab === 'all' 
    ? services 
    : services.filter(service => service.status === activeTab);

  return (
    <div className="app-container">
      <Header userEmail={userEmail} />
      <Sidebar />
      <div className="main-content">
        <div className="services-container">
          <h1>Services</h1>
          
        

          
        </div>
      </div>
    </div>
  );
};

export default Services; 
