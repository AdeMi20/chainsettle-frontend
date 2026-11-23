# usePolling Hook Documentation

## Overview

The `usePolling` hook provides a reusable pattern for periodically fetching data from the backend. It handles loading states, error handling, and automatic interval management.

## Location

```
src/lib/hooks/use-polling.ts
```

## Purpose

The `usePolling` hook is used to:

- Periodically fetch fresh data from the backend API
- Track loading and error states during polling
- Automatically clean up intervals on component unmount
- Support manual refresh triggers
- Synchronize multiple data sources on the same interval

## Hook Signature

```typescript
interface UsePollingOptions {
  interval?: number; // milliseconds between polls (default: 15000)
  enabled?: boolean; // whether to start polling immediately (default: true)
  onError?: (error: Error) => void; // error callback
  onSuccess?: (data: T) => void; // success callback
}

function usePolling<T>(
  fetcher: () => Promise<T>,
  options?: UsePollingOptions
): {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  setInterval: (ms: number) => void;
  stop: () => void;
  start: () => void;
};
```

## Usage Examples

### Basic Polling

Poll shipment data every 15 seconds:

```typescript
'use client';

import { usePolling } from '@/lib/hooks/use-polling';
import { shipmentsApi } from '@/lib/api/services';

export function ShipmentList() {
  const { data: shipments, isLoading, error, refresh } = usePolling(
    () => shipmentsApi.list(),
    { interval: 15000 }
  );

  if (isLoading) return <div>Loading shipments...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <button onClick={refresh}>Refresh now</button>
      {/* render shipments */}
    </div>
  );
}
```

### Conditional Polling

Only poll when a shipment is selected:

```typescript
const { data: shipment } = usePolling(
  () => shipmentsApi.get(selectedShipmentId),
  {
    enabled: !!selectedShipmentId, // Only poll if ID is set
    interval: 10000,
  }
);
```

### Custom Error Handling

```typescript
const { data, error } = usePolling(
  () => shipmentsApi.list(),
  {
    interval: 20000,
    onError: (error) => {
      console.error('Poll failed:', error);
      // Send to error tracking service, show toast, etc.
    },
    onSuccess: (data) => {
      console.log('Poll succeeded, data:', data);
    },
  }
);
```

### Combining Multiple Polls

```typescript
export function Dashboard() {
  // Poll shipments every 15s
  const shipments = usePolling(
    () => shipmentsApi.list(),
    { interval: 15000 }
  );

  // Poll notifications every 10s
  const notifications = usePolling(
    () => notificationsApi.list(),
    { interval: 10000 }
  );

  // Both run independently but can be synchronized manually
  const handleRefreshAll = () => {
    shipments.refresh();
    notifications.refresh();
  };

  return (
    <div>
      <button onClick={handleRefreshAll}>Refresh All</button>
      {/* render both */}
    </div>
  );
}
```

### Pausing and Resuming

```typescript
export function LiveShipmentStatus({ shipmentId }) {
  const { data, start, stop, setInterval } = usePolling(
    () => shipmentsApi.get(shipmentId),
    { enabled: true, interval: 5000 }
  );

  const handlePause = () => stop();
  const handleResume = () => start();

  return (
    <div>
      <button onClick={handlePause}>Pause</button>
      <button onClick={handleResume}>Resume</button>
      <p>Status: {data?.status}</p>
    </div>
  );
}
```

## Options

### `interval`

- **Type**: `number` (milliseconds)
- **Default**: `15000` (15 seconds)
- **Description**: Time between polls

**Example:**
```typescript
usePolling(fetcher, { interval: 5000 }); // Poll every 5 seconds
```

### `enabled`

- **Type**: `boolean`
- **Default**: `true`
- **Description**: Whether to start polling immediately

**Use cases:**
- Disable polling until a condition is met
- Pause polling when user navigates away
- Delay polling until required data is available

**Example:**
```typescript
const { data } = usePolling(
  () => shipmentsApi.get(shipmentId),
  { enabled: !!shipmentId } // Only poll if shipmentId is set
);
```

### `onError`

- **Type**: `(error: Error) => void`
- **Default**: `undefined`
- **Description**: Callback fired when fetcher throws or rejects

