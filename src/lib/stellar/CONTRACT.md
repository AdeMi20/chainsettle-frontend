# Soroban Contract Utilities Documentation

## Overview

The contract utilities provide high-level functions for interacting with the Soroban smart contract deployed on Stellar. These utilities handle transaction building, simulation, submission, and confirmation.

## Location

```
src/lib/stellar/contract.ts
```

## Core Concepts

### RPC Server

```typescript
function getRpc(): rpc.Server
```

Returns the Soroban RPC server configured for the current network.

**Configuration:**
- Testnet: Uses `NEXT_PUBLIC_STELLAR_RPC_URL` environment variable
- Mainnet: Uses same variable (must be configured for mainnet)

**Usage:**
```typescript
const server = getRpc();
const latestLedger = await server.getLatestLedger();
```

### Transaction Options

```typescript
interface TxOptions {
  maxRetries?: number;      // Max retries for transient errors (default: 3)
  retryDelayMs?: number;    // Initial retry delay in ms (default: 2000)
  timeoutMs?: number;       // Operation timeout in ms (default: 60000)
  submitOnly?: boolean;     // Don't wait for confirmation (default: false)
}
```

Customizes behavior for transaction submission and confirmation.

## Core Functions

### invokeContract

```typescript
async function invokeContract(
  method: string,
  args: xdr.ScVal[],
  options?: TxOptions
): Promise<Result<Transaction>>
```

Builds and optionally submits a contract invocation transaction.

**Parameters:**
- `method`: Contract method name (e.g., "create_shipment")
- `args`: Array of Soroban contract arguments (xdr.ScVal)
- `options`: Optional configuration

**Returns:**
```typescript
interface Result<T> {
  success: boolean;
  data?: T;
  error?: string;
  txHash?: string;
}
```

**Example:**
```typescript
const result = await invokeContract(
  'create_shipment',
  [
    nativeToScVal(shipmentId, { type: 'string' }),
    Address.fromString(buyerAddress).toScVal(),
    // ... more args
  ]
);

if (result.success) {
  console.log('Transaction:', result.txHash);
} else {
  console.error('Error:', result.error);
}
```

### submitTransaction

```typescript
async function submitTransaction(tx: Transaction): Promise<string>
```

Submits a pre-built transaction to the Soroban RPC and returns the transaction hash.

**Parameters:**
- `tx`: Fully-prepared Transaction object (with operations, fees, sequence)

**Returns:** Transaction hash (hex string)

**Throws:** On network errors or if transaction is invalid

**Usage:**
```typescript
const tx = new TransactionBuilder(...)
  .addOperation(Operation.invokeHostFunction({ ... }))
  .build();

const txHash = await submitTransaction(tx);
console.log('Submitted:', txHash);
```

### waitForConfirmation

```typescript
async function waitForConfirmation(
  txHash: string,
  options?: TxOptions
): Promise<TransactionResponse>
```

Polls the network until a transaction is confirmed.

**Parameters:**
- `txHash`: Transaction hash to monitor
- `options`: Configuration (retries, timeouts)

**Returns:** Confirmed transaction details

**Polling Behavior:**
- Checks every 1 second
- Handles transient errors with exponential backoff
- Maximum wait: timeout value (default 60s)

**Example:**
```typescript
const txHash = await submitTransaction(tx);
const confirmed = await waitForConfirmation(txHash, {
  timeoutMs: 120000,     // Wait up to 2 minutes
  maxRetries: 5,
});

console.log('Confirmed at ledger:', confirmed.ledger_attr);
```

### simulateCall

```typescript
async function simulateCall(
  method: string,
  args: xdr.ScVal[]
): Promise<any>
```

Simulates a contract call without submitting a transaction (read-only).

**Parameters:**
- `method`: Contract method name
- `args`: Contract arguments

**Returns:** Simulated result (varies by method)

**Usage:**
```typescript
// Get balance without submitting a transaction
const balance = await simulateCall('get_balance', [
  Address.fromString(address).toScVal(),
]);

console.log('Simulated balance:', balance);
```

## High-Level Transaction Functions

### createShipment

```typescript
async function createShipment(params: {
  shipmentId: string;
  buyerAddress: string;
  supplierAddress: string;
  logisticsAddress: string;
  arbiterAddress: string;
  amount: bigint;  // in stroops
  milestones: Array<{ percentage: number }>;
}): Promise<Result<{ txHash: string }>>
```

Creates a new milestone-based shipment on-chain.

**Parameters:** All shipment details including parties and milestone splits

**Returns:** Result with transaction hash

**Example:**
```typescript
const result = await createShipment({
  shipmentId: 'SHIP-20260927-ABCD',
  buyerAddress: 'GXXXXX...',
  supplierAddress: 'GYYYY...',
  logisticsAddress: 'GZZZZ...',
  arbiterAddress: 'GWWWW...',
  amount: 10000000000n,  // 1000 USDC in stroops
  milestones: [
    { percentage: 50 },
    { percentage: 50 },
  ],
});

if (result.success) {
  console.log('Shipment created:', result.txHash);
}
```

### submitProof

```typescript
async function submitProof(params: {
  shipmentId: string;
  milestoneIndex: number;
  proofHash: string;  // IPFS hash
}): Promise<Result<{ txHash: string }>>
```

Supplier submits proof for a milestone.

### confirmMilestone

```typescript
async function confirmMilestone(params: {
  shipmentId: string;
  milestoneIndex: number;
}): Promise<Result<{ txHash: string }>>
```

Buyer confirms milestone delivery and releases payment.

### raiseDispute

```typescript
async function raiseDispute(params: {
  shipmentId: string;
  milestoneIndex: number;
}): Promise<Result<{ txHash: string }>>
```

