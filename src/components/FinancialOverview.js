import React, { useState, useEffect } from "react";
import { supabase } from "./SupabaseClient";
import "./Documents.css";

const FinancialOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reports, setReports] = useState([]);
  const [selectedYear, setSelectedYear] = useState('all');
  const [selectedDocType, setSelectedDocType] = useState('all');
  const [years, setYears] = useState(['2023', '2024', '2025']);
  const [userId, setUserId] = useState(null);

  // Document types
  const documentTypes = [
    { id: 'all', name: 'All Documents', icon: '📁' },
    { id: 'Balance Sheet', name: 'Balance Sheet', icon: '📊' },
    { id: 'Trial Balance', name: 'Trial Balance', icon: '📝' },
    { id: 'Profit & Loss Statement', name: 'Profit & Loss Statement', icon: '💰' },
    { id: 'Financial Statement', name: 'Financial Statement', icon: '📑' }
  ];

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchReports();
    }
  }, [userId, selectedYear, selectedDocType]);

  const getCurrentUser = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session) throw new Error('Not authenticated');
      setUserId(data.session.user.id);
    } catch (error) {
      console.error('Error getting current user:', error);
      setError('Failed to authenticate user');
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, let's get all records to check if any exist
      const { data: allRecords, error: allRecordsError } = await supabase
        .from('table_reports')
        .select('*');
      
      if (allRecordsError) {
        // Handle error silently
      }

      // Query the table_reports table for reports belonging to the user
      // Try without the category filter first to see if that's the issue
      let query = supabase
        .from('table_reports')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      // Apply filters if set
      if (selectedYear !== 'all') {
        query = query.eq('year', selectedYear);
      }

      if (selectedDocType !== 'all') {
        query = query.eq('doc_type', selectedDocType);
      }

      const { data: documents, error: documentsError } = await query;
      
      if (documentsError) {
        throw documentsError;
      }

      // Get signed URLs for each document
      const docsWithUrls = await Promise.all(
        documents.map(async (doc) => {
          if (doc.file_path) {
            try {
              // Check if the file exists in storage
              const filePathParts = doc.file_path.split('/');
              const fileName = filePathParts.pop();
              const folderPath = filePathParts.join('/');

              // Try both 'reports' and 'report' buckets
              let fileExists = null;
              let fileCheckError = null;
              let bucket = 'reports';

              // First try 'reports' bucket
              const reportsCheck = await supabase
                .storage
                .from('reports')
                .list(folderPath, {
                  limit: 100,
                  search: fileName
                });
              
              fileExists = reportsCheck.data;
              fileCheckError = reportsCheck.error;

              // If not found, try 'report' bucket instead
              if (fileCheckError || !fileExists || fileExists.length === 0) {
                const reportCheck = await supabase
                  .storage
                  .from('report')
                  .list(folderPath, {
                    limit: 100,
                    search: fileName
                  });
                
                fileExists = reportCheck.data;
                fileCheckError = reportCheck.error;
                if (!fileCheckError && fileExists && fileExists.length > 0) {
                  bucket = 'report';
                }
              }

              // If file doesn't exist or there's an error, skip URL generation
              if (fileCheckError || !fileExists || fileExists.length === 0) {
                return {
                  ...doc,
                  signed_url: null
                };
              }

              // Get signed URL from the correct bucket
              const { data: urlData, error: urlError } = await supabase
                .storage
                .from(bucket)
                .createSignedUrl(doc.file_path, 3600);

              return {
                ...doc,
                signed_url: urlData?.signedUrl || null
              };
            } catch (error) {
              return {
                ...doc,
                signed_url: null
              };
            }
          }
          return {
            ...doc,
            signed_url: null
          };
        })
      );

      setReports(docsWithUrls);
    } catch (error) {
      setError('Failed to fetch your reports: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getDocTypeIcon = (docType) => {
    const type = documentTypes.find(t => t.name === docType);
    return type ? type.icon : '📄';
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h2>Financial Overview</h2>
      </div>

      <div className="filters-section">
        <div className="year-selector">
          <div className="year-selector-label">Year:</div>
          <div className="year-dropdown">
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="year-select"
            >
              <option value="all">All Years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="category-selector">
          <div className="category-selector-label">Document Type:</div>
          <div className="category-buttons">
            {documentTypes.map((docType) => (
              <button
                key={docType.id}
                className={`category-button ${selectedDocType === docType.id ? 'active' : ''}`}
                onClick={() => setSelectedDocType(docType.id)}
              >
                <span className="category-icon">{docType.icon}</span>
                {docType.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your financial reports...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <div className="error-icon">⚠️</div>
          <p>{error}</p>
        </div>
      ) : reports.length === 0 ? (
        <div className="no-documents">
          <p>No financial reports found matching your criteria.</p>
        </div>
      ) : (
        <div className="reports-table-container">
          <table className="reports-table">
            <thead>
              <tr>
                <th>Document Type</th>
                <th>Description</th>
                <th>Year</th>
                <th>File Name</th>
                <th>Uploaded On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id}>
                  <td>
                    <div className="doc-type">
                      <span className="doc-icon">{getDocTypeIcon(report.doc_type)}</span>
                      <span>{report.doc_type}</span>
                    </div>
                  </td>
                  <td>{report.description || 'No description provided'}</td>
                  <td>
                    <span className="year-badge">{report.year}</span>
                  </td>
                  <td>{report.file_name}</td>
                  <td>{new Date(report.created_at).toLocaleDateString()}</td>
                  <td>
                    <div className="action-buttons">
                      {report.signed_url ? (
                        <a
                          href={report.signed_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="action-button view-button"
                        >
                          View
                        </a>
                      ) : (
                        <button
                          className="action-button view-button disabled"
                          disabled
                          title="File not available for viewing"
                        >
                          Unavailable
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FinancialOverview; 
