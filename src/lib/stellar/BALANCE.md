# Wallet Balance Utilities Documentation

## Overview

The balance utilities fetch and parse Stellar wallet balances including XLM and USDC, minimum account balance requirements, and available spending balance.

## Location

```
src/lib/stellar/balance.ts
```

## Core Function

### getWalletBalances(address)

```typescript
async function getWalletBalances(address: string): Promise<WalletBalances>
```

Fetches the complete balance information for a Stellar account.

**Parameters:**
- `address`: Stellar account address (must be valid and normalized)

**Returns:**
```typescript
interface WalletBalances {
  xlmBalance: string;      // Total XLM in stroops (as string)
  usdcBalance: string;     // Total USDC in stroops (as string)
  minimumBalance: string;  // Minimum XLM required by Stellar (stroops)
  availableBalance: string; // Available XLM for spending (stroops)
}
```

**Example:**
```typescript
const balances = await getWalletBalances('GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA');
// {
//   xlmBalance: '10000000',      // 1 XLM
//   usdcBalance: '100000000',    // 10 USDC
//   minimumBalance: '500000',    // 0.5 XLM
//   availableBalance: '9500000'  // 0.95 XLM available
// }
```

## WalletBalances Interface

### xlmBalance

```typescript
xlmBalance: string;
```

Total XLM balance in stroops (1 XLM = 10,000,000 stroops).

**Usage:**
```typescript
import { stroopsToUsdc } from '@/lib/utils';
const displayXlm = stroopsToUsdc(balances.xlmBalance); // "1.00"
```

### usdcBalance

```typescript
usdcBalance: string;
```

Total USDC balance in stroops (1 USDC = 10,000,000 stroops).

**Usage:**
```typescript
const displayUsdc = stroopsToUsdc(balances.usdcBalance); // "10.00"
```

**Note:** USDC on Stellar is wrapped and tracked separately from XLM.

### minimumBalance

```typescript
minimumBalance: string;
```

Minimum XLM balance required by Stellar for the account to remain active.

**Calculation:**
- Base: 2 XLM (20,000,000 stroops)
- Per trustline: 0.5 XLM (5,000,000 stroops)
- Example: 2 trustlines (native + USDC) = 2 + 2×0.5 = 3 XLM

**Usage:**
```typescript
const minXlm = stroopsToUsdc(balances.minimumBalance); // "3.00"
```

### availableBalance

```typescript
availableBalance: string;
```

XLM available for spending or operations (xlmBalance - minimumBalance).

**Calculation:**
```typescript
availableBalance = xlmBalance - minimumBalance
```

**Usage:**
```typescript
const available = stroopsToUsdc(balances.availableBalance); // "0.95"
// User can spend this much XLM for transaction fees
```

## Implementation Details

### Fetching from Horizon

`getWalletBalances` calls the Stellar Horizon API:

```typescript
GET https://horizon-testnet.stellar.org/accounts/{address}
// or
GET https://horizon.stellar.org/accounts/{address}
```

**Response includes:**
```json
{
  "id": "GXXXXX...",
  "balances": [
    {
      "balance": "10.0000000",    // XLM balance
      "asset_type": "native"
    },
    {
      "balance": "10.0000000",    // USDC balance
      "asset_code": "USDC",
      "asset_issuer": "GBBD..."
    }
  ],
  "subentry_count": 2,            // Number of trustlines
  "selling_liabilities": "0",
  "buying_liabilities": "0"
}
```

### Balance Conversion

Horizon returns balances as decimal strings. The function converts to stroops:

```typescript
// Horizon: "10.0000000" XLM
// Stroops: "100000000" (10 * 10,000,000)
const stroops = Math.floor(parseFloat(horizonBalance) * 10_000_000).toString();
```

### Error Handling

```typescript
try {
  const balances = await getWalletBalances(address);
} catch (error) {
  if (error instanceof NotFoundError) {
    // Account doesn't exist
  } else if (error instanceof NetworkError) {
    // Horizon service unavailable
  } else {
    // Other error
  }
}
```

**Common Errors:**
| Error | Cause | Handling |
|-------|-------|----------|
| 404 Not Found | Account hasn't been activated | Show "Account not found" |
| Network Error | Horizon unavailable | Retry after delay |
| Invalid Address | Malformed address | Validate before calling |
| Rate Limited | Too many requests | Implement backoff |

## Usage Patterns

### In React Hooks

```typescript
import { useWalletBalance } from '@/lib/hooks/use-wallet-balance';

function WalletDisplay({ address }: { address: string | null }) {
  const { balances, loading, error } = useWalletBalance(address);

  if (loading) return <div>Loading balances...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!balances) return <div>Not connected</div>;

  return (
    <div>
      <p>XLM: {stroopsToUsdc(balances.xlmBalance)}</p>
      <p>USDC: {stroopsToUsdc(balances.usdcBalance)}</p>
      <p>Available: {stroopsToUsdc(balances.availableBalance)}</p>
    </div>
  );
}
```

### In Components

