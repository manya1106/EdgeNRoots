const backendPort = import.meta.env.VITE_BACKEND_PORT || '5008';
const BASE_URL = import.meta.env.VITE_BACKEND_URL || '/api/v1';

/**
 * Normalizes HTTP fetch calls and API responses
 */
async function request(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    const contentType = response.headers.get('content-type');
    let data;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      data = { success: false, error: { message: text || 'Non-JSON server response' } };
    }

    if (!response.ok || !data.success) {
      let errorMessage = data?.error?.message || data?.message;

      // Sanitize 500 / technical error messages for UI safety
      if (response.status >= 500 || (errorMessage && (errorMessage.includes('at Object.') || errorMessage.includes('mysql') || errorMessage.includes('.js')))) {
        errorMessage = 'An unexpected server error occurred. Please try again later.';
      }

      const errorDetails = data?.error?.details || null;
      
      const err = new Error(errorMessage || 'An error occurred');
      err.status = response.status;
      err.details = errorDetails;
      err.data = data;
      throw err;
    }

    return data.data;
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      const netError = new Error("Couldn't reach the server. Please check your network connection.");
      netError.status = 0;
      throw netError;
    }
    throw error;
  }
}

export const api = {
  // Customer APIs
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  getCustomers: () => request('/customers'),
  getCustomerById: (id) => request(`/customers/${id}`),

  // Policy APIs
  createPolicy: (data) => request('/policies', { method: 'POST', body: JSON.stringify(data) }),
  getPolicyById: (id) => request(`/policies/${id}`),
  getPolicyLedger: (id) => request(`/policies/${id}/ledger`),
  getPolicySummary: (id) => request(`/policies/${id}/summary`),

  // Payment APIs
  processPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),
  reversePayment: (id, reason) => request(`/payments/${id}/reversal`, { method: 'POST', body: JSON.stringify({ reason }) }),
  getPaymentById: (id) => request(`/payments/${id}`),

  // Audit Validation APIs
  validateAccounting: () => request('/accounting/validate')
};
