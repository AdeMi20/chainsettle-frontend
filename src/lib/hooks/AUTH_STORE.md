# Auth Store Documentation

## Overview

The `useAuthStore` is a Zustand-based global store that manages authentication state including the connected Stellar address, JWT token, user profile, and notification preferences.

## Location

```
src/lib/hooks/use-auth-store.ts
```

## Store State

### Core Fields

```typescript
interface AuthState {
  address: string | null;                    // Connected Stellar address
  token: string | null;                      // JWT authentication token
  expiresAt: number | null;                  // Token expiry (ms timestamp)
  user: User | null;                         // User profile from backend
  displayName: string | null;                // User's display name
  notificationPreferences: NotificationPreferences; // User notification settings
  isConnected: boolean;                      // Whether user is logged in
}
```

### NotificationPreferences

```typescript
interface NotificationPreferences {
  shipmentUpdates: boolean;      // Shipment status updates
  milestoneUpdates: boolean;     // Milestone progress notifications
  systemAlerts: boolean;         // System-level alerts
  desktopNotifications: boolean; // Browser desktop notifications
}
```

## Usage

### Reading State

```typescript
import { useAuthStore } from '@/lib/hooks/use-auth-store';

function MyComponent() {
  const address = useAuthStore((state) => state.address);
  const user = useAuthStore((state) => state.user);
  const isConnected = useAuthStore((state) => state.isConnected);

  if (!isConnected) return <div>Not logged in</div>;
  return <div>Welcome, {user?.name || address}</div>;
}
```

### Setting Authentication

```typescript
import { useAuthStore } from '@/lib/hooks/use-auth-store';

function LoginComponent() {
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleLogin = async (address: string, token: string, user: User) => {
    setAuth(address, token, user);
    // User is now authenticated
  };

  return <button onClick={handleLogin}>Sign In</button>;
}
```

## Store Actions

### `setAuth(address, token, user)`

Sets up complete authentication after successful login.

**Parameters:**
- `address`: Stellar account address (string)
- `token`: JWT access token (string)
- `user`: User profile object (User type)

**Side Effects:**
1. Stores token and address in localStorage
2. Decodes JWT to extract expiration time
3. Sets cookie for middleware
4. Loads stored display name and notification preferences
5. Sets `isConnected: true`

**Example:**
```typescript
const { setAuth } = useAuthStore();
const user = await loginApi.login(stellarAddress, signature);
setAuth(stellarAddress, user.accessToken, user.user);
```

### `setAddress(address)`

Sets the wallet address (used during Freighter connection).

**Parameters:**
- `address`: Stellar account address (string)

```typescript
const address = await connectFreighter();
useAuthStore.getState().setAddress(address);
```

### `setDisplayName(displayName)`

Sets or updates the user's display name.

**Parameters:**
- `displayName`: User's chosen display name (string, trimmed)

**Side Effects:**
- Stores in localStorage (address-scoped key)
- Trims whitespace
- Removes from storage if set to empty string

```typescript
useAuthStore.getState().setDisplayName('Alice');
// Stored as: chainsetttle_display_name_{address} = "Alice"
```

### `setNotificationPreferences(preferences)`

Updates notification settings.

**Parameters:**
- `preferences`: NotificationPreferences object

**Side Effects:**
- Stores in localStorage (address-scoped key)
- Persists across sessions

```typescript
useAuthStore.getState().setNotificationPreferences({
  shipmentUpdates: true,
  milestoneUpdates: false,
  systemAlerts: true,
  desktopNotifications: false,
});
```

### `logout()`

Clears all authentication state and local storage.

**Side Effects:**
1. Removes localStorage tokens and address
2. Clears authentication cookies
3. Resets all state to null/defaults

```typescript
useAuthStore.getState().logout();
// User is now logged out
```

### `rehydrate()`

Recovers session state from localStorage (called on app load).

**Side Effects:**
1. Checks localStorage for existing token
2. Validates token hasn't expired
3. If valid, restores auth state
4. If expired, clears storage

```typescript
useEffect(() => {
  useAuthStore.getState().rehydrate();
}, []);
```

## Token Management

### Token Expiry

The store automatically extracts expiration from JWT:

```typescript
const expiresAt = getTokenExpiry(token); // Returns ms timestamp or null
```

