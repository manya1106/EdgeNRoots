import React from 'react';
import { DollarSign, ShieldCheck, CreditCard } from 'lucide-react';

export default function SummaryCard({ summary }) {
  if (!summary) return null;

  const totalPremium = Number(summary.total_premium || 0);
  const totalPaid = Number(summary.total_paid || 0);
  const outstanding = Number(summary.outstanding || 0);

  return (
    <div className="summary-grid" data-testid="summary-card">
      <div className="summary-box">
        <div className="summary-box-label flex items-center gap-1">
          <ShieldCheck size={16} /> Total Premium
        </div>
        <div className="summary-box-value" data-testid="summary-total-premium">
          ₹{totalPremium.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div className="summary-box">
        <div className="summary-box-label flex items-center gap-1">
          <CreditCard size={16} /> Total Paid
        </div>
        <div className="summary-box-value value-success" data-testid="summary-total-paid">
          ₹{totalPaid.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>

      <div className="summary-box">
        <div className="summary-box-label flex items-center gap-1">
          <DollarSign size={16} /> Remaining Outstanding
        </div>
        <div
          className={`summary-box-value ${outstanding > 0 ? 'value-danger' : 'value-success'}`}
          data-testid="summary-outstanding"
        >
          ₹{outstanding.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
        </div>
      </div>
    </div>
  );
}
