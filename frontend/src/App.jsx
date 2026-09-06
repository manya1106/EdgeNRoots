import React, { useState } from 'react';
import CustomerForm from './pages/CustomerForm';
import PolicyForm from './pages/PolicyForm';
import PaymentForm from './pages/PaymentForm';
import PolicyDetail from './pages/PolicyDetail';
import AuditDashboard from './pages/AuditDashboard';
import { UserPlus, FileText, CreditCard, Search, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('customers');
  const [selectedPolicyId, setSelectedPolicyId] = useState(null);

  return (
    <div className="container">
      {/* Header */}
      <header className="app-header">
        <div className="brand">
          <ShieldCheck size={28} />
          <div>
            <div>EdgeNRoots Insurance & Accounting</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
              Immutable Double-Entry Ledger Administration
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs">
          <button
            className={`nav-btn ${activeTab === 'customers' ? 'active' : ''}`}
            onClick={() => setActiveTab('customers')}
            data-testid="nav-customers"
          >
            <UserPlus size={16} /> Customers
          </button>
          <button
            className={`nav-btn ${activeTab === 'policies' ? 'active' : ''}`}
            onClick={() => setActiveTab('policies')}
            data-testid="nav-policies"
          >
            <FileText size={16} /> New Policy
          </button>
          <button
            className={`nav-btn ${activeTab === 'payments' ? 'active' : ''}`}
            onClick={() => setActiveTab('payments')}
            data-testid="nav-payments"
          >
            <CreditCard size={16} /> Payments
          </button>
          <button
            className={`nav-btn ${activeTab === 'detail' ? 'active' : ''}`}
            onClick={() => setActiveTab('detail')}
            data-testid="nav-detail"
          >
            <Search size={16} /> Policy Detail & Ledger
          </button>
          <button
            className={`nav-btn ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit')}
            data-testid="nav-audit"
          >
            <ShieldCheck size={16} /> Audit Dashboard
          </button>
        </nav>
      </header>

      {/* Main Content Area */}
      <main>
        {activeTab === 'customers' && <CustomerForm />}
        {activeTab === 'policies' && <PolicyForm />}
        {activeTab === 'payments' && <PaymentForm initialPolicyId={selectedPolicyId} />}
        {activeTab === 'detail' && <PolicyDetail initialPolicyId={selectedPolicyId} />}
        {activeTab === 'audit' && <AuditDashboard />}
      </main>
    </div>
  );
}
