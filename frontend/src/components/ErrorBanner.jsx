import React from 'react';
import { AlertTriangle } from 'lucide-react';

export default function ErrorBanner({ message, details = null, testId = 'error-banner' }) {
  if (!message) return null;

  return (
    <div className="alert alert-danger" data-testid={testId} role="alert">
      <AlertTriangle size={18} />
      <div>
        <strong>{message}</strong>
        {details && Array.isArray(details) && details.length > 0 && (
          <ul style={{ marginTop: '0.25rem', paddingLeft: '1.25rem' }}>
            {details.map((item, idx) => (
              <li key={idx}>{item}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
