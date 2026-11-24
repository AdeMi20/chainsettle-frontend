# Data Types and Interfaces Guide

## Overview

This document describes the core data types and interfaces used throughout ChainSettle. These types mirror the Soroban smart contract data structures and ensure type safety across the frontend.

## Location

```
src/types/index.ts
```

## Core Enums and String Literals

### MilestoneStatus

```typescript
type MilestoneStatus = 'Pending' | 'ProofSubmitted' | 'Confirmed' | 'Disputed' | 'Resolved';
```

Represents the lifecycle state of a single milestone within a shipment.

| Status | Meaning | Transition |
|--------|---------|-----------|
| `Pending` | Milestone created but no proof submitted | → ProofSubmitted |
| `ProofSubmitted` | Supplier uploaded proof (e.g., invoice, tracking) | → Confirmed or Disputed |
| `Confirmed` | Buyer approved the proof; payment released | → (final) |
| `Disputed` | Buyer or arbiter flagged the proof as invalid | → Resolved |
| `Resolved` | Arbiter reviewed dispute and made final decision | → (final) |

### ShipmentStatus

```typescript
type ShipmentStatus = 'Active' | 'Completed' | 'Cancelled';
```

Represents the overall state of a shipment.

| Status | Meaning |
|--------|---------|
| `Active` | Shipment is in progress (milestones pending or in progress) |
| `Completed` | All milestones confirmed and all funds released |
| `Cancelled` | Shipment cancelled by buyer (funds returned to buyer) |

### UserRole

```typescript
type UserRole = 'BUYER' | 'SUPPLIER' | 'LOGISTICS' | 'ARBITER' | 'ADMIN';
```

Defines authorization levels for users.

| Role | Description |
|------|-------------|
| `BUYER` | Initiates shipments, confirms delivery, releases payments |
| `SUPPLIER` | Fulfills shipments, submits proof of delivery |
| `LOGISTICS` | Manages transit and updates shipment tracking |
| `ARBITER` | Resolves disputes between buyer and supplier |
| `ADMIN` | Administrative access (future use) |

## Domain Models

### Milestone

```typescript
interface Milestone {
  id: string;                    // Unique identifier
  shipmentId: string;            // Parent shipment ID
  milestoneIndex: number;        // 0-based index (position in shipment)
  name: string;                  // Human-readable name (e.g., "50% Deposit")
  paymentPercent: number;        // 1-100, sum of all milestones = 100
  proofHash: string | null;      // IPFS/blockchain proof reference
  status: MilestoneStatus;       // Current lifecycle state
  paymentReleased: string | null; // USDC released in stroops (as string)
  confirmedAt: string | null;    // ISO timestamp when confirmed
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp
}
```

**Example:**
```json
{
  "id": "mile_abc123",
  "shipmentId": "SHIP-20260927-ABCD",
  "milestoneIndex": 0,
  "name": "50% Deposit",
  "paymentPercent": 50,
  "proofHash": "QmYwAPJzv5CZsnA625s3Xf2nemtYgPpHdWEz79ojWnPbdG",
  "status": "Confirmed",
  "paymentReleased": "5000000000",
  "confirmedAt": "2026-09-27T14:30:00.000Z",
  "createdAt": "2026-09-27T10:00:00.000Z",
  "updatedAt": "2026-09-27T14:30:00.000Z"
}
```

### Shipment

```typescript
interface Shipment {
  id: string;                 // Unique shipment ID (e.g., "SHIP-20260927-ABCD")
  buyerAddress: string;       // Buyer's Stellar account
  supplierAddress: string;    // Supplier's Stellar account
  logisticsAddress: string;   // Logistics provider's Stellar account
  arbiterAddress: string;     // Dispute arbiter's Stellar account
  tokenAddress: string;       // USDC contract address (for the network)
  totalAmount: string;        // Total in stroops (BigInt as string)
  releasedAmount: string;     // Amount already released in stroops
  status: ShipmentStatus;     // Current lifecycle state
  txHash: string | null;      // Stellar transaction hash
  createdLedger: number | null; // Ledger number when created on-chain
  createdAt: string;          // ISO timestamp
  updatedAt: string;          // ISO timestamp
  milestones: Milestone[];    // Array of milestones for this shipment
  events?: ChainEvent[];      // Optional array of blockchain events
}
```

