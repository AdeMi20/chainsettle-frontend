# Middleware and Content Security Policy

## Overview

ChainSettle uses Next.js middleware to enforce authentication, generate per-request Content Security Policy (CSP) headers, and protect against common web vulnerabilities.

## Location

```
src/middleware.ts
```

## What It Does

1. **Authentication**: Checks for JWT token and redirects unauthenticated users to login
2. **CSP Headers**: Generates and applies a strict Content Security Policy on every response
3. **Nonce Generation**: Creates a cryptographic nonce for inline script execution
4. **Static Asset Bypass**: Excludes static files from auth checks for performance

## Middleware Execution

The middleware is configured to run on all routes:

```typescript
export const config = {
  matcher: ['/:path*'],
};
```

This means it executes for every incoming request, with exceptions for static files.

## Authentication Flow

### Public Paths

Certain paths bypass authentication checks:

```typescript
const PUBLIC_PATHS = ['/auth/login'];
```

These are:
- `/auth/login` — Login page (users need to access it to sign in)
- Static assets like `/_next/`, `/public/`, favicons, etc.

### Token Detection

The middleware checks for a JWT token in this order:

```typescript
const token = request.cookies.get('chainsetttle_token')?.value;
```

**Current implementation**: Token is read from cookies (this is for future support; tokens are currently stored in `localStorage`).

### Protected Routes

If a user accesses a protected route without a token:

1. Middleware redirects to `/auth/login`
2. The `callbackUrl` query param stores the original path
3. After successful login, user is redirected back to their original page

**Example:**

```
User visits: /dashboard/shipments/123
No token found
Redirect to: /auth/login?callbackUrl=%2Fdashboard%2Fshipments%2F123
User logs in
Redirect to: /dashboard/shipments/123
```

### Static Asset Bypass

The middleware checks if a path is a static asset:

```typescript
const isStaticAsset =
  pathname.startsWith('/_next/') ||    // Next.js generated files
  pathname.startsWith('/public/') ||   // Public directory
  pathname.includes('favicon') ||      // Favicon requests
  /\.[^/]+$/.test(pathname);           // Any file with an extension
```

Static assets bypass auth checks, improving performance by avoiding unnecessary auth logic for CSS, JS, images, etc.

## Content Security Policy (CSP)

### What is CSP?

A CSP is a browser security mechanism that prevents:
- **Inline scripts** (unless allowed by nonce or hash)
- **External scripts** from unauthorized origins
- **Unsafe operations** like `eval()` or inline event handlers
- **Data exfiltration** to third-party domains

### How ChainSettle Uses CSP

The middleware generates a strict policy that:

1. **Blocks all inline scripts** unless they carry a matching nonce
2. **Allows only same-origin scripts** (the frontend itself)
3. **Restricts style sources** to same-origin and Google Fonts
4. **Restricts connections** to known backends (API, RPC, Horizon)
5. **Blocks form submission** to external sites
6. **Prevents framing** by external sites (X-Frame-Options equivalent)

### Nonce Generation

A new cryptographic nonce is generated per request:

```typescript
const nonce = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))));
```

This:
1. Generates 16 random bytes
2. Converts to base64 for CSP header format
3. Is included in the CSP header
4. Must be attached to inline scripts to allow execution

### CSP Header Content

```
default-src 'self'
  — Only load from same origin by default

script-src 'self' 'nonce-{NONCE}'
  — Allow same-origin scripts + inline scripts with matching nonce

style-src 'self' 'unsafe-inline' https://fonts.googleapis.com
  — Allow inline styles (for dynamic content), same-origin, and Google Fonts
  — 'unsafe-inline' is necessary because milestones use dynamic style attributes
  — Note: This is a known CSP exception; inline critical styles are always marked 'unsafe-inline'

font-src 'self' https://fonts.gstatic.com
  — Allow fonts from same-origin and Google Font CDN

connect-src 'self' {API_ORIGIN} {RPC_ORIGIN} {HORIZON_ORIGIN}
  — Allow API calls to backend, Stellar RPC, and Horizon

img-src 'self' data: {IPFS_ORIGIN}
  — Allow images from same-origin, data URIs, and IPFS gateway

object-src 'none'
  — Block <object>, <embed>, <applet> tags

base-uri 'self'
  — Only allow <base> tags to same-origin

form-action 'self'
  — Only allow form submissions to same-origin

frame-ancestors 'none'
  — Prevent framing by external sites
```

### Dynamic Origin Construction

The middleware dynamically constructs allowed origins from environment variables:

```typescript
const apiOrigin = new URL(process.env.NEXT_PUBLIC_API_URL ?? '...').origin;
const rpcOrigin = new URL(process.env.NEXT_PUBLIC_STELLAR_RPC_URL!).origin;
const horizonOrigin = new URL(process.env.NEXT_PUBLIC_HORIZON_URL ?? '...').origin;
const ipfsOrigin = new URL(process.env.NEXT_PUBLIC_IPFS_GATEWAY ?? '...').origin;
```