```typescript
function TransactionForm({ address }: { address: string }) {
  const { balances } = useWalletBalance(address);
  const availableUsdc = balances ? stroopsToUsdc(balances.usdcBalance) : '0';

  return (
    <div>
      <label>Amount (max: {availableUsdc} USDC)</label>
      <input type="number" max={availableUsdc} />
    </div>
  );
}
```

### For Validation

```typescript
function validateTransaction(amount: string, balances: WalletBalances | null) {
  if (!balances) {
    return 'Balances not loaded';
  }

  const amountStroops = usdcToStroops(amount);
  const usdcStroops = BigInt(balances.usdcBalance);

  if (amountStroops > usdcStroops) {
    return 'Insufficient USDC balance';
  }

  // Check XLM for transaction fees
  const minFeeStroops = 1_000n; // 0.0001 XLM
  if (BigInt(balances.availableBalance) < minFeeStroops) {
    return 'Insufficient XLM for transaction fees';
  }

  return null; // Valid
}
```

## Stroops vs USDC

**Important distinction:**

| Format | Type | Use Case |
|--------|------|----------|
| Stroops | String (BigInt) | Storage, calculation, Stellar API |
| USDC | Decimal string | Display to users, input from users |

**Conversion:**
```typescript
// Display balance to user
const displayBalance = stroopsToUsdc(balances.usdcBalance); // "10.50"

// Convert user input for storage
const amountStroops = usdcToStroops(userInput); // 105000000n
```

## Minimum Balance Requirements

### Base Requirement

Every Stellar account must maintain a minimum balance:

```typescript
minimumBalance = 2 XLM (base) + 0.5 XLM × (trustlines - 1)
```

**Examples:**

| Trustlines | Minimum Balance |
|-----------|-----------------|
| 1 (native only) | 2.0 XLM |
| 2 (native + USDC) | 2.5 XLM |
| 3 (native + USDC + other) | 3.0 XLM |

**Implications:**
- Cannot send XLM below minimum balance
- Each new trustline increases minimum
- Removing trustlines decreases minimum

### Available Balance Calculation

```typescript
availableBalance = xlmBalance - minimumBalance
```

**Example:**
```
xlmBalance: 10 XLM
minimumBalance: 2.5 XLM
availableBalance: 7.5 XLM (can spend up to this for fees)
```

## Network Detection

Balance utilities automatically detect the network from environment:

```typescript
// NEXT_PUBLIC_HORIZON_URL determines which network
// Testnet: https://horizon-testnet.stellar.org
// Mainnet: https://horizon.stellar.org
```

Balances are **network-specific** — an address has different balances on testnet and mainnet.

## Caching and Polling

The `useWalletBalance` hook handles polling (every 30 seconds).

**When balances refresh:**
- After mount (immediate fetch)
- Every 30 seconds (automatic poll)
- On `chainsettle:transaction-complete` event (if visible)
- When address changes

## Performance Considerations

### API Calls

Each balance fetch makes one HTTP request to Horizon:

```
GET https://horizon-testnet.stellar.org/accounts/{address}
```

**Latency:** Typically 200-500ms

**Cost:** Use polling intervals wisely (default: 30s)

### Storage

Balance data is kept in component state (not persisted):

- In-memory only
- Lost on page refresh
- Re-fetched on mount

## Related Files

- `src/lib/hooks/use-wallet-balance.ts` — Hook for polling balances
- `src/lib/utils/index.ts` — stroopsToUsdc, usdcToStroops conversion
- `src/lib/stellar/address.ts` — Address validation
- `src/lib/stellar/contract.ts` — Stellar RPC configuration

## Troubleshooting

### "Account not found"

**Cause:** Address doesn't exist on the network.

**Solution:**
1. Verify address is correct
2. Check you're on the right network (testnet vs mainnet)
3. If new account, fund it first (use Friendbot for testnet)

### "Unable to load balances"

**Cause:** Horizon service unavailable or network error.

**Solution:**
1. Check internet connection
2. Verify `NEXT_PUBLIC_HORIZON_URL` is correct
3. Retry after a few seconds (automatic in polling hook)

### High API Usage

**Cause:** Polling interval too short or multiple components fetching same address.

**Solution:**
1. Increase polling interval (default 30s is recommended)
2. Use single `useWalletBalance` hook shared across components
3. Implement memoization or context for balances

### Stale Balances

**Cause:** Polling didn't trigger after transaction.

**Solution:**
1. Dispatch `chainsettle:transaction-complete` event after tx completes
2. This triggers immediate refresh if page is visible
3. Normal polling (30s) catches it anyway

## Testing

To test balance functionality:

```typescript
// Mock getWalletBalances
vi.mock('@/lib/stellar/balance', () => ({
  getWalletBalances: vi.fn().mockResolvedValue({
    xlmBalance: '10000000',
    usdcBalance: '100000000',
    minimumBalance: '2500000',
    availableBalance: '7500000',
  }),
}));

// Now components using useWalletBalance will get mock data
```
