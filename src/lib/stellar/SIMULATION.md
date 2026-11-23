# Soroban Contract Simulation Guide

## Overview

Soroban contract simulations allow you to test contract function calls without spending fees or modifying state. This is essential for validating transactions before submission.

## Location

```
src/lib/stellar/contract.ts
```

## Core Function

### simulateCall

```typescript
async function simulateCall(
  method: string,
  args: xdr.ScVal[]
): Promise<any>
```

Simulates a read-only or state-changing function call on the contract.

**Parameters:**
- `method`: Contract function name (e.g., "get_balance", "get_shipment")
- `args`: Array of contract arguments (must be properly formatted xdr.ScVal)

**Returns:** Simulated function result (varies by contract method)

**Throws:** On simulation error or if contract is invalid

## Usage Patterns

### Read-Only Queries

Simulate queries that don't change state:

```typescript
import { Address } from '@stellar/stellar-sdk';
import { nativeToScVal } from '@stellar/stellar-sdk';
import { simulateCall } from '@/lib/stellar/contract';

// Get balance without submitting transaction
const balance = await simulateCall('get_balance', [
  Address.fromString('GXXXXX...').toScVal(),
]);

console.log('Simulated balance:', balance);
```

### Validation Before Submission

Simulate state-changing operations to catch errors early:

```typescript
// Validate shipment creation before submitting
const result = await simulateCall('create_shipment', [
  nativeToScVal('SHIP-123', { type: 'string' }),
  Address.fromString(buyerAddress).toScVal(),
  nativeToScVal(10000000000n, { type: 'i128' }),
  // ... more arguments
]);

if (result.error) {
  console.error('Simulation failed:', result.error);
  // Show user the error without wasting fees
} else {
  console.log('Simulation succeeded, safe to submit');
  await submitShipmentCreation();
}
```

### Estimating Fees

Simulate complex operations to estimate resource consumption:

```typescript
// Simulate doesn't tell you exact fees, but complex operations
// will reveal if the operation is feasible
const sim = await simulateCall('complex_operation', args);

if (sim.error) {
  // Operation is too complex for current gas limits
  console.error('Operation too expensive:', sim.error);
} else {
  // Operation should succeed
  const tx = await buildTransaction('complex_operation', args);
  await submitTransaction(tx);
}
```

## Argument Formatting

Contract arguments must be properly formatted as `xdr.ScVal` values.

### Common Argument Types

```typescript
import { 
  nativeToScVal, 
  Address, 
  xdr 
} from '@stellar/stellar-sdk';

// String
const stringArg = nativeToScVal('hello', { type: 'string' });

// Number (i128 - 128-bit signed integer)
const numberArg = nativeToScVal(100n, { type: 'i128' });

// Address
const addressArg = Address.fromString('GXXXXX...').toScVal();

// Array
const arrayArg = xdr.ScVal.scvVec([
  nativeToScVal(1n, { type: 'i128' }),
  nativeToScVal(2n, { type: 'i128' }),
]);

// Map/Object
const mapArg = xdr.ScVal.scvMap([
  {
    key: nativeToScVal('key', { type: 'string' }),
    val: nativeToScVal('value', { type: 'string' }),
  },
]);
```

### BigInt for Monetary Values

Soroban uses 128-bit integers for large numbers like stroops:

```typescript
// 1000 USDC in stroops
const amount = 10000000000n; // BigInt literal
const scVal = nativeToScVal(amount, { type: 'i128' });
```

## Error Handling

### Common Simulation Errors

| Error | Cause | Solution |
|-------|-------|----------|
| "contract_not_found" | Contract doesn't exist | Check contract ID and network |
| "contract_data_access_exc" | Missing state | Shipment doesn't exist |
| "invalid_action" | Wrong method name | Check contract method spelling |
| "type_error" | Wrong argument type | Verify argument formatting |
| "insufficient_balance" | Validation fails | Check account balance |

### Error Handling Pattern

```typescript
try {
  const result = await simulateCall(method, args);
  
  if (result?.error) {
    console.error('Simulation error:', result.error);
    // Don't submit if simulation fails
    return { success: false, error: result.error };
  }
  
  return { success: true, data: result };
} catch (err) {
  console.error('Simulation failed:', err);
  // Network error, not contract error
  throw err;
}
```

## Workflow Examples

### Example 1: Validate and Submit Shipment

```typescript
import { simulateCall, invokeContract } from '@/lib/stellar/contract';

async function createShipmentWithValidation(params) {
  // 1. Build arguments
  const args = buildShipmentArgs(params);
  
  // 2. Simulate to validate
  const simResult = await simulateCall('create_shipment', args);
  
  if (simResult?.error) {
    throw new Error(`Validation failed: ${simResult.error}`);
  }
  
  // 3. Simulation succeeded, submit for real
  const result = await invokeContract('create_shipment', args);
  
  if (result.success) {
    console.log('Shipment created:', result.txHash);
  } else {
    console.error('Submission failed:', result.error);
  }
  
  return result;
}
```

