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
  const [isBulkUpload, setIsBulkUpload] = useState(false);
  const [bulkFiles, setBulkFiles] = useState([]);
  const [bulkUploadProgress, setBulkUploadProgress] = useState(0);
  const [processingZip, setProcessingZip] = useState(false);
  const [cleanupInProgress, setCleanupInProgress] = useState(false);

  // Document categories with their corresponding types
  const documentCategories = {
    'all': {
      name: 'All Documents',
      icon: '📁',
      types: []
    },
    'invoices': {
      name: 'Invoices',
      icon: '🧾',
      types: [ ],
      allowMultiple: true
    },
    'financial_statements': {
      name: 'Financial Statements',
      icon: '📊',
      types: [
        'Profit & Loss Statement',
        'Balance Sheet',
        'Cash Flow Statement',
        'Audited Financial Report',
        'Financial Statements - Bulk Upload'
      ]
    },
    'tax_compliance': {
      name: 'Tax & Compliance',
      icon: '📋',
      types: [
        'Business Tax Return',
        'GST/VAT Return',
        'Withholding Tax Statement',
        'Tax Clearance Certificate',
        'Tax Documents - Bulk Upload'
      ]
    },
    'banking_investment': {
      name: 'Banking & Investment',
      icon: '🏦',
      types: [
        'Business Bank Statement',
        'Fixed Deposit Certificate',
        'Investment Portfolio',
        'Loan & Credit Agreement',
        'Banking Documents - Bulk Upload'
      ]
    },
    'accounts': {
      name: 'Accounts Payable & Receivable',
      icon: '💰',
      types: [
        'Outstanding Invoice',
        'Payment Record',
        'Accounts Receivable Report',
        'Accounts Payable Report',
        'Account Documents - Bulk Upload'
      ]
    },
    'valuation': {
      name: 'Company Valuation & Shareholding',
      icon: '📈',
      types: [
        'Shareholder Agreement',
        'Company Valuation Report',
        'Business Ownership Document',
        'Share Certificate',
        'Valuation Documents - Bulk Upload'
      ]
    },
    'debt_loan': {
      name: 'Debt & Loan Documentation',
      icon: '📝',
      types: [
        'Loan Agreement',
        'Repayment Schedule',
        'Collateral Documentation',
        'Debt Restructuring Agreement',
        'Loan Documents - Bulk Upload'
      ]
    },
    'other_documents': {
      name: 'Other Documents',
      icon: '📄',
      types: [  ],
      allowMultiple: true // Special flag for Other Documents category
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

      // Get signed URLs for documents and handle missing files
      const documentsWithUrls = [];
      const documentsToDelete = new Set(); // Use Set to prevent duplicates

      // First verify file existence in storage
      for (const doc of data) {
        if (doc.file_path) {
          try {
            // Check if file exists in storage first
            const { data: fileExists } = await supabase
              .storage
              .from('financial-documents')
              .list(doc.file_path.split('/').slice(0, -1).join('/'), {
                limit: 1,
                offset: 0,
                search: doc.file_path.split('/').pop()
              });

            if (!fileExists || fileExists.length === 0) {
              console.log(`File not found in storage for document ${doc.id}, marking for deletion`);
              documentsToDelete.add(doc.id);
              continue;
            }

            // Only try to get signed URL if file exists
            const { data: urlData, error: signError } = await supabase
              .storage
              .from('financial-documents')
              .createSignedUrl(doc.file_path, 3600);

            if (signError) {
              console.error(`Error getting signed URL for document ${doc.id}:`, signError);
              if (signError.message.includes('Object not found') || signError.statusCode === 400) {
                documentsToDelete.add(doc.id);
                continue;
              }
            }

            if (urlData?.signedUrl) {
              documentsWithUrls.push({
                ...doc,
                signed_url: urlData.signedUrl
              });
            }
          } catch (error) {
            console.error(`Error processing document ${doc.id}:`, error);
            if (error.message.includes('Object not found') || error.statusCode === 400) {
              documentsToDelete.add(doc.id);
            }
          }
        }
      }

      // Clean up orphaned records in batches
      const docsToDelete = Array.from(documentsToDelete);
      if (docsToDelete.length > 0 && !cleanupInProgress) {
        try {
          setCleanupInProgress(true);
          // Delete in batches of 10 to avoid overwhelming the database
          const batchSize = 10;
          for (let i = 0; i < docsToDelete.length; i += batchSize) {
            const batch = docsToDelete.slice(i, i + batchSize);
            const { error: deleteError } = await supabase
              .from('financial_documents')
              .delete()
              .in('id', batch);

            if (deleteError) {
              console.error(`Error cleaning up batch ${i / batchSize + 1}:`, deleteError);
            }
          }
          console.log(`Cleaned up ${docsToDelete.length} orphaned records`);
          
          // Set the documents state with only the valid documents
          setDocuments(documentsWithUrls);
        } catch (deleteError) {
          console.error('Error during cleanup:', deleteError);
        } finally {
          setCleanupInProgress(false);
        }
      } else {
        // If no cleanup needed or cleanup in progress, just update the documents
        setDocuments(documentsWithUrls);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      setUploadError('Error fetching documents. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = async (event, selectedDocType) => {
    const files = Array.from(event.target.files);
    
    if (files.length === 0) return;

    setUploadError(null);
    
    // Check if it's a bulk upload or Other Documents category or Invoices category
    if (selectedDocType.includes('Bulk Upload') || 
        (selectedCategory === 'other_documents' && documentCategories[selectedCategory].allowMultiple) ||
        (selectedCategory === 'invoices' && documentCategories[selectedCategory].allowMultiple)) {
      
      // Handle ZIP files
      if (files.length === 1 && files[0].type === 'application/zip') {
        const extractedFiles = await processZipFile(files[0]);
        if (extractedFiles) {
          setBulkFiles(extractedFiles);
          setIsBulkUpload(true);
          setShowConfirmation(true);
        }
      } else {
        setBulkFiles(files);
        setIsBulkUpload(true);
        setShowConfirmation(true);
      }
    } else {
      // Single file upload
      setFileToUpload(files[0]);
      setIsBulkUpload(false);
      setShowConfirmation(true);
    }
  };

  const processZipFile = async (zipFile) => {
    try {
      setProcessingZip(true);
      const JSZip = (await import('jszip')).default;
      const zip = await JSZip.loadAsync(zipFile);
      const files = [];
      
      // Process each file in the ZIP
      for (const [filename, zipEntry] of Object.entries(zip.files)) {
        if (!zipEntry.dir) {
          const blob = await zipEntry.async('blob');
          const file = new File([blob], filename, { type: blob.type });
          files.push(file);
        }
      }
      
      return files;
    } catch (error) {
      console.error('Error processing ZIP file:', error);
      setUploadError('Error processing ZIP file. Please ensure it\'s a valid ZIP archive.');
      return null;
    } finally {
      setProcessingZip(false);
    }
  };

  const handleConfirmedUpload = async () => {
    if (isBulkUpload) {
      if (bulkFiles.length === 0) return;
      
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
        let successCount = 0;

        for (let i = 0; i < bulkFiles.length; i++) {
          const file = bulkFiles[i];
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          const sanitizedFileName = file.name.replace(/\s+/g, '_');
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
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: true,
              contentType: file.type
            });

          if (uploadError) {
            console.error(`Error uploading ${file.name}:`, uploadError);
            continue;
          }

          // Insert document record into database
          const documentData = {
            user_id: userId,
            doc_type: documentType,
            category: selectedCategory,
            year: selectedYear,
            file_path: filePath,
            file_name: sanitizedFileName,
            file_size: file.size,
            content_type: file.type
          };

          const { error: dbError } = await supabase
            .from('financial_documents')
            .insert(documentData);

          if (dbError) {
            console.error(`Error saving ${file.name} to database:`, dbError);
            continue;
          }

          successCount++;
          setBulkUploadProgress((successCount / bulkFiles.length) * 100);
        }

        setSuccessMessage(`Successfully uploaded ${successCount} out of ${bulkFiles.length} files`);
        fetchDocuments();
      } catch (error) {
        console.error('Error in bulk upload:', error);
        setUploadError(error.message);
      } finally {
        setUploading(false);
        setBulkFiles([]);
        setDocumentType('');
        setBulkUploadProgress(0);
        setTimeout(() => {
          setSuccessMessage(null);
          setUploadError(null);
        }, 5000);
      }
    } else {
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
    }
  };

  const handleDelete = async (document) => {
    if (!document || !document.id) {
      console.error('Invalid document to delete');
      setUploadError('Invalid document to delete');
      return;
    }

    try {
      setDeleteInProgress(true);
      setUploadError(null);

      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No user session found');
      }

      // First try to delete from storage
      if (document.file_path) {
        try {
          const { error: storageError } = await supabase
            .storage
            .from('financial-documents')
            .remove([document.file_path]);

          if (storageError) {
            console.error('Storage deletion error:', storageError);
            // Continue with database deletion even if storage deletion fails
          }
        } catch (storageError) {
          console.error('Storage deletion error:', storageError);
          // Continue with database deletion even if storage deletion fails
        }
      }

      // Then delete from database
      const { error: dbError } = await supabase
        .from('financial_documents')
        .delete()
        .eq('id', document.id)
        .eq('user_id', sessionData.session.user.id);

      if (dbError) {
        throw new Error(`Failed to delete document record: ${dbError.message}`);
      }

      // Remove from local state immediately
      setDocuments(prevDocuments => prevDocuments.filter(doc => doc.id !== document.id));
      setSuccessMessage('Document deleted successfully!');

    } catch (error) {
      console.error('Error in delete operation:', error);
      setUploadError(error.message || 'Failed to delete document');
    } finally {
      setDeleteInProgress(false);
      setShowDeleteConfirmation(false);
      setDocumentToDelete(null);
      // Refresh the documents list to ensure everything is in sync
      await fetchDocuments();
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
              onClick={() => {
                setSelectedCategory(key);
                // Set a default document type "Invoices" when the invoices category is selected
                if (key === 'invoices') {
                  setDocumentType('Invoices');
                } else if (key !== 'other_documents') {
                  // Reset document type when switching to any category except other_documents
                  setDocumentType('');
                }
              }}
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
            <div className="document-type-container">
              <div className="document-type-label">Document Type</div>
              {(selectedCategory === 'other_documents' || selectedCategory === 'invoices') ? (
                <div className="document-type-input-container">
                  <input
                    type="text"
                    value={documentType}
                    onChange={(e) => {
                      setDocumentType(e.target.value);
                      setUploadError(null);
                    }}
                    placeholder={selectedCategory === 'invoices' ? "Enter invoice type" : "Enter document type"}
                    className={`document-type-input ${!documentType.trim() && uploadError ? 'error' : ''}`}
                  />
                  {uploadError && <div className="input-error-message">{uploadError}</div>}
                </div>
              ) : (
                <select
                  value={documentType}
                  onChange={(e) => {
                    setDocumentType(e.target.value);
                    setIsBulkUpload(e.target.value.includes('Bulk Upload'));
                  }}
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

            <div className="upload-section">
              <input
                id="file-input"
                type="file"
                multiple={documentType.includes('Bulk Upload') || 
                         selectedCategory === 'invoices' ||
                         (selectedCategory === 'other_documents' && documentCategories[selectedCategory].allowMultiple)}
                onChange={(e) => handleFileSelect(e, documentType)}
                style={{ display: 'none' }}
                accept=".zip,image/*,.pdf,.doc,.docx,.xls,.xlsx,.csv"
                disabled={!documentType || documentType.trim() === '' || 
                         ((selectedCategory === 'other_documents' || selectedCategory === 'invoices') && !documentType.trim())}
              />
              <div 
                className={`upload-button ${(!documentType || ((selectedCategory === 'other_documents' || selectedCategory === 'invoices') && !documentType.trim())) ? 'disabled' : ''}`}
                data-multiple={documentType.includes('Bulk Upload') || 
                             selectedCategory === 'invoices' ||
                             (selectedCategory === 'other_documents' && documentCategories[selectedCategory].allowMultiple)}
                onClick={() => {
                  // First check if document type is empty or only contains whitespace
                  if (!documentType || documentType.trim() === '') {
                    setUploadError('Please select or enter a document type before uploading');
                    return;
                  }

                  // For text input categories, ensure there's actual text
                  if ((selectedCategory === 'other_documents' || selectedCategory === 'invoices') && !documentType.trim()) {
                    setUploadError('Please enter a valid document type before uploading');
                    return;
                  }

                  // Clear any previous errors
                  setUploadError(null);
                  document.getElementById('file-input').click();
                }}
              >
                <span className="upload-icon">
                  {documentType.includes('Bulk Upload') || 
                   selectedCategory === 'invoices' ||
                   (selectedCategory === 'other_documents' && documentCategories[selectedCategory].allowMultiple) 
                    ? '📦' : '📄'}
                </span>
                <div className="upload-text">
                  {documentType.includes('Bulk Upload') || 
                   selectedCategory === 'invoices' ||
                   (selectedCategory === 'other_documents' && documentCategories[selectedCategory].allowMultiple)
                    ? 'Select Files' : 'Select File'}
                  <small>to {selectedYear}</small>
                </div>
              </div>
            </div>
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
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <h3>Confirm Upload</h3>
            </div>
            <div className="confirmation-content">
              {isBulkUpload ? (
                <>
                  <p className="doc-type">Document Type: {documentType}</p>
                  <p>Selected Files: {bulkFiles.length}</p>
                  <div className="file-details">
                    {bulkFiles.slice(0, 3).map((file, index) => (
                      <div key={index} className="file-info">
                        <span className="file-name">{file.name}</span>
                        <span className="file-size">({formatFileSize(file.size)})</span>
                      </div>
                    ))}
                    {bulkFiles.length > 3 && (
                      <div className="file-info">
                        <span className="file-name">...and {bulkFiles.length - 3} more files</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <p className="doc-type">Document Type: {documentType}</p>
                  <div className="file-details">
                    <span className="file-name">{fileToUpload?.name}</span>
                    <span className="file-size">({formatFileSize(fileToUpload?.size)})</span>
                  </div>
                </>
              )}
              <p className="confirmation-note">Files will be uploaded to the {selectedYear} folder.</p>
            </div>
            <div className="confirmation-actions">
              <button 
                className="cancel-button" 
                onClick={() => {
                  setShowConfirmation(false);
                  setBulkFiles([]);
                  setFileToUpload(null);
                }}
              >
                Cancel
              </button>
              <button 
                className="confirm-button"
                onClick={handleConfirmedUpload}
                disabled={uploading || (!isBulkUpload && !fileToUpload) || (isBulkUpload && bulkFiles.length === 0)}
              >
                {uploading ? 'Uploading...' : 'Confirm Upload'}
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
