import React, { useState } from 'react';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import './GenerateForms.css';

const GenerateForms = ({ userEmail }) => {
  const [formType, setFormType] = useState('');
  const [formData, setFormData] = useState({});
  const [generatedForm, setGeneratedForm] = useState(null);

  const handleFormTypeSelect = (type) => {
    setFormType(type);
    setFormData({});
    setGeneratedForm(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Here you would typically send the form data to your backend
    // For now, we'll just set the generated form
    setGeneratedForm({
      type: formType,
      data: formData
    });
  };

  return (
    <div className="app-container">
      <Header userEmail={userEmail} />
      <Sidebar />
      <div className="main-content">
        <div className="generate-forms">
          <h1>Generate Forms</h1>
          
          <p>coming soon..</p>

       </div>
      </div>
    </div>
  );
};

export default GenerateForms; 