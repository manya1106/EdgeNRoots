import React from 'react';
import { CheckCircle2 } from 'lucide-react';

export default function SuccessBanner({ message, testId = 'success-banner' }) {
  if (!message) return null;

  return (
    <div className="alert alert-success" data-testid={testId} role="status">
      <CheckCircle2 size={18} />
      <span>{message}</span>
    </div>
  );
}
