import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import ErrorBanner from '../components/ErrorBanner';
import { ShieldCheck, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AuditDashboard() {
  const [auditData, setAuditData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    runAudit();
  }, []);

  const runAudit = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.validateAccounting();
      setAuditData(data);
    } catch (err) {
      setError(err.message || 'Audit validation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div className="card-title" style={{ margin: 0 }}>
          <ShieldCheck size={20} /> General Ledger Audit & Integrity Dashboard
        </div>
        <button
          className="btn btn-primary"
          style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
          onClick={runAudit}
          disabled={loading}
          data-testid="run-audit-button"
        >
          <RefreshCw size={14} className={loading ? 'spin' : ''} /> {loading ? 'Auditing...' : 'Run Audit Checks'}
        </button>
      </div>

      {error && <ErrorBanner message={error} testId="audit-error-message" />}

      {auditData && (
        <div>
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.5rem',
              marginBottom: '1.5rem',
              background: auditData.status === 'HEALTHY' ? 'var(--success-bg)' : 'var(--danger-bg)',
              border: auditData.status === 'HEALTHY' ? '1px solid rgba(52,211,153,0.3)' : '1px solid rgba(248,113,113,0.3)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1.1rem' }}>
              {auditData.status === 'HEALTHY' ? (
                <>
                  <CheckCircle2 color="var(--success)" size={22} /> SYSTEM HEALTHY — All 4 Double-Entry Integrity Checks Passed
                </>
              ) : (
                <>
                  <AlertTriangle color="var(--danger)" size={22} /> INTEGRITY ALERT — Ledger Imbalance or Data Corruption Detected
                </>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {/* Check 1 */}
            <div className="summary-box">
              <div className="summary-box-label">1. Balanced Transactions</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: auditData.checks.unbalanced_transactions.passed ? 'var(--success)' : 'var(--danger)' }}>
                {auditData.checks.unbalanced_transactions.passed ? '✓ All Balanced' : `✕ ${auditData.checks.unbalanced_transactions.failed_count} Unbalanced`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Asserts SUM(debit) == SUM(credit) per transaction.
              </div>
            </div>

            {/* Check 2 */}
            <div className="summary-box">
              <div className="summary-box-label">2. Zero Orphaned Entries</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: auditData.checks.orphaned_ledger_entries.passed ? 'var(--success)' : 'var(--danger)' }}>
                {auditData.checks.orphaned_ledger_entries.passed ? '✓ 0 Orphans' : `✕ ${auditData.checks.orphaned_ledger_entries.failed_count} Orphans`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Verifies all ledger rows link to valid parent transactions.
              </div>
            </div>

            {/* Check 3 */}
            <div className="summary-box">
              <div className="summary-box-label">3. Non-Negative Outstanding</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: auditData.checks.negative_outstanding_policies.passed ? 'var(--success)' : 'var(--danger)' }}>
                {auditData.checks.negative_outstanding_policies.passed ? '✓ No Overpaid Policies' : `✕ ${auditData.checks.negative_outstanding_policies.failed_count} Overpaid`}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                Verifies paid amount never exceeds total policy premium.
              </div>
            </div>

            {/* Check 4 */}
            <div className="summary-box">
              <div className="summary-box-label">4. Grand Trial Balance</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: auditData.checks.trial_balance.passed ? 'var(--success)' : 'var(--danger)' }}>
                {auditData.checks.trial_balance.passed ? '✓ Trial Balance Holds' : '✕ Imbalanced'}
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem', fontFamily: 'var(--font-mono)' }}>
                Debit: ₹{auditData.checks.trial_balance.total_debit.toFixed(2)} | Credit: ₹{auditData.checks.trial_balance.total_credit.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
