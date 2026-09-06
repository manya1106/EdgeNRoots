import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';
import { CreditCard } from 'lucide-react';

export default function PaymentForm({ initialPolicyId, onPaymentSubmitted }) {
  const [policyId, setPolicyId] = useState(initialPolicyId || '');
  const [summary, setSummary] = useState(null);
  const [amount, setAmount] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [fetchingSummary, setFetchingSummary] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (initialPolicyId) {
      setPolicyId(String(initialPolicyId));
    }
  }, [initialPolicyId]);

  useEffect(() => {
    if (policyId && String(policyId).trim() !== '') {
      fetchSummary(policyId);
    } else {
      setSummary(null);
    }
  }, [policyId]);

  const fetchSummary = async (pId) => {
    if (!pId) return;
    setFetchingSummary(true);
    setError(null);
    try {
      const data = await api.getPolicySummary(pId);
      setSummary(data);
    } catch (err) {
      setSummary(null);
      setError(err.message || 'Policy not found');
    } finally {
      setFetchingSummary(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg('');

    const numPolicyId = parseInt(policyId, 10);
    const numAmount = parseFloat(amount);

    if (!numPolicyId || isNaN(numPolicyId)) {
      setError('Please enter a valid Policy ID');
      return;
    }
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Payment amount must be greater than 0');
      return;
    }

    if (summary && numAmount > Number(summary.outstanding)) {
      setError(`Overpayment rejected: Amount (₹${numAmount.toFixed(2)}) exceeds remaining outstanding balance (₹${Number(summary.outstanding).toFixed(2)})`);
      return;
    }

    setLoading(true);
    try {
      const result = await api.processPayment({
        policy_id: numPolicyId,
        amount: numAmount
      });

      setSuccessMsg(`Payment of ₹${result.amount.toFixed(2)} recorded successfully! Remaining Outstanding: ₹${result.remaining_outstanding.toFixed(2)}`);
      setAmount('');
      fetchSummary(numPolicyId);

      if (onPaymentSubmitted) onPaymentSubmitted(result);
    } catch (err) {
      setError(err.message || 'Payment processing failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">
        <CreditCard size={20} /> Record Premium Payment
      </div>

      {error && <ErrorBanner message={error} testId="payment-error-message" />}
      {successMsg && <SuccessBanner message={successMsg} testId="payment-success-message" />}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="payment-policy-id">
            Policy ID *
          </label>
          <input
            id="payment-policy-id"
            type="number"
            className="form-control"
            placeholder="e.g. 1"
            value={policyId}
            onChange={(e) => setPolicyId(e.target.value)}
            data-testid="payment-policy-id-input"
            disabled={loading}
          />
        </div>

        {fetchingSummary && (
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
            Fetching current outstanding balance...
          </div>
        )}

        {summary && (
          <div
            style={{
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid var(--bg-card-border)',
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.25rem'
            }}
          >
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Policy #{summary.policy_id} ({summary.policy_number})
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem' }}>
              <span>Total Premium: ₹{Number(summary.total_premium).toFixed(2)}</span>
              <span>Paid So Far: ₹{Number(summary.total_paid).toFixed(2)}</span>
            </div>
            <div
              style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', fontWeight: 700 }}
            >
              Current Outstanding Balance:{' '}
              <span
                style={{ color: Number(summary.outstanding) > 0 ? 'var(--danger)' : 'var(--success)', fontFamily: 'var(--font-mono)' }}
                data-testid="outstanding-amount"
              >
                ₹{Number(summary.outstanding).toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="payment-amount">
            Payment Amount (₹) *
          </label>
          <input
            id="payment-amount"
            type="number"
            step="0.01"
            className="form-control"
            placeholder="e.g. 5000"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            data-testid="payment-amount-input"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          data-testid="submit-payment"
          disabled={loading}
        >
          {loading ? 'Processing Payment & Posting Cash Ledger...' : 'Submit Payment'}
        </button>
      </form>
    </div>
  );
}