**Example:**
```json
{
  "id": "SHIP-20260927-ABCD",
  "buyerAddress": "GBUQWP3BOUZX34ULNQG23RQ6F4BWFIREBAXYYLGNDLSSKW3MVP5D6YUP",
  "supplierAddress": "GCVLWV5NK3OVDIDQEQ5bAFTtXVS5SC7ENFUCQY37GHMUHELSPNJZ6QV",
  "logisticsAddress": "GBLXPLXV37YYAKDV2QKDKQXPLF2YRQYOOXP5QZQOFPQNQJ6FKDV7KLM",
  "arbiterAddress": "GBHUSIZZ3L6QK3TKPXC4KYUSBHYH2BUHXCG2CZZLBG3L4J5P2V7F3QW",
  "tokenAddress": "CBBD3L5EXCZX5DSDQ2TNEFHFG7I7TQGZWJJ57VNJ3T5P7SXKV3B6YQ",
  "totalAmount": "10000000000",
  "releasedAmount": "5000000000",
  "status": "Active",
  "txHash": "a3f5c7d8b2e4f1a6c9d2e5f8a3b6c9d2e5f8a3b6c9d2e5f8a3b6c9d2e5f8a3",
  "createdLedger": 123456,
  "createdAt": "2026-09-27T10:00:00.000Z",
  "updatedAt": "2026-09-27T14:30:00.000Z",
  "milestones": [ /* ... */ ],
  "events": [ /* ... */ ]
}
```

### ChainEvent

```typescript
interface ChainEvent {
  id: string;                       // Unique event ID
  contractId?: string;              // Soroban contract ID
  eventName: string;                // Event type (e.g., "MilestoneProofSubmitted")
  shipmentId?: string | null;       // Associated shipment ID
  ledger: number;                   // Stellar ledger number
  txHash: string;                   // Transaction hash
  timestamp?: string;               // ISO timestamp (optional)
  payload?: Record<string, unknown>; // Event data
  processed?: boolean;              // Whether event was processed by backend
  createdAt?: string;               // When recorded
  data?: Record<string, unknown>;   // Alternative payload field
}
```

**Example:**
```json
{
  "id": "evt_xyz789",
  "contractId": "CBBD3L5EXCZX5DSDQ2TNEFHFG7I7TQGZWJJ57VNJ3T5P7SXKV3B6YQ",
  "eventName": "MilestoneProofSubmitted",
  "shipmentId": "SHIP-20260927-ABCD",
  "ledger": 123457,
  "txHash": "a3f5c7d8b2e4f1a6c9d2e5f8a3b6c9d2e5f8a3b6c9d2e5f8a3b6c9d2e5f8a3",
  "timestamp": "2026-09-27T11:15:00.000Z",
  "payload": { "milestoneIndex": 0, "proofHash": "QmYwAPJzv5CZsnA625..." },
  "processed": true,
  "createdAt": "2026-09-27T11:15:00.000Z"
}
```

### Notification

```typescript
interface Notification {
  id: string;                      // Unique notification ID
  userId: string;                  // User receiving the notification
  type: string;                    // Notification type (e.g., "shipment_created", "proof_submitted")
  title: string;                   // Title shown in notification UI
  message: string;                 // Message body
  data: Record<string, unknown> | null; // Extra context (e.g., shipment ID)
  read: boolean;                   // Whether user has read it
  emailSent: boolean;              // Whether email was sent
  createdAt: string;               // ISO timestamp
}
```

### User

```typescript
interface User {
  id: string;              // Unique user ID
  stellarAddress: string;  // Stellar public address
  email: string | null;    // Email address (optional)
  name: string | null;     // User's name (optional)
  role: UserRole;          // Authorization level
  createdAt: string;       // ISO timestamp
  updatedAt: string;       // ISO timestamp
}
```

## Input/Output Types (DTOs)

### CreateMilestoneInput

```typescript
interface CreateMilestoneInput {
  name: string;         // Milestone name
  paymentPercent: number; // Payment percentage (1-100)
}
```

Used when creating or editing shipments. The sum of all milestone percentages must equal 100.

### CreateShipmentInput

```typescript
interface CreateShipmentInput {
  shipmentId: string;        // Unique shipment ID
  supplierAddress: string;   // Supplier Stellar address
  logisticsAddress: string;  // Logistics Stellar address
  arbiterAddress: string;    // Arbiter Stellar address
  totalAmount: string;       // Human-readable USDC (e.g., "500")
  milestones: CreateMilestoneInput[];
}
```

Used when creating a new shipment. The `totalAmount` is provided in human-readable USDC and converted to stroops before contract submission.

### CreateCommentInput

```typescript
interface CreateCommentInput {
  content: string;  // Comment text (1-1000 characters)
}
```

### Comment

```typescript
interface Comment {
  id: string;              // Unique comment ID
  shipmentId: string;      // Associated shipment
  authorAddress: string;   // Stellar address of commenter
  authorRole?: string;     // Role of commenter (optional)
  content: string;         // Comment text
  createdAt: string;       // ISO timestamp
  updatedAt?: string;      // Last update (optional)
}
```

## API Response Envelopes

### ApiResponse<T>

