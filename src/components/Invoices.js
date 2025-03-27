import React, { useState, useEffect } from 'react';
import { supabase } from './SupabaseClient';
import './Invoices.css';

const Invoices = () => {
  const [invoices, setInvoices] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
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

      // Get signed URLs for invoice PDFs and add default status
      const invoicesWithUrls = await Promise.all(
        data.map(async (invoice, index) => {
          if (invoice.pdf_url) {
            const { data: urlData } = await supabase
              .storage
              .from('private-invoices')
              .createSignedUrl(invoice.pdf_url, 3600); // URL valid for 1 hour

            return {
              ...invoice,
              signed_pdf_url: urlData?.signedUrl,
              status: index < 2 ? 'pending' : (invoice.status || 'paid') // Set first two as pending
            };
          }
          return {
            ...invoice,
            status: index < 2 ? 'pending' : (invoice.status || 'paid') // Set first two as pending
          };
        })
      );

      setInvoices(invoicesWithUrls);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError(err.message);
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
      currency: 'EUR'
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
        return 'status-paid'; // Default to paid status
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
        return 'Paid'; // Default to Paid text
    }
  };

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
        <table className="invoices-table">
          <thead>
            <tr>
              <th>S.No</th>
              <th>Invoice Number</th>
              <th>Date</th>
              <th>Due Date</th>
              <th>Services</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((invoice, index) => (
              <tr key={invoice.id}>
                <td className="serial-number">{index + 1}</td>
                <td className="invoice-number">
                  #{invoice.invoice_number}
                </td>
                <td className="date-cell">
                  {formatDate(invoice.date)}
                </td>
                <td className="date-cell">
                  {formatDate(invoice.due_date)}
                </td>
                <td className="services-cell">
                  {invoice.products && invoice.products.map((product, idx) => (
                    <div key={idx} className="service-item">
                      {product.description || product.name}
                    </div>
                  ))}
                </td>
                <td className="total-cell">
                  {formatCurrency(invoice.total)}
                </td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(invoice.status)}`}>
                    {getStatusText(invoice.status)}
                  </span>
                </td>
                <td>
                  {invoice.signed_pdf_url && (
                    <a
                      href={invoice.signed_pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-button"
                    >
                      <span className="download-icon">📄</span>
                      Download
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Invoices; 
