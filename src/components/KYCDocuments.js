import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';

import './Documents.css';

const KYCDocuments = () => {
  const [documents, setDocuments] = useState({
    passport: { file: null, status: 'required', uploadDate: null, comments: null },
    address_proof: { file: null, status: 'required', uploadDate: null, comments: null },
    utility_bill: { file: null, status: 'required', uploadDate: null, comments: null },
    driving_license: { file: null, status: 'required', uploadDate: null, comments: null }
  });
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [activeDocType, setActiveDocType] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [confirmationDocType, setConfirmationDocType] = useState(null);

  useEffect(() => {
    fetchKYCDocuments();

    // Set up real-time subscription for KYC document status changes
    const fetchUserIdAndSubscribe = async () => {
      const userId = await getUserId();
      if (userId) {
        const kycStatusSubscription = supabase
          .channel('kyc-status-changes')
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'kyc_documents',
              filter: `user_id=eq.${userId}`
            },
            handleKycStatusChange
          )
          .subscribe();

        // Cleanup subscription on component unmount
        return () => {
          supabase.removeChannel(kycStatusSubscription);
        };
      }
    };

    fetchUserIdAndSubscribe();
  }, []);

  // Get current user ID safely
  const getUserId = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      return data?.session?.user?.id || null;
    } catch (error) {
      console.error('Error getting user ID:', error);
      return null;
    }
  };

  // Handle real-time status updates from admin approvals
  const handleKycStatusChange = (payload) => {
    try {
      const { new: newRecord } = payload;
      if (!newRecord) return;

      const { doc_type, status, comments } = newRecord;

      // Only update if this is one of our tracked document types
      if (!documents[doc_type]) return;

      // Update the document status in our state
      setDocuments((prev) => ({
        ...prev,
        [doc_type]: {
          ...prev[doc_type],
          status,
          comments,
        },
      }));

      // Show appropriate notification based on status change
      if (status === 'approved') {
        setSuccessMessage(`Your ${getDocumentTitle(doc_type)} has been approved!`);
      } else if (status === 'rejected') {
        setUploadError(
          `Your ${getDocumentTitle(doc_type)} was rejected. Reason: ${comments || 'No reason provided'}. Please upload a new document.`
        );
      }

      // Clear messages after 5 seconds
      setTimeout(() => {
        setSuccessMessage(null);
        setUploadError(null);
      }, 5000);
    } catch (error) {
      console.error('Error handling KYC status change:', error);
    }
  };

  const fetchKYCDocuments = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        console.error('No user logged in:', sessionError);
        setLoading(false);
        return;
      }

      const userId = sessionData.session.user.id;
      console.log('Fetching KYC documents for user:', userId);

      // Fetch from kyc_documents table
      const { data: kycData, error: kycError } = await supabase
        .from('kyc_documents')
        .select('doc_type, file_path, status, comments, upload_date, file_size, file_name, content_type')
        .eq('user_id', userId);

      if (kycError) {
        console.error('Error fetching KYC documents:', kycError);
        setLoading(false);
        return;
      }

      let updatedDocuments = {
        passport: { file: null, status: 'required', uploadDate: null, comments: null },
        address_proof: { file: null, status: 'required', uploadDate: null, comments: null },
        utility_bill: { file: null, status: 'required', uploadDate: null, comments: null },
        driving_license: { file: null, status: 'required', uploadDate: null, comments: null },
      };

      if (kycData && kycData.length > 0) {
        console.log('Documents found in database:', kycData);
        
        // Process all documents at once first to avoid race conditions
        for (const record of kycData) {
          const docType = record.doc_type;
          console.log('Processing document:', docType, 'with file path:', record.file_path);

          if (!updatedDocuments[docType]) continue;

          // Update database info even if file is missing
          updatedDocuments[docType] = {
            file: {
              name: record.file_name || record.file_path.split('/').pop(),
              url: null, // Will attempt to set this below
              size: record.file_size || null,
              type: record.content_type || null,
              path: record.file_path
            },
            status: record.status,
            uploadDate: record.upload_date,
            comments: record.comments,
          };
        }
        
        // Now try to get signed URLs for files that exist
        for (const record of kycData) {
          const docType = record.doc_type;
          if (!updatedDocuments[docType]) continue;
          
          try {
            // First check if file exists in storage
            const filePath = record.file_path;
            const filePathParts = filePath.split('/');
            const bucketPath = filePathParts.slice(0, -1).join('/');
            const fileName = filePathParts.pop();
            
            // Check if file exists before trying to get URL
            const { data: fileExists, error: fileCheckError } = await supabase
              .storage
              .from('kyc-documents')
              .list(bucketPath);
              
            if (fileCheckError) {
              console.warn(`Error checking if file exists for ${docType}:`, fileCheckError);
              continue;
            }
            
            const fileFound = fileExists.some(file => file.name === fileName);
            if (!fileFound) {
              console.warn(`File not found in storage for ${docType}: ${filePath}`);
              continue;
            }
            
            // Try to get signed URL now that we know file exists
            const { data: urlData, error: urlError } = await supabase
              .storage
              .from('kyc-documents')
              .createSignedUrl(filePath, 3600);

            if (urlError) {
              console.warn(`Error getting URL for ${docType}:`, urlError);
              continue;
            }

            console.log('Generated signed URL for', docType, ':', urlData?.signedUrl);
            
            // Update the URL in our document state
            updatedDocuments[docType].file.url = urlData?.signedUrl || null;
          } catch (innerError) {
            console.error(`Error processing document ${docType}:`, innerError);
          }
        }
      } else {
        console.log('No documents found in database, checking storage...');
        await fetchDocumentsFromStorage(userId, updatedDocuments);
        return;
      }

      console.log('Final updated documents state:', updatedDocuments);
      setDocuments(updatedDocuments);
    } catch (error) {
      console.error('Error in fetchKYCDocuments:', error);
    } finally {
      setLoading(false);
    }
  };

  // Safely check storage for documents without creating empty folders
  const fetchDocumentsFromStorage = async (userId, baseDocuments) => {
    if (!userId) {
      console.error('No user ID available');
      return;
    }

    let updatedDocuments = { ...baseDocuments };
    const documentTypes = ['passport', 'address_proof', 'utility_bill', 'driving_license'];

    for (const docType of documentTypes) {
      try {
        const { data: files, error: listError } = await supabase
          .storage
          .from('kyc-documents')
          .list(`${userId}/${docType}/`, {
            limit: 1,
            sortBy: { column: 'created_at', order: 'desc' },
          });

        if (listError) {
          console.warn(`Error checking ${docType} documents:`, listError);
          continue;
        }

        if (!files || files.length === 0) {
          continue; // No files, keep as 'required'
        }

        const { data: urlData, error: urlError } = await supabase
          .storage
          .from('kyc-documents')
          .createSignedUrl(`${userId}/${docType}/${files[0].name}`, 3600);

        if (urlError) {
          console.warn(`Error getting URL for ${docType}:`, urlError);
          continue;
        }

        updatedDocuments[docType] = {
          file: {
            name: files[0].name,
            url: urlData?.signedUrl || null,
            size: files[0].metadata?.size || 0,
            type: files[0].metadata?.contentType || null,
            path: `${userId}/${docType}/${files[0].name}`
          },
          status: 'pending',
          uploadDate: files[0].created_at,
          comments: null,
        };
      } catch (innerError) {
        console.error(`Error checking ${docType} documents:`, innerError);
      }
    }

    setDocuments(updatedDocuments);
  };

  // Handle file selection - show confirmation popup
  const handleFileSelection = (e, docType) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size exceeds 5MB limit.');
      setTimeout(() => setUploadError(null), 5000);
      return;
    }

    setFileToUpload(file);
    setConfirmationDocType(docType);
    setShowConfirmation(true);
  };

  // Handle confirmed file upload
  const handleConfirmedUpload = async () => {
    if (!fileToUpload || !confirmationDocType) return;
  
    try {
      setShowConfirmation(false);
      setActiveDocType(confirmationDocType);
      setUploading(true);
      setUploadError(null);
      setSuccessMessage(null);
  
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !sessionData?.session) {
        setUploadError('You must be logged in to upload documents');
        setUploading(false);
        return;
      }
  
      const userId = sessionData.session.user.id;
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      // Remove spaces from filename to avoid URL encoding issues
      const sanitizedFileName = fileToUpload.name.replace(/\s+/g, '_');
      const fileName = `${timestamp}_${sanitizedFileName}`;
      const filePath = `${userId}/${confirmationDocType}/${fileName}`;
  
      console.log('Uploading to storage:', filePath);
      
      // First check if the directory exists
      const dirPath = `${userId}/${confirmationDocType}`;
      const { data: dirExists, error: dirCheckError } = await supabase
        .storage
        .from('kyc-documents')
        .list(dirPath);
      
      // Create directory if it doesn't exist (by uploading an empty placeholder)
      if (dirCheckError || !dirExists) {
        console.log('Creating directory:', dirPath);
        await supabase
          .storage
          .from('kyc-documents')
          .upload(`${dirPath}/.emptyFolderPlaceholder`, new Blob(['']));
      }
      
      // Now upload the actual file
      const { data: uploadData, error: uploadError } = await supabase
        .storage
        .from('kyc-documents')
        .upload(filePath, fileToUpload, { 
          cacheControl: '3600', 
          upsert: true,  // Changed to true to overwrite any existing file
          contentType: fileToUpload.type
        });
  
      if (uploadError) {
        console.error('Upload error:', uploadError);
        setUploadError(`Error uploading file: ${uploadError.message}`);
        setUploading(false);
        return;
      }
  
      console.log('File uploaded successfully. Now inserting into database...', uploadData);
  
      const documentData = {
        user_id: userId,
        doc_type: confirmationDocType,
        file_path: filePath,
        status: 'pending',
        comments: null,
        upload_date: new Date().toISOString(),
        file_size: fileToUpload.size,
        file_name: sanitizedFileName, // Store sanitized filename without spaces
        content_type: fileToUpload.type,
      };
      
      console.log('Upserting into kyc_documents:', documentData);
  
      const { data, error: dbError } = await supabase
        .from('kyc_documents')
        .upsert(documentData, { 
          onConflict: 'user_id,doc_type',
          ignoreDuplicates: false
        });
  
      if (dbError) {
        console.error('Database error:', dbError);
        setUploadError(`Database error: ${dbError.message}`);
      } else {
        console.log('File successfully recorded in database:', data);
        // Add a small delay before fetching to ensure the database is updated
        setTimeout(() => {
          fetchKYCDocuments();
        }, 1000);
      }
  
      setSuccessMessage(`${getDocumentTitle(confirmationDocType)} uploaded successfully! Awaiting verification.`);
    } catch (error) {
      console.error('Error in handleConfirmedUpload:', error);
      setUploadError(`Error uploading file: ${error.message}`);
    } finally {
      setUploading(false);
      setFileToUpload(null);
      setConfirmationDocType(null);
      setTimeout(() => {
        setSuccessMessage(null);
        setUploadError(null);
      }, 5000);
    }
  };
  
  // Handle cancellation of upload
  const handleCancelUpload = () => {
    setShowConfirmation(false);
    setFileToUpload(null);
    setConfirmationDocType(null);
  };

  const getDocumentTitle = (docType) => {
    switch (docType) {
      case 'passport': return 'Passport';
      case 'address_proof': return 'Address Proof';
      case 'utility_bill': return 'Utility Bill';
      case 'driving_license': return 'Driving License';
      default: return 'Document';
    }
  };

  const getDocumentDescription = (docType) => {
    switch (docType) {
      case 'passport':
        return 'Upload a clear copy of your passport. All details must be visible.';
      case 'address_proof':
        return 'Upload a document proving your current residential address.';
      case 'utility_bill':
        return 'Upload a recent utility bill (less than 3 months old).';
      case 'driving_license':
        return 'Upload a clear copy of your driving license (front and back).';
      default: return '';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not uploaded';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': return 'status-verified';
      case 'pending': return 'status-pending';
      case 'rejected': return 'status-rejected';
      case 'required': return 'status-required';
      default: return '';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return '✅';
      case 'pending': return '⏳';
      case 'rejected': return '❌';
      case 'required': return '📄';
      default: return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'pending': return 'Pending Verification';
      case 'rejected': return 'Rejected';
      case 'required': return 'Required - Not Uploaded';
      default: return '';
    }
  };

  if (loading) {
    return (
      <div className="documents-container loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your KYC documents...</p>
      </div>
    );
  }

  return (
    <div className="documents-container">
      <h1>KYC Documents</h1>
      <div className="kyc-intro">
        <p>Please upload the following documents for verification. All documents will be reviewed by our team.</p>
        <div className="kyc-workflow">
          <div className="workflow-step">
            <div className="step-number">1</div>
            <div className="step-content">
              <h4>Upload Documents</h4>
              <p>Submit your identity verification documents</p>
            </div>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-step">
            <div className="step-number">2</div>
            <div className="step-content">
              <h4>Pending Review</h4>
              <p>Documents await verification by our compliance team</p>
            </div>
          </div>
          <div className="workflow-arrow">→</div>
          <div className="workflow-step">
            <div className="step-number">3</div>
            <div className="step-content">
              <h4>Approval</h4>
              <p>Documents are verified and approved</p>
            </div>
          </div>
        </div>
        <div className="kyc-status-indicators">
          <div className="kyc-status-item"><span className="status-indicator approved"></span><span>Approved</span></div>
          <div className="kyc-status-item"><span className="status-indicator pending"></span><span>Pending</span></div>
          <div className="kyc-status-item"><span className="status-indicator rejected"></span><span>Rejected</span></div>
          <div className="kyc-status-item"><span className="status-indicator required"></span><span>Required</span></div>
        </div>
      </div>

      {successMessage && <div className="alert success"><span className="alert-icon">✅</span>{successMessage}</div>}
      {uploadError && <div className="alert error"><span className="alert-icon">⚠️</span>{uploadError}</div>}

      {/* Confirmation Popup */}
      {showConfirmation && (
        <div className="confirmation-overlay">
          <div className="confirmation-dialog">
            <div className="confirmation-header">
              <h3>Confirm Upload</h3>
            </div>
            <div className="confirmation-content">
              <p>Are you sure you want to upload this file?</p>
              <div className="file-details">
                <span className="doc-icon">📄</span>
                <span className="file-name">{fileToUpload?.name}</span>
                <span className="file-size">({formatFileSize(fileToUpload?.size)})</span>
              </div>
              <p className="doc-type">Document type: <strong>{getDocumentTitle(confirmationDocType)}</strong></p>
              <p className="confirmation-note">Note: This file will be submitted for verification and cannot be changed while under review.</p>
            </div>
            <div className="confirmation-actions">
              <button className="cancel-button" onClick={handleCancelUpload}>Cancel</button>
              <button className="confirm-button" onClick={handleConfirmedUpload}>Upload</button>
            </div>
          </div>
        </div>
      )}

      <div className="kyc-documents-grid">
        {Object.entries(documents).map(([docType, docData]) => (
          <div className={`kyc-document-card ${getStatusClass(docData.status)}`} key={docType}>
            <div className="kyc-document-header">
              <h3>{getDocumentTitle(docType)}</h3>
              <div className={`kyc-status ${getStatusClass(docData.status)}`}>
                <span className="status-icon">{getStatusIcon(docData.status)}</span>
                {getStatusText(docData.status)}
              </div>
            </div>
            <p className="kyc-document-description">{getDocumentDescription(docType)}</p>

            {docData.file && docData.file.name && docData.file.name !== ".emptyFolderPlaceholder" ? (
              <div className="kyc-document-details">
                <div className="kyc-document-file">
                  <span className="doc-icon">📄</span>
                  <span className="doc-name">{docData.file.name}</span>
                </div>
                <div className="kyc-document-meta">
                  <span>Uploaded: {formatDate(docData.uploadDate)}</span>
                  <span>Size: {formatFileSize(docData.file.size)}</span>
                </div>
                {docData.file.url && (
                  <div className="kyc-document-actions">
                    <a href={docData.file.url} target="_blank" rel="noopener noreferrer" className="action-button view-button">
                      View Document
                    </a>
                  </div>
                )}
                {docData.comments && docData.status === 'rejected' && (
                  <div className="rejection-comments">
                    <p><strong>Rejection Reason:</strong> {docData.comments}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="kyc-document-upload">
                <p className="kyc-upload-prompt">No document uploaded yet</p>
                <label className="upload-button">
                  Upload Document
                  <input
                    type="file"
                    onChange={(e) => handleFileSelection(e, docType)}
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: 'none' }}
                    disabled={uploading && activeDocType === docType}
                  />
                </label>
                {uploading && activeDocType === docType && <div className="upload-progress">Uploading...</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="kyc-notes">
        <h3>Important Notes:</h3>
        <ul>
          <li>All documents must be valid and not expired</li>
          <li>Images must be clear and all information legible</li>
          <li>Files must be in JPG, PNG, or PDF format</li>
          <li>Maximum file size: 5MB per document</li>
          <li>Verification typically takes 1-2 business days</li>
          <li>You will be notified when your documents are approved or require re-submission</li>
        </ul>
      </div>
    </div>
  );
};

export default KYCDocuments;