This ensures the CSP always lists the correct backends for the current deployment without hardcoding URLs.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | No | Backend API base URL (defaults to `http://localhost:3000/api/v1`) |
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Yes | Soroban RPC endpoint |
| `NEXT_PUBLIC_STELLAR_NETWORK` | No | `testnet` or `mainnet` (defaults to `testnet`) |
| `NEXT_PUBLIC_HORIZON_URL` | No | Horizon endpoint (auto-selected based on network) |
| `NEXT_PUBLIC_IPFS_GATEWAY` | No | IPFS gateway URL (defaults to `https://ipfs.io/ipfs/`) |

## Using Nonce in Components

To include an inline script that respects CSP, attach the nonce from the response header.

**In the layout root:**

```typescript
// src/app/layout.tsx
import { headers } from 'next/headers';

export default async function RootLayout({ children }) {
  const headersList = await headers();
  const nonce = headersList.get('x-nonce');
  
  return (
    <html>
      <head>
        {/* Inline critical styles with nonce */}
        <style nonce={nonce}>
          /* Critical CSS here */
        </style>
      </head>
      <body>{children}</body>
    </html>
  );
}
```

**For inline scripts:**

```tsx
<script nonce={nonce}>
  {`
    // JavaScript that needs to run before React hydrates
    console.log('Inline script executed');
  `}
</script>
```

## Adding External Services

When you need to allow an external service (CDN, analytics, tracking pixel), add its origin to the narrowest CSP directive:

**Example: Adding Google Analytics**

1. Identify what resource type (script, tracking pixel, etc.)
2. Add origin to corresponding directive
3. Document why it's needed

```typescript
// In middleware.ts, add analytics origin
const analyticsOrigin = 'https://www.google-analytics.com';

return [
  // ... other directives
  `connect-src 'self' ${apiOrigin} ${analyticsOrigin}`,  // For analytics
  `script-src 'self' 'nonce-${nonce}' ${analyticsOrigin}`,  // For GA script
].join('; ');
```

**Never use `'unsafe-inline'` for scripts.** This defeats CSP's main purpose and should only be used as a last resort for `style-src` when truly unavoidable.

## Debugging CSP Violations

### Check Browser Console

Browser DevTools (F12 → Console) will show CSP violations:

```
Refused to load the script 'https://evil.com/steal.js' because it violates 
the following Content Security Policy directive: "script-src 'self' 'nonce-...'"
```

### Common Violations

| Message | Cause | Fix |
|---------|-------|-----|
| "Refused to execute inline script" | Inline script without nonce | Add nonce attribute |
| "Refused to load script from ... (not matching nonce)" | Nonce mismatch | Ensure nonce is current |
| "Refused to connect to ..." | Origin not in CSP | Add origin to `connect-src` |
| "Refused to load font from ..." | Font origin not allowed | Add to `font-src` |

### View CSP Header

In browser DevTools (Network tab):

1. Click any request
2. Go to "Response Headers"
3. Look for `Content-Security-Policy` header

## Security Considerations

### Why strict CSP?

A strict CSP prevents:
- **Stored XSS attacks**: Even if HTML is injected, scripts can't execute without a valid nonce
- **Reflected XSS attacks**: Inline event handlers (`onclick=...`) are blocked
- **Clickjacking**: Frame-ancestors prevents embedding in malicious frames
- **Data exfiltration**: Connections are limited to known backends

### Nonce Security

- **New nonce per request**: The nonce is regenerated for every HTTP response, so old nonces are invalid
- **Cryptographically random**: Uses `crypto.getRandomValues()` for strong randomness
- **Never reused**: Each request gets a unique nonce; requests cannot share nonces

### Limitations

- **CSP is a defense-in-depth layer**: It doesn't prevent SQL injection, CSRF, or other backend vulnerabilities
- **Must be paired with other security**: Validating input, HTTPS-only transport, secure headers (HSTS, etc.)

## Troubleshooting

### "CSP blocked my legitimate external resource"

1. Identify the resource type (script, image, font, etc.)
2. Get its origin (domain)
3. Add origin to appropriate directive in middleware
4. Test that resource loads
5. Document why it's needed in a comment

### "Authentication doesn't work for static files"

This is intentional. Static files (`_next/`, `favicon.ico`, etc.) bypass auth to avoid unnecessary overhead. If you have truly private static files, serve them through a protected API route instead.

### "Inline styles aren't working"

If you're using inline `style` attributes, ensure you have `'unsafe-inline'` in `style-src` (it's currently enabled). For better CSP compliance, consider extracting critical styles to `<style>` tags and moving dynamic styles to CSS modules.

## Related Files

- `src/middleware.ts` — CSP and auth middleware implementation
- `src/app/layout.tsx` — Root layout (passes nonce to children)
- `next.config.js` — Next.js configuration
- `.env.example` — Environment variable template

## References

- [MDN: Content-Security-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy)
- [CSP Level 3 Spec](https://www.w3.org/TR/CSP3/)
- [Next.js Middleware Guide](https://nextjs.org/docs/advanced-features/middleware)
- [OWASP: Content Security Policy](https://owasp.org/www-community/attacks/xss/#content-security-policy)
