import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import SuccessBanner from '../components/SuccessBanner';
import SummaryCard from '../components/SummaryCard';
import LedgerTable from '../components/LedgerTable';
import { Search, ShieldAlert, RotateCcw } from 'lucide-react';

export default function PolicyDetail({ initialPolicyId }) {
  const [policyIdInput, setPolicyIdInput] = useState(initialPolicyId || '1');
  const [policy, setPolicy] = useState(null);
  const [ledger, setLedger] = useState([]);
  const [summary, setSummary] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reversalMsg, setReversalMsg] = useState('');
  const [reversingPaymentId, setReversingPaymentId] = useState(null);

  useEffect(() => {
    if (initialPolicyId) {
      setPolicyIdInput(String(initialPolicyId));
      fetchPolicyDetails(initialPolicyId);
    } else {
      fetchPolicyDetails('1');
    }
  }, [initialPolicyId]);

  const fetchPolicyDetails = async (idToFetch) => {
    if (!idToFetch) return;
    setLoading(true);
    setError(null);
    setReversalMsg('');

    try {
      const [polData, ledgerData, summaryData] = await Promise.all([
        api.getPolicyById(idToFetch),
        api.getPolicyLedger(idToFetch),
        api.getPolicySummary(idToFetch)
      ]);

      setPolicy(polData);
      setLedger(ledgerData || []);
      setSummary(summaryData);
    } catch (err) {
      setPolicy(null);
      setLedger([]);
      setSummary(null);
      setError(err.message || `Policy #${idToFetch} not found`);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (policyIdInput) {
      fetchPolicyDetails(policyIdInput);
    }
  };

  const handleReversePayment = async (paymentId) => {
    if (!window.confirm(`Are you sure you want to reverse payment #${paymentId}? This will post an insert-only inverse ledger entry.`)) {
      return;
    }

    setReversingPaymentId(paymentId);
    setError(null);
    setReversalMsg('');

    try {
      const result = await api.reversePayment(paymentId, 'User requested reversal from Policy Detail UI');
      setReversalMsg(`Payment #${paymentId} successfully reversed! Reversal Entry #${result.reversal_payment_id} posted.`);
      fetchPolicyDetails(policy.id);
    } catch (err) {
      setError(err.message || 'Payment reversal failed');
    } finally {
      setReversingPaymentId(null);
    }
  };

  return (
    <div>
      {/* Lookup Bar */}
      <div className="card" style={{ padding: '1rem' }}>
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <input
              type="number"
              className="form-control"
              placeholder="Enter Policy ID (e.g. 1)"
              value={policyIdInput}
              onChange={(e) => setPolicyIdInput(e.target.value)}
              data-testid="policy-search-input"
            />
          </div>
          <button type="submit" className="btn btn-primary" data-testid="search-policy-button">
            <Search size={16} /> Inspect Policy & Ledger
          </button>
        </form>
      </div>

      {loading && (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          Loading policy details and double-entry ledger...
        </div>
      )}

      {error && (
        <div data-testid="policy-not-found">
          <ErrorBanner message={error} testId="policy-not-found-error" />
        </div>
      )}

      {reversalMsg && <SuccessBanner message={reversalMsg} testId="reversal-success-message" />}

      {policy && !loading && (
        <div data-testid="policy-detail-container">
          {/* Policy Header Card */}
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <span className="badge badge-active" data-testid="policy-header-status" style={{ marginBottom: '0.5rem' }}>
                  {policy.status}
                </span>
                <h2 style={{ fontSize: '1.4rem', fontWeight: 700 }} data-testid="policy-header-number">
                  Policy {policy.policy_number}
                </h2>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }} data-testid="policy-header-customer">
                  Policyholder: <strong>{policy.customer_name}</strong> ({policy.customer_email})
                </div>
              </div>

              <div style={{ textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Issued On</div>
                <div style={{ fontSize: '0.9rem' }}>{new Date(policy.created_at).toLocaleDateString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Dynamic Summary Card */}
          <SummaryCard summary={summary} />

          {/* Double-Entry Ledger Table */}
          <div className="card">
            <LedgerTable ledgerEntries={ledger} />
          </div>

          {/* Payment Actions & Reversals */}
          <div className="card">
            <h3 className="card-title">
              <RotateCcw size={18} /> Payment Reversals (Insert-Only Correction)
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Reversing a payment posts exact inverse double-entry rows (Credit Cash, Debit AR) and leaves original records untouched.
            </p>
            {ledger.filter(e => e.transaction_type === 'PAYMENT_RECEIVED').length === 0 ? (
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>No payments recorded on this policy yet.</div>
            ) : (
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {ledger
                  .filter(e => e.transaction_type === 'PAYMENT_RECEIVED' && e.account_code === 'CASH')
                  .map(entry => (
                    <button
                      key={entry.id}
                      className="btn btn-danger"
                      style={{ fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
                      onClick={() => handleReversePayment(entry.transaction_id)}
                      disabled={reversingPaymentId === entry.transaction_id}
                      data-testid={`reverse-payment-${entry.transaction_id}`}
                    >
                      Reverse Payment Transaction #{entry.transaction_id} (₹{Number(entry.debit).toFixed(2)})
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