Buyer or logistics disputes a milestone.

### resolveDispute

```typescript
async function resolveDispute(params: {
  shipmentId: string;
  milestoneIndex: number;
  resolved: boolean;  // true = approve, false = reject
}): Promise<Result<{ txHash: string }>>
```

Arbiter resolves a dispute.

### cancelShipment

```typescript
async function cancelShipment(params: {
  shipmentId: string;
}): Promise<Result<{ txHash: string }>>
```

Buyer cancels a shipment and recovers funds.

## Read-Only Functions

### getShipmentOnChain

```typescript
async function getShipmentOnChain(shipmentId: string): Promise<any>
```

Fetches shipment data from the smart contract (read-only).

**Returns:** Shipment object from blockchain

### getEscrowBalance

```typescript
async function getEscrowBalance(shipmentId: string): Promise<bigint>
```

Fetches the escrow balance for a shipment in stroops.

**Returns:** Balance as BigInt

**Example:**
```typescript
const balance = await getEscrowBalance('SHIP-20260927-ABCD');
console.log('Escrow balance:', stroopsToUsdc(balance.toString()));
```

## Error Handling

### errorText

```typescript
function errorText(err: unknown): string
```

Converts error objects to human-readable messages.

**Handles:**
- Soroban contract errors
- Network errors
- JSON-RPC errors
- Generic JavaScript errors

**Returns:** Error message string

**Example:**
```typescript
try {
  await createShipment({ /* ... */ });
} catch (err) {
  const message = errorText(err);
  showErrorToast(message);
}
```

### isTransientError

```typescript
function isTransientError(err: unknown): boolean
```

Determines if an error is transient (can be retried).

**Returns `true` for:**
- Network timeouts
- Rate limit errors
- Temporary service unavailability

**Returns `false` for:**
- Invalid transactions
- Insufficient balance
- Authorization failures

**Usage:**
```typescript
try {
  await invokeContract(method, args);
} catch (err) {
  if (isTransientError(err)) {
    // Retry later
  } else {
    // Don't retry
  }
}
```

## Retry and Backoff

### backoff

```typescript
function backoff(attempt: number): number
```

Calculates exponential backoff delay in milliseconds.

**Formula:**
```
delay = 1000 * 2^attempt + random jitter
```

**Example:**
```
attempt 0: ~1000ms
attempt 1: ~2000ms
attempt 2: ~4000ms
attempt 3: ~8000ms
```

### Automatic Retry Logic

Failed transactions are automatically retried with exponential backoff:

1. First failure: Wait 1-2 seconds, retry
2. Second failure: Wait 2-4 seconds, retry
3. Third failure: Wait 4-8 seconds, retry
4. Max retries exceeded: Throw error

**Customization:**
```typescript
await invokeContract(method, args, {
  maxRetries: 5,        // Try up to 6 times
  retryDelayMs: 3000,   // Start with 3 second delay
});
```

## Sleep Utility

```typescript
sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
```

Pauses execution for a specified duration.

**Example:**
```typescript
await sleep(2000);  // Wait 2 seconds
```

## Workflow Example: Create and Confirm Shipment

```typescript
// 1. Create shipment
const createResult = await createShipment({
  shipmentId: 'SHIP-20260927-ABCD',
  buyerAddress,
  supplierAddress,
  logisticsAddress,
  arbiterAddress,
  amount: 10000000000n,
  milestones: [{ percentage: 50 }, { percentage: 50 }],
});

if (!createResult.success) {
  throw new Error(createResult.error);
}

// 2. Wait for confirmation
const confirmed = await waitForConfirmation(createResult.txHash);
console.log('Confirmed at ledger:', confirmed.ledger_attr);

// 3. Supplier submits proof
const proofResult = await submitProof({
  shipmentId: 'SHIP-20260927-ABCD',
  milestoneIndex: 0,
  proofHash: 'QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG',
});

// 4. Buyer confirms
const confirmResult = await confirmMilestone({
  shipmentId: 'SHIP-20260927-ABCD',
  milestoneIndex: 0,
});

// 5. Funds released
console.log('Milestone confirmed:', confirmResult.txHash);
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_STELLAR_RPC_URL` | Yes | Soroban RPC endpoint |
| `NEXT_PUBLIC_CONTRACT_ID` | Yes | Deployed contract ID |
| `NEXT_PUBLIC_USDC_ADDRESS` | Yes | USDC asset address |
| `NEXT_PUBLIC_STELLAR_NETWORK` | Yes | testnet or mainnet |

## Related Files

- `src/lib/stellar/freighter.ts` — Wallet signing
- `src/lib/stellar/address.ts` — Address utilities
- `src/lib/utils/index.ts` — Conversion utilities
- `src/middleware.ts` — CSP and nonce handling

## Best Practices

1. **Always handle errors:** Check `result.success` before accessing `result.data`
2. **Use timeouts wisely:** Set appropriate `timeoutMs` based on network conditions
3. **Batch operations:** Combine multiple contract calls when possible
4. **Monitor gas fees:** Soroban transactions may require substantial fees
5. **Test on testnet first:** Always test contract interactions before mainnet

## Troubleshooting

### "Contract not found"

The contract ID doesn't exist on the network. Verify:
- Contract is deployed
- Contract ID matches the network
- You're on the correct network (testnet vs mainnet)

### "Insufficient balance"

User doesn't have enough USDC or XLM. Check:
- USDC balance for shipment amount
- XLM balance for transaction fees

### "Transaction expired"

Transaction wasn't confirmed before expiry. Consider:
- Increasing `timeoutMs`
- Reducing transaction complexity
- Checking network congestion
