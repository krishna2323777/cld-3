import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import './Documents.css';

const FinancialDocuments = () => {
  const [yearFolders, setYearFolders] = useState(['2023', '2024', '2025']);
  const [selectedYear, setSelectedYear] = useState('2025');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [documentType, setDocumentType] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState(null);
  const [deleteInProgress, setDeleteInProgress] = useState(false);

  // Document categories with their corresponding types
  const documentCategories = {
    'all': {
      name: 'All Documents',
      icon: '📁',
      types: []
    },
    'financial_statements': {
      name: 'Financial Statements',
      icon: '📊',
      types: [
        'Profit & Loss Statement',
        'Balance Sheet',
        'Cash Flow Statement',
        'Audited Financial Report'
      ]
    },
    'tax_compliance': {
      name: 'Tax & Compliance',
      icon: '📋',
      types: [
        'Business Tax Return',
        'GST/VAT Return',
        'Withholding Tax Statement',
        'Tax Clearance Certificate'
      ]
    },
    'banking_investment': {
      name: 'Banking & Investment',
      icon: '🏦',
      types: [
        'Business Bank Statement',
        'Fixed Deposit Certificate',
        'Investment Portfolio',
        'Loan & Credit Agreement'
      ]
    },
    'accounts': {
      name: 'Accounts Payable & Receivable',
      icon: '💰',
      types: [
        'Outstanding Invoice',
        'Payment Record',
        'Accounts Receivable Report',
        'Accounts Payable Report'
      ]
    },
    'valuation': {
      name: 'Company Valuation & Shareholding',
      icon: '📈',
      types: [
        'Shareholder Agreement',
        'Company Valuation Report',
        'Business Ownership Document',
        'Share Certificate'
      ]
    },
    'debt_loan': {
      name: 'Debt & Loan Documentation',
      icon: '📝',
      types: [
        'Loan Agreement',
        'Repayment Schedule',
        'Collateral Documentation',
        'Debt Restructuring Agreement'
      ]
    },
    'other_documents': {
      name: 'Other Documents',
      icon: '📄',
      types: [
        'Contract',
        'Agreement',
        'Certificate',
        'License',
        'Permit',
        'Report',
        'Statement',
        'Other'
      ]
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [selectedYear, selectedCategory]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('No user session found');
      }

      let query = supabase
        .from('financial_documents')
        .select('*')
        .eq('user_id', sessionData.session.user.id)
        .eq('year', selectedYear);

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query.order('upload_date', { ascending: false });

      if (error) throw error;

      // Get signed URLs for documents
      const documentsWithUrls = await Promise.all(
        data.map(async (doc) => {
          if (doc.file_path) {
            const { data: urlData } = await supabase
              .storage
              .from('financial-documents')
              .createSignedUrl(doc.file_path, 3600); // URL valid for 1 hour

            return {
              ...doc,
              signed_url: urlData?.signedUrl
            };
          }
          return doc;
        })
      );

      setDocuments(documentsWithUrls);
    } catch (error) {
      console.error('Error fetching documents:', error);
      setUploadError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (event, docType) => {
    const file = event.target.files[0];
    if (file) {
      if (selectedCategory === 'other_documents' && !documentType.trim()) {
        setUploadError('Please enter a document type before uploading');
        return;
      }
      setFileToUpload(file);
      setDocumentType(selectedCategory === 'other_documents' ? documentType : docType);
      setShowConfirmation(true);
    }
  };

  const handleConfirmedUpload = async () => {
    if (!fileToUpload) return;
    
    if (selectedCategory === 'other_documents' && !documentType.trim()) {
      setUploadError('Please enter a document type before uploading');
      setShowConfirmation(false);
      return;
    }

    try {
      setShowConfirmation(false);
      setUploading(true);
      setUploadError(null);
      setSuccessMessage(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No user session found');
      }

      const userId = sessionData.session.user.id;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const sanitizedFileName = fileToUpload.name.replace(/\s+/g, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `${userId}/${selectedYear}/${documentType}/${fileName}`;

      // Create directory structure if it doesn't exist
      const dirPath = `${userId}/${selectedYear}/${documentType}`;
      const { data: dirExists, error: dirCheckError } = await supabase
        .storage
        .from('financial-documents')
        .list(dirPath);

      if (dirCheckError || !dirExists) {
        await supabase
          .storage
          .from('financial-documents')
          .upload(`${dirPath}/.emptyFolderPlaceholder`, new Blob(['']));
      }

      // Upload the file
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('financial-documents')
        .upload(filePath, fileToUpload, {
          cacheControl: '3600',
          upsert: true,
          contentType: fileToUpload.type
        });

      if (uploadError) throw uploadError;

      // Insert document record into database
      const documentData = {
        user_id: userId,
        doc_type: documentType,
        category: selectedCategory,
        year: selectedYear,
        file_path: filePath,
        file_name: sanitizedFileName,
        file_size: fileToUpload.size,
        content_type: fileToUpload.type
      };

      const { error: dbError } = await supabase
        .from('financial_documents')
        .insert(documentData);

      if (dbError) throw dbError;

      setSuccessMessage('Document uploaded successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadError(error.message);
    } finally {
      setUploading(false);
      setFileToUpload(null);
      setDocumentType('');
      setTimeout(() => {
        setSuccessMessage(null);
        setUploadError(null);
      }, 5000);
    }
  };

  const handleDelete = async (document) => {
    try {
      setDeleteInProgress(true);
      setUploadError(null);

      // Delete from storage
      const { error: storageError } = await supabase
        .storage
        .from('financial-documents')
        .remove([document.file_path]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await supabase
        .from('financial_documents')
        .delete()
        .eq('id', document.id);

      if (dbError) throw dbError;

      setSuccessMessage('Document deleted successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      setUploadError(error.message);
    } finally {
      setDeleteInProgress(false);
      setShowDeleteConfirmation(false);
      setDocumentToDelete(null);
      setTimeout(() => {
        setSuccessMessage(null);
        setUploadError(null);
      }, 5000);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="documents-container">
      <div className="documents-header">
        <h2>Financial Documents</h2>
      </div>

      <div className="year-selector">
        <div className="year-selector-label">Select Year:</div>
        <div className="year-tabs">
          {yearFolders.map((year) => (
            <button
              key={year}
              className={`year-tab ${selectedYear === year ? 'active' : ''}`}
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      <div className="category-selector">
        <div className="category-selector-label">Document Category:</div>
        <div className="category-buttons">
          {Object.entries(documentCategories).map(([key, value]) => (
            <button
              key={key}
              className={`category-button ${selectedCategory === key ? 'active' : ''}`}
              onClick={() => setSelectedCategory(key)}
            >
              <span className="category-icon">{value.icon}</span>
              {value.name}
            </button>
          ))}
        </div>
      </div>

      {selectedCategory !== 'all' && (
        <>
          <div className="document-type-section">
            <div className="document-type-label">Document Type</div>
            {selectedCategory === 'other_documents' ? (
              <div className="document-type-input-container">
                <input
                  type="text"
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value);
                    setUploadError(null); // Clear error when user starts typing
                  }}
                  placeholder="Enter document type"
                  className={`document-type-input ${!documentType.trim() && uploadError ? 'error' : ''}`}
                />
                {uploadError && <div className="input-error-message">{uploadError}</div>}
              </div>
            ) : (
              <select
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                className="document-type-select"
              >
                <option value="">Select Document Type</option>
                {documentCategories[selectedCategory].types.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div 
            className={`upload-section ${(selectedCategory === 'other_documents' && !documentType.trim()) ? 'disabled' : ''}`} 
            onClick={() => {
              if (selectedCategory === 'other_documents' && !documentType.trim()) {
                setUploadError('Please enter a document type before uploading');
                return;
              }
              document.getElementById('file-input').click();
            }}
          >
            <span className="upload-icon">⬆️</span>
            <div className="upload-text">
              Upload Document
              <small>to {selectedYear} folder</small>
            </div>
            <input
              id="file-input"
              type="file"
              onChange={(e) => handleFileSelect(e, documentType)}
              style={{ display: 'none' }}
              disabled={selectedCategory === 'other_documents' && !documentType.trim()}
            />
          </div>
        </>
      )}

      {uploadError && <div className="error-message">{uploadError}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <div className="documents-list">
        {loading ? (
          <div className="loading">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="no-documents">
            No documents found for the selected criteria.
          </div>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="document-item">
              <div className="document-icon">📄</div>
              <div className="document-info">
                <div className="document-name">{doc.file_name}</div>
                <div className="document-tags">
                  <span className="document-tag tag-business">{doc.doc_type}</span>
                  <span className="document-tag tag-tax">{doc.category}</span>
                </div>
              </div>
              <div className="document-size">{formatFileSize(doc.file_size)}</div>
              <div className="document-actions">
                {doc.signed_url && (
                  <a
                    href={doc.signed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-button view-button"
                  >
                    View
                  </a>
                )}
                <button
                  onClick={() => {
                    setDocumentToDelete(doc);
                    setShowDeleteConfirmation(true);
                  }}
                  className="action-button delete-button"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {showConfirmation && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Confirm Upload</h3>
            <p>Are you sure you want to upload this document?</p>
            <div className="confirmation-actions">
              <button
                onClick={handleConfirmedUpload}
                disabled={uploading}
                className="action-button view-button"
              >
                {uploading ? 'Uploading...' : 'Confirm'}
              </button>
              <button
                onClick={() => {
                  setShowConfirmation(false);
                  setFileToUpload(null);
                  setDocumentType('');
                }}
                className="action-button delete-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirmation && (
        <div className="confirmation-modal">
          <div className="confirmation-content">
            <h3>Confirm Delete</h3>
            <p>Are you sure you want to delete this document?</p>
            <div className="confirmation-actions">
              <button
                onClick={() => handleDelete(documentToDelete)}
                disabled={deleteInProgress}
                className="action-button delete-button"
              >
                {deleteInProgress ? 'Deleting...' : 'Delete'}
              </button>
              <button
                onClick={() => {
                  setShowDeleteConfirmation(false);
                  setDocumentToDelete(null);
                }}
                className="action-button view-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialDocuments;
