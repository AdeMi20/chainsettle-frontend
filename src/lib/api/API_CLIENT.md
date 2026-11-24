# API Client Configuration

## Overview

The `apiClient` is a pre-configured [Axios](https://axios-http.com/) HTTP client that handles all communication with the ChainSettle backend REST API. It provides:

- Automatic JWT token attachment to every request
- Request and response interceptors for authentication flow
- Error handling with session expiry detection
- Centralized timeout and base URL configuration

## Location

```
src/lib/api/client.ts
```

## Configuration

```typescript
import { apiClient } from '@/lib/api/client';

// Use directly in async functions
const shipments = await apiClient.get('/shipments');
const created = await apiClient.post('/shipments', payload);
const updated = await apiClient.patch('/notifications/123/read');
```

### Base URL

The base URL is derived from the `NEXT_PUBLIC_API_URL` environment variable:

```bash
NEXT_PUBLIC_API_URL=https://api.chainsetttle.example.com/v1
```

If not set, defaults to `http://localhost:3000/api/v1` for local development.

### Timeout

All requests timeout after **15 seconds** (15,000 ms). This prevents indefinite hangs on slow or unresponsive backends.

### Headers

Default request headers:

```
Content-Type: application/json
```

## Request Interceptor

### JWT Token Attachment

Every outgoing request automatically includes the JWT token from `localStorage`:

```typescript
// Before interception
GET /shipments

// After interception
GET /shipments
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**How it works:**

1. Interceptor checks for `chainsetttle_token` in browser localStorage
2. If found, sets `Authorization: Bearer <token>` header
3. If not found, request proceeds without token (some endpoints don't require auth)

**Security note:** The token is only attached in the browser (checks `typeof window !== 'undefined'`), so it's never transmitted by server-side code.

## Response Interceptor

### Session Expiry Detection

The response interceptor monitors for 401 Unauthorized responses and distinguishes between two cases:

**Case 1: Authentication flow endpoint**

Paths: `/auth/nonce`, `/auth/login`

A 401 here means the nonce signature or login attempt failed. This is a **validation error**, not a session expiry, so the response is passed through unchanged for the UI to handle.

**Case 2: Protected resource endpoint**

All other endpoints require a valid JWT. A 401 here means the token is expired or invalid. The interceptor:

1. Calls `endSession('expired')` to clear stored auth state
2. Redirects the user to `/auth/login?callbackUrl=<current-page>`
3. User logs in again and returns to their original page

### De-duplication

The 401 handler is de-duplicated — it fires at most once per 401 response, even if multiple requests hit 401 simultaneously. This prevents multiple redirects or duplicate cleanup.

## Error Handling

Errors thrown by requests include:

```typescript
interface AxiosError {
  config: AxiosRequestConfig;    // Request config
  code?: string;                 // Network error code
  response?: AxiosResponse;       // Response data (if any)
  status?: number;               // HTTP status code
  statusText?: string;           // e.g. "Unauthorized"
  message: string;               // Error message
  isAxiosError: true;
}
```

### Common Error Codes

| Status | Meaning | Handling |
|--------|---------|----------|
| 400 | Bad Request | Validation error; display error message from response |
| 401 | Unauthorized | Token expired; redirects to login (see interceptor) |
| 403 | Forbidden | User lacks permission; display error message |
| 404 | Not Found | Resource does not exist; handle gracefully |
| 500+ | Server Error | Backend failure; show generic error message |
| Network | No connection | Show offline message or retry |

### Catching Errors

```typescript
import { apiClient } from '@/lib/api/client';

try {
  const data = await apiClient.get('/shipments');
} catch (error) {
  if (error.response?.status === 404) {
    console.log('Shipment not found');
  } else if (error.response?.status === 403) {
    console.log('Not authorized to access this shipment');
  } else if (error.code === 'ECONNABORTED') {
    console.log('Request timeout');
  } else {
    console.error('Unexpected error:', error.message);
  }
}
```

## Service Layer

API client calls are wrapped by **service functions** in `src/lib/api/services.ts` that:

- Handle response deserialization
- Extract payload from API response envelope
- Provide strongly typed return values
- Centralize endpoint URLs and HTTP methods

**Example:**

```typescript
// Raw apiClient call
const response = await apiClient.get('/shipments');
const shipments = response.data.data;

// Service function
import { shipmentsApi } from '@/lib/api/services';
const shipments = await shipmentsApi.list();  // Type-safe, envelope unwrapped
```

See `API_SERVICES.md` or `src/lib/api/services.ts` for all available service functions.

## Usage in Components

### Server Components

The API client is not available in server components (which don't have access to browser `localStorage` or `window`). For server-side API calls, use Node's `fetch` or axios directly with an explicit token:

```typescript
// src/app/dashboard/page.tsx (Server Component)
import { headers } from 'next/headers';

export default async function DashboardPage() {
  const headersList = await headers();
  const token = headersList.get('authorization');
  const response = await fetch('https://api.example.com/shipments', {
    headers: { Authorization: token || '' },
  });
  // ...
}
```

### Client Components

Use the API client in async functions or effects:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api/client';

export function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiClient
      .get('/shipments')
      .then((response) => setShipments(response.data.data))
      .catch((error) => setError(error.message));
  }, []);

  if (error) return <div>Error: {error}</div>;
  return <ul>{/* render shipments */}</ul>;
}
```

### With the Service Layer

```typescript
'use client';

import { useEffect, useState } from 'react';
import { shipmentsApi } from '@/lib/api/services';

export function ShipmentList() {
  const [shipments, setShipments] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    shipmentsApi
      .list()
      .then(setShipments)
      .catch((error) => setError(error.message));
  }, []);

  if (error) return <div>Error: {error}</div>;
  return <ul>{/* render shipments */}</ul>;
}
```

## Testing with mocked responses

To test code that uses the API client without a real backend, mock `apiClient` in your test setup:

```typescript
import { apiClient } from '@/lib/api/client';
import { mock } from 'node:test';

mock.module('@/lib/api/client', () => ({
  apiClient: {
    get: mock.fn().mockResolvedValue({
      data: {
        data: { id: '123', name: 'Test Shipment' },
      },
    }),
  },
}));
```

## Token Storage

The JWT token is stored in `localStorage` with the key `chainsetttle_token`:

```typescript
// Store token after login
localStorage.setItem('chainsetttle_token', accessToken);

// Retrieve token (done automatically by interceptor)
const token = localStorage.getItem('chainsetttle_token');

// Clear token on logout
localStorage.removeItem('chainsetttle_token');
```

**Security considerations:**

- `localStorage` is accessible to any JavaScript on the same domain
- Never store sensitive data (passwords, private keys) in `localStorage`
- The JWT is HttpOnly-compatible only if the backend sets it; this implementation uses `localStorage` for simplicity
- For production, consider using HttpOnly cookies for the token and a CSRF token mechanism

## Customizing Requests

### Add Custom Headers

```typescript
const response = await apiClient.get('/shipments', {
  headers: { 'X-Custom-Header': 'value' },
});
```

### Pass Query Parameters

```typescript
await apiClient.get('/shipments', {
  params: { status: 'active', page: 1 },
});
// Requests: GET /shipments?status=active&page=1
```

### Send Form Data

```typescript
import FormData from 'form-data';

const form = new FormData();
form.append('file', file);
form.append('shipmentId', shipmentId);

await apiClient.post('/uploads', form, {
  headers: form.getHeaders(),
});
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API base URL. Defaults to `http://localhost:3000/api/v1`. |

## Related Files

- `src/lib/api/services.ts` — Service functions wrapping apiClient
- `src/lib/auth/session.ts` — `endSession()` function called on 401
- `src/middleware.ts` — CSP and auth middleware for Next.js
- `.env.example` — Environment variable template

## Troubleshooting

### "Cannot find module" error

Ensure `@/lib/api/client` is correct. The `@` alias is configured in `tsconfig.json` to point to `src/`.

### Token not being sent

1. Verify the token is stored in localStorage: `localStorage.getItem('chainsetttle_token')`
2. Check that the request is made in a browser context (not SSR)
3. Inspect the Network tab to see the Authorization header

### Infinite redirect loop on 401

This can occur if the backend returns 401 on the login endpoint itself. The interceptor detects auth flow paths and skips the redirect, but verify that `/auth/login` is in `AUTH_FLOW_PATHS`.

### Timeout errors

If requests timeout frequently:

1. Check backend availability: `curl <NEXT_PUBLIC_API_URL>/health`
2. Increase timeout: modify `timeout` in client.ts (not recommended; fix slow endpoints instead)
3. Check network conditions: 15s is the standard; most requests should complete in <5s
