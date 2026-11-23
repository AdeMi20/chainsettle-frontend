# Freighter Wallet Integration

## Overview

The ChainSettle frontend uses the **Freighter** browser extension to connect with users' Stellar wallets. Freighter is a secure, non-custodial wallet that allows users to sign transactions without revealing their private keys to the application.

## Location

```
src/lib/stellar/freighter.ts
```

## What is Freighter?

**Freighter** is a browser extension for Stellar that:

- Manages private keys securely in the browser
- Signs transactions requested by web applications
- Provides a user-friendly interface for account and network selection
- Never exposes private keys to web applications
- Supports both Testnet and Mainnet

**Install Freighter**: https://www.freighter.app/

## Setup

### 1. Install Freighter Extension

Users must install the Freighter browser extension before using ChainSettle:

1. Visit https://www.freighter.app/
2. Click "Install" and follow browser prompts
3. Create or import a Stellar account
4. Select **Testnet** or **Mainnet** in Freighter settings

### 2. Connect to ChainSettle

```typescript
import { isFreighterInstalled, connectFreighter } from '@/lib/stellar/freighter';

// Check if Freighter is installed
const installed = await isFreighterInstalled();
if (!installed) {
  alert('Please install Freighter first: https://www.freighter.app/');
  return;
}

// Request user to connect their wallet
try {
  const address = await connectFreighter();
  console.log('Connected:', address);
  // User is now connected and authenticated
} catch (error) {
  console.error('User rejected connection:', error);
}
```

## API Functions

### `isFreighterInstalled(): Promise<boolean>`

Checks if Freighter is installed in the browser.

**Returns:** `true` if Freighter is available, `false` otherwise.

```typescript
if (await isFreighterInstalled()) {
  // Freighter is installed
} else {
  // Prompt user to install
}
```

### `connectFreighter(): Promise<string>`

Requests user to connect their Freighter wallet to ChainSettle.

**Returns:** The user's Stellar public address (e.g., `GXXXXX...`).

**Throws:** If user rejects the connection or Freighter encounters an error.

```typescript
try {
  const userAddress = await connectFreighter();
  // Store address in auth state
  setAuthStore({ address: userAddress });
} catch (error) {
  // User cancelled or error occurred
}
```

### `getUserAddress(): Promise<string>`

Retrieves the currently connected Freighter account address without requesting reconnection.

**Returns:** The public address of the connected account.

**Throws:** If no account is connected or Freighter is unavailable.

```typescript
const address = await getUserAddress();
```

### `getWalletNetwork(): Promise<string>`

Returns the network currently selected in Freighter.

**Returns:** `'testnet'` or `'mainnet'` (or other custom networks Freighter supports).

**Throws:** If Freighter is unavailable.

```typescript
const network = await getWalletNetwork();
if (network !== 'testnet') {
  alert('Please switch to Testnet in Freighter');
}
```

### `unwrapFreighterResult(result): T`

Internal helper that unwraps Freighter's error handling.

**Purpose:** Freighter API methods return a wrapper object with `errorMessage` or the actual result. This function unwraps it.

```typescript
// Freighter returns: { errorMessage?: string, [actual data] }
// unwrapFreighterResult extracts the actual data or throws if errorMessage is present
```

## Signing Transactions

Freighter is used to sign Soroban transactions. See the **contract.ts** guide for transaction building, then signing:

```typescript
import { contractTransactionBuilder } from '@/lib/stellar/contract';
import { Server: FreighterServer } from '@stellar/freighter-api';

// Build transaction
const tx = await contractTransactionBuilder.submitShipment({
  /* shipment data */
});

// Sign with Freighter
const server = new FreighterServer();
const signedTx = await server.submitTransaction(tx);

// Publish to Stellar
const result = await Horizon.transaction(signedTx).submit();
```

## Network Detection

The frontend automatically detects the user's network from Freighter:

```typescript
const network = await getWalletNetwork();
if (network !== process.env.NEXT_PUBLIC_STELLAR_NETWORK) {
  console.warn(
    `Freighter is on ${network}, but app expects ${process.env.NEXT_PUBLIC_STELLAR_NETWORK}`
  );
}
```

## Error Handling

### Common Errors

| Error | Cause | Handling |
|-------|-------|----------|
| Freighter not installed | User hasn't installed extension | Show install link |
| `signTransaction` rejected | User denied signing | Show retry message |
| Network mismatch | Freighter and app on different networks | Warn user to switch networks |
| Account not connected | No account selected in Freighter | Show connect prompt |

