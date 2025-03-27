import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import './GenerateForms.css';

const GenerateForms = () => {
  const [formData, setFormData] = useState({
    companyName: '',
    registrationNumber: '',
    address: '',
    directors: [{ name: '', position: '' }],
    shareCapital: '',
    dateOfIncorporation: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchCompanyDetails();
  }, []);

  const fetchCompanyDetails = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('No user session found');
      }

      const { data, error } = await supabase
        .from('company_details')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setFormData({
          companyName: data.company_name || '',
          registrationNumber: data.registration_number || '',
          address: data.address || '',
          directors: data.directors || [{ name: '', position: '' }],
          shareCapital: data.share_capital || '',
          dateOfIncorporation: data.date_of_incorporation || ''
        });
      }
    } catch (error) {
      console.error('Error fetching company details:', error);
      setMessage('Error loading company details. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleDirectorChange = (index, field, value) => {
    const newDirectors = [...formData.directors];
    newDirectors[index] = {
      ...newDirectors[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      directors: newDirectors
    }));
  };

  const addDirector = () => {
    setFormData(prev => ({
      ...prev,
      directors: [...prev.directors, { name: '', position: '' }]
    }));
  };

  const removeDirector = (index) => {
    setFormData(prev => ({
      ...prev,
      directors: prev.directors.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('No user session found');
      }

      const { data, error } = await supabase
        .from('company_details')
        .upsert(
          {
            user_id: sessionData.session.user.id,
            company_name: formData.companyName,
            registration_number: formData.registrationNumber,
            address: formData.address,
            directors: formData.directors,
            share_capital: parseFloat(formData.shareCapital),
            date_of_incorporation: formData.dateOfIncorporation,
            updated_at: new Date().toISOString()
          },
          {
            onConflict: 'user_id',
            returning: true
          }
        )
        .select();

      if (error) throw error;

      setMessage('Company details updated successfully!');
    } catch (error) {
      console.error('Error saving company details:', error);
      setMessage('Error saving company details. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading company details...</p>
      </div>
    );
  }

  return (
    <div className="generate-forms">
      <h1>Company Details Form</h1>
      
      <form onSubmit={handleSubmit} className="company-form">
        <div className="form-group">
          <label htmlFor="companyName">Company Name</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
            required
            placeholder="Enter company name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="registrationNumber">Registration Number</label>
          <input
            type="text"
            id="registrationNumber"
            name="registrationNumber"
            value={formData.registrationNumber}
            onChange={handleInputChange}
            required
            placeholder="Enter registration number"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            required
            placeholder="Enter company address"
            rows="3"
          />
        </div>

        <div className="form-group directors-section">
          <div className="directors-header">
            <label>Directors</label>
            <button 
              type="button" 
              className="add-director-btn"
              onClick={addDirector}
            >
              + Add Director
            </button>
          </div>
          
          {formData.directors.map((director, index) => (
            <div key={index} className="director-entry">
              <div className="director-inputs">
                <div className="form-group">
                  <input
                    type="text"
                    value={director.name}
                    onChange={(e) => handleDirectorChange(index, 'name', e.target.value)}
                    placeholder="Director Name"
                    required
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    value={director.position}
                    onChange={(e) => handleDirectorChange(index, 'position', e.target.value)}
                    placeholder="Position"
                    required
                  />
                </div>
              </div>
              {formData.directors.length > 1 && (
                <button
                  type="button"
                  className="remove-director-btn"
                  onClick={() => removeDirector(index)}
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="form-group">
          <label htmlFor="shareCapital">Share Capital</label>
          <input
            type="number"
            id="shareCapital"
            name="shareCapital"
            value={formData.shareCapital}
            onChange={handleInputChange}
            required
            placeholder="Enter share capital"
            min="0"
            step="0.01"
          />
        </div>

        <div className="form-group">
          <label htmlFor="dateOfIncorporation">Date of Incorporation</label>
          <input
            type="date"
            id="dateOfIncorporation"
            name="dateOfIncorporation"
            value={formData.dateOfIncorporation}
            onChange={handleInputChange}
            required
          />
        </div>

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Saving...' : 'Update Company Details'}
        </button>

        {message && (
          <div className={`message ${message.includes('Error') ? 'error' : 'success'}`}>
            {message}
          </div>
        )}
      </form>
    </div>
  );
};

export default GenerateForms; 