**Example:**
```typescript
usePolling(fetcher, {
  onError: (error) => {
    if (error.response?.status === 401) {
      // Session expired
      redirectToLogin();
    } else {
      showErrorToast(error.message);
    }
  },
});
```

### `onSuccess`

- **Type**: `(data: T) => void`
- **Default**: `undefined`
- **Description**: Callback fired when fetcher succeeds

**Example:**
```typescript
usePolling(fetcher, {
  onSuccess: (data) => {
    // Update derived state, trigger analytics, etc.
    trackDataUpdate(data);
  },
});
```

## Return Value

### `data`

- **Type**: `T | undefined`
- **Initial**: `undefined`
- **Description**: The latest data returned by fetcher

```typescript
const { data } = usePolling(() => shipmentsApi.list());
console.log(data); // Array of shipments
```

### `isLoading`

- **Type**: `boolean`
- **Initial**: `true` (unless `enabled: false`)
- **Description**: Whether a fetch is currently in progress

```typescript
if (isLoading) return <Skeleton />;
```

### `error`

- **Type**: `Error | null`
- **Initial**: `null`
- **Description**: The latest error, if any

```typescript
if (error) return <div>Error: {error.message}</div>;
```

### `refresh()`

- **Type**: `() => Promise<void>`
- **Description**: Manually trigger a fetch immediately

```typescript
const handleManualRefresh = async () => {
  await refresh();
  showToast('Data refreshed');
};
```

### `setInterval(ms)`

- **Type**: `(ms: number) => void`
- **Description**: Change the polling interval dynamically

```typescript
const handleChangeFrequency = (newIntervalMs) => {
  setInterval(newIntervalMs);
};
```

### `stop()`

- **Type**: `() => void`
- **Description**: Stop polling (interval is cleared)

```typescript
const handlePause = () => stop();
```

### `start()`

- **Type**: `() => void`
- **Description**: Resume polling (interval is re-established)

```typescript
const handleResume = () => start();
```

## Lifecycle and Cleanup

### On Mount

1. If `enabled` is `true`, first fetch is triggered immediately
2. After first fetch, interval is started
3. Subsequent fetches happen every `interval` milliseconds

### On Unmount

- Interval is cleared
- No memory leaks or orphaned timers

### On Options Change

If `interval`, `enabled`, or `fetcher` changes:

1. Old interval is cleared
2. New interval is established (if `enabled`)
3. First fetch with new fetcher happens immediately (if `enabled`)

## Best Practices

### 1. Use Appropriate Intervals

| Interval | Use Case |
|----------|----------|
| 5-10s | Critical live data (transaction status, active alerts) |
| 15-30s | Standard UI data (shipment list, notifications) |
| 60s+ | Infrequently changing data (user settings, archived shipments) |

```typescript
// Live transaction status
usePolling(fetcher, { interval: 5000 });

// Standard list
usePolling(fetcher, { interval: 15000 });

// Settings (rarely changes)
usePolling(fetcher, { interval: 60000 });
```

### 2. Disable When Not Needed

```typescript
// Only poll when page is visible
const [isVisible, setIsVisible] = useState(true);

useEffect(() => {
  const handleVisibility = () => {
    setIsVisible(!document.hidden);
  };

  document.addEventListener('visibilitychange', handleVisibility);
  return () => document.removeEventListener('visibilitychange', handleVisibility);
}, []);

usePolling(fetcher, { enabled: isVisible });
```

### 3. Handle API Errors Gracefully

```typescript
usePolling(fetcher, {
  onError: (error) => {
    // Distinguish between network, auth, and app errors
    if (!error.response) {
      // Network error
      console.warn('Network unavailable');
    } else if (error.response.status === 401) {
      // Auth expired
      clearSession();
    } else if (error.response.status >= 500) {
      // Server error
      reportError(error);
    }
    // Don't throw — let polling continue
  },
});
```

### 4. Avoid Stale Closures

When using `setInterval` with state, capture state in the fetcher:

```typescript
// ❌ BAD: stale selectedId
const [selectedId, setSelectedId] = useState();
usePolling(
  () => shipmentsApi.get(selectedId), // selectedId might be stale
  { interval: 10000 }
);

// ✅ GOOD: selected id is captured fresh
const [selectedId, setSelectedId] = useState();
usePolling(
  () => {
    if (!selectedId) return Promise.resolve(null);
    return shipmentsApi.get(selectedId); // Fresh capture
  },
  { interval: 10000, enabled: !!selectedId }
);
```