### Try-Catch Pattern

```typescript
try {
  const address = await connectFreighter();
  // Success
} catch (error) {
  if (error.message.includes('not found')) {
    // Freighter not installed
    showInstallPrompt();
  } else if (error.message.includes('User rejected')) {
    // User cancelled
    showRetryMessage();
  } else {
    // Other error
    showGenericError(error);
  }
}
```

## Security Considerations

### Private Keys Never Leave Freighter

- ChainSettle never sees or stores the user's private key
- Freighter handles all key operations in a secure context
- Transactions are signed inside Freighter's extension, not in the web page

### Transaction Signing Flow

1. App builds transaction (unsigned)
2. App sends transaction to Freighter
3. User reviews and approves in Freighter popup
4. Freighter signs the transaction with the private key
5. Freighter returns the signed transaction to the app
6. App submits the signed transaction to Stellar

**Result:** The private key never leaves Freighter; the app never has access to it.

### Best Practices

1. **Always request user approval** before signing (use Freighter's popup)
2. **Never hardcode transactions** — build them dynamically based on user input
3. **Validate addresses** before passing to Freighter (use `isValidStellarAddress`)
4. **Display transaction details** to the user before requesting signature
5. **Use HTTPS only** in production (Freighter blocks HTTP in production mode)

## Testing with Freighter

### Manual Testing

1. Install Freighter extension
2. Create or import a testnet account
3. Set Freighter to Testnet
4. Load ChainSettle (testnet deployment)
5. Connect through the UI
6. Create a test shipment and sign the transaction

### Automated Testing

Since Freighter requires browser environment and user interaction, unit tests cannot directly test Freighter integration. Instead:

1. **Mock Freighter** in tests:

```typescript
import { vi } from 'vitest';

vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn().mockResolvedValue(true),
  getPublicKey: vi.fn().mockResolvedValue('GXXXXX...'),
}));
```

2. **Integration tests** should use a headless Freighter instance or test wallet

3. **E2E tests** should use a real Freighter instance with a test account

## Related Components

- **Login page** (`src/app/auth/login/page.tsx`) — calls `connectFreighter()` on button click
- **Top bar** (`src/components/layout/TopBar.tsx`) — displays connected address and disconnect button
- **Contract module** (`src/lib/stellar/contract.ts`) — uses Freighter to sign transactions
- **Auth store** (`src/lib/hooks/use-auth-store.ts`) — manages connected address and session state

## Troubleshooting

### "Freighter not found" error

**Cause:** Freighter is not installed or not accessible.

**Solution:**
1. Check that Freighter extension is installed in browser
2. Ensure extension is enabled in browser settings
3. Try a different browser or clearing cache
4. Restart browser and reload ChainSettle

### "User rejected" error

**Cause:** User clicked "Deny" in Freighter popup.

**Solution:** Inform user and retry. This is normal if user wants to cancel.

### Network mismatch warning

**Cause:** Freighter is set to different network than ChainSettle.

**Solution:**
1. Open Freighter settings
2. Select the correct network (should match `NEXT_PUBLIC_STELLAR_NETWORK`)
3. Reload ChainSettle

### Blank Freighter popup

**Cause:** Rare issue where Freighter UI fails to render.

**Solution:**
1. Close and reopen browser
2. Disable and re-enable Freighter extension
3. Reinstall Freighter if problem persists

## Production Deployment

### Pre-Flight Checklist

- [ ] Set `NEXT_PUBLIC_STELLAR_NETWORK=mainnet` in production environment
- [ ] Update Freighter settings to Mainnet before deploying
- [ ] Verify that transaction signing works with mainnet endpoints
- [ ] Test full sign-in and transaction flow
- [ ] Use HTTPS for all URLs (Freighter enforces this)

### Mainnet Considerations

- Real USDC will be locked in escrow
- Transactions cost real XLM (even though fees are minimal)
- Private key security is critical — users should trust their own security practices
- Consider rate limiting to prevent accidental bulk operations

## References

- [Freighter Official Site](https://www.freighter.app/)
- [Freighter GitHub](https://github.com/stellar/freighter)
- [Stellar Developer Guide](https://developers.stellar.org/)
- [Soroban Documentation](https://soroban.stellar.org/)

## Related Files

- `src/lib/stellar/freighter.ts` — Freighter wrapper functions
- `src/lib/stellar/contract.ts` — Transaction building and signing
- `src/app/auth/login/page.tsx` — Sign-in flow
- `src/lib/hooks/use-auth-store.ts` — Auth state management
