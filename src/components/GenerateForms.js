import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import './GenerateForms.css';

const GenerateForms = () => {
  const [formData, setFormData] = useState({
    // Company Information
    companyName: '',
    registrationNumber: '',
    yearOfIncorporation: '',
    taxId: '',
    companyEmail: '',
    companyPhone: '',
    location: '',
    address: '',
    // Management and Leadership
    founder: {
      name: '',
      bio: ''
    },
    ceo: {
      name: '',
      bio: ''
    },
    directors: [{ name: '', position: '', bio: '' }],
    // Financial Information
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
          yearOfIncorporation: data.year_of_incorporation || '',
          taxId: data.tax_id || '',
          companyEmail: data.company_email || '',
          companyPhone: data.company_phone || '',
          location: data.location || '',
          address: data.address || '',
          founder: data.founder || { name: '', bio: '' },
          ceo: data.ceo || { name: '', bio: '' },
          directors: data.directors || [{ name: '', position: '', bio: '' }],
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

  const handleNestedInputChange = (category, field, value) => {
    setFormData(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: value
      }
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
      directors: [...prev.directors, { name: '', position: '', bio: '' }]
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
            year_of_incorporation: formData.yearOfIncorporation,
            tax_id: formData.taxId,
            company_email: formData.companyEmail,
            company_phone: formData.companyPhone,
            location: formData.location,
            address: formData.address,
            founder: formData.founder,
            ceo: formData.ceo,
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
        <h2 className="form-section-title">Company Information</h2>
        
        <div className="form-group">
          <label htmlFor="companyName">Company Name</label>
          <input
            type="text"
            id="companyName"
            name="companyName"
            value={formData.companyName}
            onChange={handleInputChange}
           
            placeholder="Enter company name"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="registrationNumber">Registration Number</label>
            <input
              type="text"
              id="registrationNumber"
              name="registrationNumber"
              value={formData.registrationNumber}
              onChange={handleInputChange}
              
              placeholder="Enter registration number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="yearOfIncorporation">Year of Incorporation</label>
            <input
              type="number"
              id="yearOfIncorporation"
              name="yearOfIncorporation"
              value={formData.yearOfIncorporation}
              onChange={handleInputChange}
            
              placeholder="YYYY"
              min="1900"
              max={new Date().getFullYear()}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="taxId">Tax ID / VAT Number</label>
          <input
            type="text"
            id="taxId"
            name="taxId"
            value={formData.taxId}
            onChange={handleInputChange}
           
            placeholder="Enter tax identification number"
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="companyEmail">Company Email</label>
            <input
              type="email"
              id="companyEmail"
              name="companyEmail"
              value={formData.companyEmail}
              onChange={handleInputChange}
              
              placeholder="Enter company email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="companyPhone">Company Phone</label>
            <input
              type="tel"
              id="companyPhone"
              name="companyPhone"
              value={formData.companyPhone}
              onChange={handleInputChange}
             
              placeholder="Enter company phone"
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="location">Location</label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
          
            placeholder="City, Country"
          />
        </div>

        <div className="form-group">
          <label htmlFor="address">Full Address</label>
          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleInputChange}
            
            placeholder="Enter company full address"
            rows="3"
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
            
          />
        </div>

        <div className="form-group">
          <label htmlFor="shareCapital">Share Capital</label>
          <input
            type="number"
            id="shareCapital"
            name="shareCapital"
            value={formData.shareCapital}
            onChange={handleInputChange}
            
            placeholder="Enter share capital"
            min="0"
            step="0.01"
          />
        </div>

        <h2 className="form-section-title">Management and Leadership</h2>
        
        <div className="management-section">
          <h3>Founder</h3>
          <div className="form-group">
            <label htmlFor="founderName">Name</label>
            <input
              type="text"
              id="founderName"
              value={formData.founder.name}
              onChange={(e) => handleNestedInputChange('founder', 'name', e.target.value)}
              placeholder="Enter founder's name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="founderBio">Bio</label>
            <textarea
              id="founderBio"
              value={formData.founder.bio}
              onChange={(e) => handleNestedInputChange('founder', 'bio', e.target.value)}
              placeholder="Enter founder's bio/background"
              rows="3"
            />
          </div>
        </div>

        <div className="management-section">
          <h3>CEO</h3>
          <div className="form-group">
            <label htmlFor="ceoName">Name</label>
            <input
              type="text"
              id="ceoName"
              value={formData.ceo.name}
              onChange={(e) => handleNestedInputChange('ceo', 'name', e.target.value)}
              placeholder="Enter CEO's name"
            />
          </div>
          <div className="form-group">
            <label htmlFor="ceoBio">Bio</label>
            <textarea
              id="ceoBio"
              value={formData.ceo.bio}
              onChange={(e) => handleNestedInputChange('ceo', 'bio', e.target.value)}
              placeholder="Enter CEO's bio/background"
              rows="3"
            />
          </div>
        </div>

        <div className="form-group directors-section">
          <div className="directors-header">
            <h3>Directors</h3>
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
                    
                  />
                </div>
                <div className="form-group">
                  <input
                    type="text"
                    value={director.position}
                    onChange={(e) => handleDirectorChange(index, 'position', e.target.value)}
                    placeholder="Position"
                   
                  />
                </div>
                <div className="form-group">
                  <textarea
                    value={director.bio || ''}
                    onChange={(e) => handleDirectorChange(index, 'bio', e.target.value)}
                    placeholder="Director Bio"
                    rows="2"
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
