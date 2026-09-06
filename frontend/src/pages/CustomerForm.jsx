import React, { useState } from 'react';
import { api } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';
import { UserPlus } from 'lucide-react';

export default function CustomerForm({ onCustomerCreated }) {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [createdCustomer, setCreatedCustomer] = useState(null);

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) {
      errs.name = 'Customer name is required';
    }
    if (!formData.email.trim()) {
      errs.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errs.email = 'Please enter a valid email format';
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    if (!validate()) return;

    setLoading(true);
    try {
      const customer = await api.createCustomer({
        name: formData.name.trim(),
        email: formData.email.trim()
      });

      setCreatedCustomer(customer);
      setSuccessMsg(`Customer '${customer.name}' registered successfully with Customer ID #${customer.id}`);
      setFormData({ name: '', email: '', phone: '' });
      setFieldErrors({});

      if (onCustomerCreated) onCustomerCreated(customer);
    } catch (err) {
      setError(err.message || 'Failed to create customer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <UserPlus size={20} /> Register New Customer / Policyholder
      </div>

      {error && <ErrorBanner message={error} testId="customer-error-message" />}
      {successMsg && <SuccessBanner message={successMsg} testId="customer-success-message" />}

      <form onSubmit={handleSubmit} noValidate>
        <div className="form-group">
          <label className="form-label" htmlFor="customer-name">
            Full Name *
          </label>
          <input
            id="customer-name"
            type="text"
            className="form-control"
            placeholder="e.g. Jane Doe"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            data-testid="customer-name-input"
            disabled={loading}
          />
          {fieldErrors.name && (
            <div className="inline-error" data-testid="name-error">
              {fieldErrors.name}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="customer-email">
            Email Address *
          </label>
          <input
            id="customer-email"
            type="email"
            className="form-control"
            placeholder="e.g. jane.doe@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            data-testid="customer-email-input"
            disabled={loading}
          />
          {fieldErrors.email && (
            <div className="inline-error" data-testid="email-error">
              {fieldErrors.email}
            </div>
          )}
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="customer-phone">
            Phone Number (Optional)
          </label>
          <input
            id="customer-phone"
            type="tel"
            className="form-control"
            placeholder="e.g. +91 9876543210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            data-testid="customer-phone-input"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          data-testid="submit-customer"
          disabled={loading}
        >
          {loading ? 'Registering Customer...' : 'Create Customer'}
        </button>
      </form>

      {createdCustomer && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(56, 189, 248, 0.08)', borderRadius: '0.5rem' }}>
          <strong>Registered Customer ID:</strong>{' '}
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', color: 'var(--primary)' }}>
            {createdCustomer.id}
          </span>
        </div>
      )}
    </div>
  );
}
