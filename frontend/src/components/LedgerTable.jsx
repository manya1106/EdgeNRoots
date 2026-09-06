import React from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function LedgerTable({ ledgerEntries = [] }) {
  const totalDebit = ledgerEntries.reduce((sum, entry) => sum + Number(entry.debit || 0), 0);
  const totalCredit = ledgerEntries.reduce((sum, entry) => sum + Number(entry.credit || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  return (
    <div className="table-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Double-Entry Journal & Ledger Entries</h3>
        {isBalanced ? (
          <span className="badge badge-balanced" data-testid="ledger-balanced-indicator">
            <CheckCircle2 size={14} style={{ marginRight: '4px' }} /> Balanced ✓ (₹{totalDebit.toFixed(2)})
          </span>
        ) : (
          <span className="badge badge-danger" data-testid="ledger-unbalanced-indicator">
            <AlertCircle size={14} style={{ marginRight: '4px' }} /> Imbalance Detected!
          </span>
        )}
      </div>

      <table className="table" data-testid="ledger-table">
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Transaction Type</th>
            <th>Account Name</th>
            <th>Account Type</th>
            <th>Debit (₹)</th>
            <th>Credit (₹)</th>
          </tr>
        </thead>
        <tbody>
          {ledgerEntries.length === 0 ? (
            <tr>
              <td colSpan="6" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1.5rem' }}>
                No ledger entries recorded yet.
              </td>
            </tr>
          ) : (
            ledgerEntries.map((entry) => (
              <tr key={entry.id} data-testid="ledger-row">
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {new Date(entry.created_at).toLocaleString('en-IN')}
                </td>
                <td>
                  <span className="badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-main)' }}>
                    {entry.transaction_type}
                  </span>
                </td>
                <td>
                  <strong>{entry.account_name}</strong> ({entry.account_code})
                </td>
                <td>
                  <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: 'var(--primary)' }}>
                    {entry.account_type}
                  </span>
                </td>
                <td className="amount-debit">
                  {Number(entry.debit) > 0 ? `₹${Number(entry.debit).toFixed(2)}` : '-'}
                </td>
                <td className="amount-credit">
                  {Number(entry.credit) > 0 ? `₹${Number(entry.credit).toFixed(2)}` : '-'}
                </td>
              </tr>
            ))
          )}
        </tbody>
        <tfoot>
          <tr style={{ background: 'rgba(15, 23, 42, 0.95)', fontWeight: 700 }}>
            <td colSpan="4" style={{ textAlign: 'right', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Grand Total:
            </td>
            <td className="amount-debit" data-testid="ledger-total-debit">
              ₹{totalDebit.toFixed(2)}
            </td>
            <td className="amount-credit" data-testid="ledger-total-credit">
              ₹{totalCredit.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
