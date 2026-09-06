import { APIRequestContext } from '@playwright/test';
import dotenv from 'dotenv';
dotenv.config();

export function getBackendUrl() {
  const port = process.env.PORT || '5008';
  return process.env.BACKEND_URL || `http://localhost:${port}`;
}

export async function createCustomerFixture(request: APIRequestContext, name?: string, email?: string) {
  const uniqueName = name || `Test Customer ${Date.now()}`;
  const uniqueEmail = email || `cust_${Date.now()}_${Math.floor(Math.random() * 10000)}@example.com`;
  const url = `${getBackendUrl()}/api/v1/customers`;

  const response = await request.post(url, {
    data: { name: uniqueName, email: uniqueEmail }
  });

  const body = await response.json();
  return { status: response.status(), data: body.data, body };
}

export async function createPolicyFixture(
  request: APIRequestContext,
  customerId: number,
  policyNumber?: string,
  premiumAmount: number = 10000,
  gstRate: number = 18.0
) {
  const polNum = policyNumber || `POL-PW-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  const url = `${getBackendUrl()}/api/v1/policies`;

  const response = await request.post(url, {
    data: {
      customer_id: customerId,
      policy_number: polNum,
      premium_amount: premiumAmount,
      gst_rate: gstRate
    }
  });

  const body = await response.json();
  return { status: response.status(), data: body.data, body };
}
