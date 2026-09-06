import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';
import { FileText, Calculator } from 'lucide-react';

export default function PolicyForm({ onPolicyCreated }) {
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [premiumAmount, setPremiumAmount] = useState('');
  const [gstRate, setGstRate] = useState('18.0');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [createdPolicy, setCreatedPolicy] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const list = await api.getCustomers();
      setCustomers(list || []);
      if (list && list.length > 0 && !customerId) {
        setCustomerId(String(list[0].id));
      }
    } catch (err) {
      console.error('Failed to fetch customers list:', err);
    }
  };

  // Live GST & Total Calculation
  const numPremium = parseFloat(premiumAmount) || 0;
  const numGstRate = parseFloat(gstRate) || 0;
  const liveGstAmount = Math.round((numPremium * numGstRate) / 100 * 100) / 100;
  const liveTotalPremium = Math.round((numPremium + liveGstAmount) * 100) / 100;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    if (!customerId) {
      setError('Please select or enter a valid customer');
      return;
    }
    if (!policyNumber.trim()) {
      setError('Policy number is required');
      return;
    }
    if (numPremium <= 0) {
      setError('Premium amount must be greater than 0');
      return;
    }

    setLoading(true);
    try {
      const policy = await api.createPolicy({
        customer_id: parseInt(customerId, 10),
        policy_number: policyNumber.trim(),
        premium_amount: numPremium,
        gst_rate: numGstRate
      });

      setCreatedPolicy(policy);
      setSuccessMsg(`Policy '${policy.policy_number}' issued successfully! Total Premium: ₹${policy.total_premium.toFixed(2)}`);
      setPolicyNumber('');
      setPremiumAmount('');

      if (onPolicyCreated) onPolicyCreated(policy);
    } catch (err) {
      setError(err.message || 'Failed to create policy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <FileText size={20} /> Issue New Insurance Policy
      </div>

      {error && <ErrorBanner message={error} testId="policy-error-message" />}
      {successMsg && <SuccessBanner message={successMsg} testId="policy-success-message" />}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="customer-select">
            Select Customer / Customer ID *
          </label>
          <select
            id="customer-select"
            className="form-control"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            data-testid="customer-select"
            disabled={loading}
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                #{c.id} - {c.name} ({c.email})
              </option>
            ))}
            {customerId && !customers.some((c) => String(c.id) === String(customerId)) && (
              <option value={customerId}>Customer #{customerId}</option>
            )}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="policy-number">
            Policy Number *
          </label>
          <input
            id="policy-number"
            type="text"
            className="form-control"
            placeholder="e.g. POL-2026-AUTO-001"
            value={policyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            data-testid="policy-number-input"
            disabled={loading}
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="premium-amount">
              Net Premium Amount (₹) *
            </label>
            <input
              id="premium-amount"
              type="number"
              step="0.01"
              className="form-control"
              placeholder="e.g. 10000"
              value={premiumAmount}
              onChange={(e) => setPremiumAmount(e.target.value)}
              data-testid="premium-amount-input"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="gst-rate">
              GST Rate (%)
            </label>
            <input
              id="gst-rate"
              type="number"
              step="0.1"
              className="form-control"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
              data-testid="gst-rate-input"
              disabled={loading}
            />
          </div>
        </div>

        {/* Live GST / Total Premium Preview */}
        <div className="live-preview" data-testid="live-gst-preview">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, color: 'var(--primary)' }}>
            <Calculator size={18} /> Live Tax & Premium Accounting Preview:
          </div>
          <div style={{ marginTop: '0.5rem', fontFamily: 'var(--font-mono)' }}>
            Net Premium: ₹{numPremium.toFixed(2)} + GST ({numGstRate}%): ₹{liveGstAmount.toFixed(2)} = Total Premium: ₹{liveTotalPremium.toFixed(2)}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          data-testid="submit-policy"
          disabled={loading}
        >
          {loading ? 'Booking Policy & Ledger Entries...' : 'Issue & Book Policy'}
        </button>
      </form>

      {createdPolicy && (
        <div style={{ marginTop: '1.25rem', padding: '1rem', background: 'rgba(52, 211, 153, 0.08)', borderRadius: '0.5rem' }}>
          <strong>Policy Issued Successfully!</strong> Policy ID: #{createdPolicy.id} | Total Premium: ₹{createdPolicy.total_premium.toFixed(2)}
        </div>
      )}
    </div>
  );
}