**Usage for session timeout:**
```typescript
const expiresAt = useAuthStore((state) => state.expiresAt);
const isExpired = isExpired(expiresAt);
if (isExpired) {
  // Show warning or logout
}
```

### Token Storage

Tokens are stored in multiple places for different purposes:

| Storage | Key | Purpose | Scope |
|---------|-----|---------|-------|
| localStorage | `chainsetttle_token` | Client-side auth | Global |
| localStorage | `chainsetttle_address` | Remember address | Global |
| Cookie | `chainsetttle_token` | Server-side auth | Server middleware |

**Cookie Configuration:**
- Path: `/` (all routes)
- Max-Age: Matches token expiry
- SameSite: Lax (protects against CSRF)

## LocalStorage Keys

| Key | Value | Usage |
|-----|-------|-------|
| `chainsetttle_token` | JWT token string | Authentication |
| `chainsetttle_address` | Stellar address | Reconnect on page reload |
| `chainsetttle_display_name_{address}` | User's display name | Personalization |
| `chainsetttle_notification_preferences_{address}` | JSON preferences | Notification settings |

**Note:** Address-scoped keys allow different settings per wallet.

## Subscription Pattern

Using Zustand's selector for performance:

```typescript
// ❌ Subscribes to ALL state changes
const store = useAuthStore();
const address = store.address;

// ✅ Only subscribes to address changes
const address = useAuthStore((state) => state.address);

// ✅ Multiple selectors, stable identity
const { address, user } = useAuthStore((state) => ({
  address: state.address,
  user: state.user,
}));
```

## Default Notification Preferences

```typescript
export const defaultNotificationPreferences: NotificationPreferences = {
  shipmentUpdates: true,       // On by default
  milestoneUpdates: true,      // On by default
  systemAlerts: true,          // On by default
  desktopNotifications: false, // Off by default (requires permission)
};
```

## Session Lifecycle

### Login Flow

```
1. User clicks "Sign In"
2. connectFreighter() gets address
3. setAddress() updates store
4. signAndLogin() gets JWT + user
5. setAuth() persists everything
6. User is now isConnected: true
```

### Page Reload

```
1. App mounts
2. rehydrate() checks localStorage
3. If token exists and not expired:
   - Restore auth state
   - User is reconnected
4. If token expired:
   - Clear localStorage
   - User must log in again
```

### Logout Flow

```
1. User clicks "Sign Out"
2. logout() clears state
3. All stored data removed
4. User is now isConnected: false
```

## Best Practices

### 1. Use Selectors for Performance

```typescript
// Avoid re-renders when unrelated state changes
const displayName = useAuthStore((state) => state.displayName);
```

### 2. Access Store Outside Components

```typescript
// In async handlers or non-component code
const state = useAuthStore.getState();
const { address, token } = state;
```

### 3. Handle Null States

```typescript
const address = useAuthStore((state) => state.address);
if (!address) {
  // User not connected
  return <LoginPrompt />;
}
```

### 4. Respect Privacy

```typescript
// Don't log tokens or sensitive data
console.log(useAuthStore.getState()); // ❌ Exposes token
console.log(useAuthStore.getState().address); // ✅ Safe
```

## Related Files

- `src/lib/auth/jwt.ts` — Token decoding and expiry
- `src/lib/stellar/freighter.ts` — Wallet connection
- `src/lib/api/services.ts` — Backend API calls (uses token)
- `src/components/auth/SessionTimeoutModal.tsx` — Uses expiresAt
- `src/app/providers.tsx` — Rehydrates store on mount

## Troubleshooting

### "User is not connected but isConnected is false"

Check if `rehydrate()` is called on app mount:

```typescript
useEffect(() => {
  useAuthStore.getState().rehydrate();
}, []);
```

### Token not persisted across page reloads

1. Check that localStorage is enabled
2. Verify token is being set via `setAuth()`
3. Check browser console for errors

### Display name not saving

Display names are address-scoped. Verify:
1. Address exists: `useAuthStore.getState().address`
2. Display name is non-empty after trim
3. localStorage quota not exceeded

### Notification preferences reset

Preferences are address-scoped and stored as JSON. Check:
1. Address hasn't changed
2. localStorage not being cleared by other code
3. JSON.parse not throwing errors
