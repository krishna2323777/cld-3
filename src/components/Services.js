import React, { useState } from 'react';
import Header from './Header';
import Sidebar from './Sidebar';
import './Services.css';

const Services = ({ userEmail }) => {
  const [activeTab, setActiveTab] = useState('all');
  const [services] = useState([
    {
      id: 1,
      name: 'Document Processing',
      description: 'Automated document processing and verification services',
      status: 'active',
      price: '$99/month',
      icon: '📄'
    },
    {
      id: 2,
      name: 'Financial Analysis',
      description: 'Comprehensive financial analysis and reporting tools',
      status: 'active',
      price: '$149/month',
      icon: '💰'
    },
    {
      id: 3,
      name: 'KYC Verification',
      description: 'Know Your Customer verification and compliance services',
      status: 'active',
      price: '$199/month',
      icon: '✅'
    },
    {
      id: 4,
      name: 'Invoice Management',
      description: 'Automated invoice processing and management system',
      status: 'inactive',
      price: '$79/month',
      icon: '📋'
    },
    {
      id: 5,
      name: 'Contract Generation',
      description: 'AI-powered contract generation and management',
      status: 'active',
      price: '$129/month',
      icon: '📝'
    }
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
          
          <div className="services-header">
            <div className="services-tabs">
              <button 
                className={`tab-btn ${activeTab === 'all' ? 'active' : ''}`}
                onClick={() => setActiveTab('all')}
              >
                All Services
              </button>
              <button 
                className={`tab-btn ${activeTab === 'active' ? 'active' : ''}`}
                onClick={() => setActiveTab('active')}
              >
                Active
              </button>
              <button 
                className={`tab-btn ${activeTab === 'inactive' ? 'active' : ''}`}
                onClick={() => setActiveTab('inactive')}
              >
                Inactive
              </button>
            </div>
            <button className="add-service-btn">
              Add New Service
            </button>
          </div>

          <div className="services-grid">
            {filteredServices.map(service => (
              <div key={service.id} className="service-card">
                <div className="service-icon">{service.icon}</div>
                <div className="service-content">
                  <h3>{service.name}</h3>
                  <p>{service.description}</p>
                  <div className="service-footer">
                    <span className="service-price">{service.price}</span>
                    <span className={`service-status ${service.status}`}>
                      {service.status}
                    </span>
                  </div>
                </div>
                <div className="service-actions">
                  <button className="action-btn edit">Edit</button>
                  <button className="action-btn delete">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Services; 