### 5. Use `enabled` for Conditional Polling

```typescript
// ✅ GOOD: polling only when needed
const { data } = usePolling(
  () => shipmentsApi.get(shipmentId),
  { enabled: !!shipmentId }
);

// ❌ AVOID: throwing in fetcher for conditional logic
const { data } = usePolling(
  () => {
    if (!shipmentId) throw new Error('No ID'); // Triggers error state
    return shipmentsApi.get(shipmentId);
  }
);
```

## Common Patterns

### Polling with Manual Sync

```typescript
export function ShipmentDetail({ shipmentId }) {
  const { data, refresh } = usePolling(
    () => shipmentsApi.get(shipmentId),
    { interval: 10000 }
  );

  const handleSyncNow = async () => {
    // Sync on-chain state first
    await shipmentsApi.sync(shipmentId);
    // Then refresh local data
    await refresh();
  };

  return (
    <div>
      <button onClick={handleSyncNow}>Sync Now</button>
      <ShipmentStatus shipment={data} />
    </div>
  );
}
```

### Polling Multiple Resources

```typescript
export function Dashboard() {
  const shipments = usePolling(
    () => shipmentsApi.list(),
    { interval: 15000 }
  );

  const notifications = usePolling(
    () => notificationsApi.list(),
    { interval: 10000 }
  );

  const handleRefreshAll = async () => {
    await Promise.all([shipments.refresh(), notifications.refresh()]);
  };

  return (
    <div>
      <button onClick={handleRefreshAll}>Refresh All</button>
      {/* render */}
    </div>
  );
}
```

### Dependent Polling

```typescript
export function ShipmentWithEvents({ shipmentId }) {
  // Poll shipment every 15s
  const shipment = usePolling(
    () => shipmentsApi.get(shipmentId),
    { interval: 15000 }
  );

  // Poll events only when shipment is loaded
  const events = usePolling(
    () => eventsApi.list({ shipmentId }),
    { interval: 10000, enabled: !!shipment.data }
  );

  return <ShipmentDetail shipment={shipment.data} events={events.data} />;
}
```

## Troubleshooting

### "Too many requests" error

**Cause:** Polling interval is too short or multiple polls with same endpoint.

**Solution:**
- Increase `interval` (use 15s+ for most endpoints)
- Combine multiple polls into one
- Use caching on backend

### Memory leaks

**Cause:** Hook wasn't cleaning up interval on unmount.

**Solution:**
- Hook handles this automatically
- If custom useEffect, ensure interval cleanup:

```typescript
useEffect(() => {
  const id = setInterval(fetcher, interval);
  return () => clearInterval(id); // Cleanup
}, [interval]);
```

### Stale data

**Cause:** Data isn't updating even though polling is running.

**Solution:**
- Check that fetcher is actually calling API
- Verify backend is returning fresh data
- Check error callback for silent failures

### High CPU usage

**Cause:** Polling too frequently or component re-renders excessively.

**Solution:**
- Increase `interval`
- Memoize fetcher function to avoid unnecessary re-renders
- Use `useMemo` and `useCallback`

## Performance Considerations

### Network Usage

Each poll makes an HTTP request. Multiply by number of tabs/users:

- 15s interval = 4 requests/minute = 240 requests/hour
- Across 100 concurrent users = 24,000 requests/hour

**Mitigation:**
- Use reasonable intervals (15-60s for most data)
- Implement server-side caching
- Use conditional polling (`enabled` flag)

### Browser Memory

Each polling instance holds data and maintains an interval:

**Mitigation:**
- Dispose of polling when component unmounts (hook handles this)
- Don't poll unnecessary data
- Use `stop()` to pause when not needed

## Related Files

- `src/lib/hooks/use-polling.ts` — Hook implementation
- `src/lib/api/services.ts` — API service functions
- `src/lib/hooks/use-auth-store.ts` — Auth state (often used with polling)
- Examples: `ShipmentComments.tsx`, `ShipmentList` pages
