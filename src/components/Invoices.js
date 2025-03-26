import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import './Invoices.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        throw new Error('No user session found');
      }

      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('client_email', sessionData.session.user.email)
        .eq('approved', true)
        .eq('visible_to_client', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get signed URLs for invoice PDFs
      const invoicesWithUrls = await Promise.all(
        data.map(async (invoice) => {
          if (invoice.pdf_url) {
            const { data: urlData } = await supabase
              .storage
              .from('private-invoices')
              .createSignedUrl(invoice.pdf_url, 3600); // URL valid for 1 hour

            return {
              ...invoice,
              signed_pdf_url: urlData?.signedUrl
            };
          }
          return invoice;
        })
      );

      setInvoices(invoicesWithUrls);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'status-paid';
      case 'pending':
        return 'status-pending';
      case 'overdue':
        return 'status-overdue';
      case 'draft':
        return 'status-draft';
      default:
        return 'status-unknown';
    }
  };

  const getStatusText = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'Paid';
      case 'pending':
        return 'Pending';
      case 'overdue':
        return 'Overdue';
      case 'draft':
        return 'Draft';
      default:
        return 'Unknown';
    }
  };

  if (loading) {
    return (
      <div className="invoices-container loading">
        <div className="loading-spinner"></div>
        <p>Loading your invoices...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="invoices-container error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>Error loading invoices: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="invoices-container">
      <h1>Your Invoices</h1>
      
      {invoices.length === 0 ? (
        <div className="no-invoices">
          <p>No invoices available at the moment.</p>
        </div>
      ) : (
        <div className="invoices-list">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="invoice-card">
              <div className="invoice-header">
                <div className="invoice-company">
                  <h3>{invoice.client_name}</h3>
                  <div className="invoice-meta">
                    <p className="invoice-number">Invoice #{invoice.invoice_number}</p>
                    <p className="invoice-date">Generated on {formatDate(invoice.date)}</p>
                  </div>
                </div>
                <div className="invoice-amount">
                  <span className="amount-label">Total Amount</span>
                  <span className="amount-value">{formatCurrency(invoice.total)}</span>
                  <div className={`status-badge ${getStatusBadgeClass(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </div>
                </div>
              </div>
              
              <div className="invoice-details">
                <div className="invoice-dates">
                  <div className="date-row">
                    <span className="date-label">Issue Date:</span>
                    <span className="date-value">{formatDate(invoice.date)}</span>
                  </div>
                  <div className="date-row">
                    <span className="date-label">Due Date:</span>
                    <span className={`date-value ${invoice.status === 'overdue' ? 'overdue' : ''}`}>
                      {formatDate(invoice.due_date)}
                    </span>
                  </div>
                </div>

                {invoice.products && invoice.products.length > 0 && (
                  <div className="invoice-products">
                    <h4>Products/Services</h4>
                    <div className="products-list">
                      {invoice.products.map((product, index) => (
                        <div key={index} className="product-item">
                          <span className="product-name">{product.name}</span>
                          <span className="product-amount">{formatCurrency(product.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {invoice.signed_pdf_url && (
                <div className="invoice-actions">
                  <a
                    href={invoice.signed_pdf_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="download-button"
                  >
                    <span className="download-icon">📄</span>
                    Download Invoice
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Invoices; 