### Example 2: Check if Operation is Allowed

```typescript
async function canUserConfirmMilestone(shipmentId, milestoneIndex, userAddress) {
  try {
    const args = [
      nativeToScVal(shipmentId, { type: 'string' }),
      nativeToScVal(milestoneIndex, { type: 'i128' }),
      Address.fromString(userAddress).toScVal(),
    ];
    
    const result = await simulateCall('confirm_milestone', args);
    
    // If no error, user can perform this action
    return !result?.error;
  } catch (err) {
    console.error('Couldn\'t verify permission:', err);
    return false;
  }
}
```

### Example 3: Get Data Without State Changes

```typescript
async function getShipmentStatus(shipmentId) {
  try {
    const args = [nativeToScVal(shipmentId, { type: 'string' })];
    const shipment = await simulateCall('get_shipment', args);
    
    if (!shipment) {
      return { exists: false };
    }
    
    return {
      exists: true,
      status: shipment.status,
      buyerAddress: shipment.buyer,
      totalAmount: shipment.amount,
    };
  } catch (err) {
    console.error('Failed to fetch shipment:', err);
    return null;
  }
}
```

## Limitations

### What Simulation Cannot Do

1. **Modify State**: Simulations don't actually change data on-chain
   - Testing a "submit_proof" will not actually submit proof
   - Run simulation before submission to validate first

2. **Calculate Exact Fees**: Simulations don't report exact fee costs
   - Use `invokeContract` with `submitOnly: true` to get real fee estimate

3. **Handle Multiple Operations**: Only simulates single function calls
   - For complex workflows, simulate each step separately

4. **Predict Future State Changes**: Simulations use current network state
   - If state changes between simulation and submission, behavior may differ

### Accuracy vs Reality

Simulation results usually match actual execution, but edge cases exist:

- **Network congestion**: Fees may change between simulation and submission
- **State changes**: Other transactions might modify contract state
- **Gas limits**: Complex operations might exceed limits during actual execution

## Best Practices

1. **Always Simulate Before Complex Operations**
   ```typescript
   // ✅ Good: Validate before submission
   await simulateCall(method, args);
   await invokeContract(method, args);
   
   // ❌ Bad: Hope for the best
   await invokeContract(method, args);
   ```

2. **Handle Simulation Errors Gracefully**
   ```typescript
   // ✅ Good: Show user the error
   if (sim.error) {
     showErrorToast(`Cannot ${action}: ${sim.error}`);
     return;
   }
   
   // ❌ Bad: Silently ignore errors
   await simulateCall(...); // Errors are ignored
   ```

3. **Format Arguments Correctly**
   ```typescript
   // ✅ Good: Proper xdr.ScVal formatting
   const amount = nativeToScVal(1000n, { type: 'i128' });
   
   // ❌ Bad: Raw JavaScript values
   const amount = 1000; // Wrong!
   ```

4. **Cache Simulation Results When Safe**
   ```typescript
   // ✅ Good: Cache for read-only queries
   const shipment = await getShipmentStatus(id);
   cache.set(id, shipment); // Reuse for a few seconds
   
   // ❌ Bad: Trust old data for state-changing operations
   // State may have changed
   ```

## Performance Considerations

### RPC Calls

Each simulation makes one HTTP request to the Soroban RPC:

```
POST https://rpc-soroban-{network}.stellar.org/
{
  "jsonrpc": "2.0",
  "method": "simulateTransaction",
  "params": [tx_envelope],
  "id": 1
}
```

**Latency**: 500ms - 2s typical

**Cost**: Free (no network fee)

### Response Times

- Simple reads: 500-800ms
- Complex operations: 1-2s
- Network congestion: 2-5s+

## Troubleshooting

### "simulateCall returned null"

**Cause**: Contract method doesn't return a value

**Solution**:
- Some methods are void (don't return anything)
- Check contract documentation for return type
- Void methods just indicate success/failure

### "Simulation succeeded but submission failed"

**Cause**: State changed between simulation and submission

**Solution**:
1. Simulate again before resubmitting
2. Check that you haven't changed arguments
3. Verify network conditions haven't changed
4. Increase retry attempts

### "simulateCall hanging or timing out"

**Cause**: Complex operation or network issues

**Solution**:
1. Check network connectivity
2. Try a simpler operation first
3. Verify RPC endpoint is responding
4. Check Soroban network status

## Related Files

- `src/lib/stellar/contract.ts` — Contract utilities
- `src/lib/stellar/address.ts` — Address utilities
- `src/lib/stellar/freighter.ts` — Wallet integration
- `src/app/dashboard/shipments/create/page.tsx` — Example usage