```typescript
interface ApiResponse<T> {
  success: boolean;        // Operation success flag
  data: T;                 // Response payload
  timestamp?: string;      // ISO timestamp (optional)
}
```

The standard response envelope from all backend API endpoints.

**Example:**
```json
{
  "success": true,
  "data": { "id": "...", "name": "..." },
  "timestamp": "2026-09-27T14:30:00.000Z"
}
```

### PaginatedResponse<T>

```typescript
interface PaginatedResponse<T> {
  data: T[];                    // Array of items
  page: number;                 // Current page (1-based)
  limit: number;                // Items per page
  total: number;                // Total items in collection
  totalPages: number;           // Total pages
  meta?: {                      // Duplicate metadata (some endpoints)
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
```

Used for list endpoints (shipments, events, notifications, comments).

**Example:**
```json
{
  "data": [ { "id": "1", ... }, { "id": "2", ... } ],
  "page": 1,
  "limit": 20,
  "total": 150,
  "totalPages": 8
}
```

## Authentication Types

### AuthUser

```typescript
interface AuthUser {
  id: string;              // User ID
  stellarAddress: string;  // Stellar account
  role: UserRole;          // Authorization level
}
```

Represents the currently logged-in user.

### JwtPayload

```typescript
interface JwtPayload {
  sub: string;              // Subject (user ID)
  stellarAddress: string;   // Stellar account
  role: UserRole;           // Authorization level
}
```

The decoded JWT token payload. Used internally for authorization checks.

## Usage Patterns

### Creating a Shipment

```typescript
import { CreateShipmentInput, CreateMilestoneInput } from '@/types';

const input: CreateShipmentInput = {
  shipmentId: 'SHIP-20260927-ABCD',
  supplierAddress: 'GCVLWV5NK3OVDIDD...',
  logisticsAddress: 'GBLXPLXV37YYAKDV...',
  arbiterAddress: 'GBHUSIZZ3L6QK3TK...',
  totalAmount: '500', // Human-readable USDC
  milestones: [
    { name: '50% Deposit', paymentPercent: 50 },
    { name: '50% Final', paymentPercent: 50 },
  ],
};

await shipmentsApi.create(input);
```

### Checking User Authorization

```typescript
import { AuthUser, UserRole } from '@/types';

const authStore = useAuthStore();
const user: AuthUser = authStore.user;

if (user.role === 'BUYER') {
  // Show buyer-only UI
}

if (['BUYER', 'ARBITER'].includes(user.role)) {
  // Show common UI for these roles
}
```

### Handling Paginated Responses

```typescript
import { PaginatedResponse, Shipment } from '@/types';

const response: PaginatedResponse<Shipment> = await shipmentsApi.list({
  page: 1,
  limit: 20,
});

console.log(`Showing page ${response.page} of ${response.totalPages}`);
response.data.forEach((shipment) => {
  console.log(shipment.id, shipment.status);
});
```

## Amount Handling

### Important: Stroops vs USDC

- **Contract storage and calculations**: Use stroops (BigInt)
- **User input and display**: Use USDC (human-readable decimal)
- **API serialization**: Store stroops as strings (JSON doesn't support BigInt)

**Conversion:**
```typescript
import { stroopsToUsdc, usdcToStroops } from '@/lib/utils';

// Display to user
const displayAmount = stroopsToUsdc('10000000'); // "1.00"

// Convert from user input for contract
const stroopsAmount = usdcToStroops('1.50'); // 15000000n
```

## Status Transitions

### Milestone Lifecycle

```
Pending → ProofSubmitted → Confirmed → (final)
                        ↘ Disputed → Resolved → (final)
```

### Shipment Lifecycle

```
Active → Completed
      ↘ Cancelled
```

## Null and Optional Fields

| Field | Type | Meaning |
|-------|------|---------|
| `proofHash: null` | `string \| null` | Milestone has no proof yet |
| `confirmedAt: null` | `string \| null` | Milestone not yet confirmed |
| `email: null` | `string \| null` | User hasn't provided email |
| `events: undefined` | Optional | Shipment details endpoint doesn't include events |

Always check for null/undefined before using optional fields.

## Related Files

- `src/types/index.ts` — Type definitions
- `src/lib/api/services.ts` — API service functions using these types
- `src/lib/utils/index.ts` — Conversion utilities (stroops ↔ USDC)
- `src/lib/hooks/use-auth-store.ts` — Auth state using AuthUser type

## Best Practices

1. **Use type imports**: `import type { Shipment, Milestone } from '@/types'`
2. **Validate data**: Don't assume API responses match TypeScript types
3. **Handle nulls**: Always check optional fields before use
4. **Use constants**: Define status constants to avoid string typos
5. **Document migrations**: When types change, update API contracts and migrations
