# StellarLink Component

## Overview

The `StellarLink` component renders Stellar blockchain addresses and transaction hashes as clickable links to [Stellar Expert](https://stellar.expert/), the primary explorer for the Stellar network. This component bridges off-chain frontend data with on-chain verification, allowing users to view cryptographic proof of transactions and account activity.

## Location

```
src/components/StellarLink.tsx
```

## Usage

```tsx
import { StellarLink } from '@/components/StellarLink';

// Link to a Stellar account
<StellarLink 
  value="GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA" 
  type="account" 
/>

// Link to a transaction
<StellarLink 
  value="a3f5c7d8b2e4f1a6c9d2e5f8a3b6c9d2e5f8a3b6c9d2e5f8a3b6c9d2e5f8a3" 
  type="tx" 
/>

// With custom styling
<StellarLink 
  value="GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA" 
  type="account"
  className="text-green-600 hover:text-green-800 font-bold"
/>
```

## Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `value` | `string` | Yes | A Stellar account address or transaction hash. For accounts, should start with `G`. For transactions, should be a 64-character hex string. |
| `type` | `'account' \| 'tx'` | Yes | Specifies whether the link points to an account or a transaction on Stellar Expert. |
| `className` | `string` | No | Optional Tailwind CSS classes for custom styling. If omitted, defaults to `'font-mono text-blue-600 hover:text-blue-800 underline'`. |

## Behavior

- **Link text**: The value is shortened to the first 6 characters + 6 last characters (e.g., `GCDVUV...QQYT6ZQUA`) using the `shortAddress` utility.
- **Network detection**: The component automatically detects the current network (testnet or mainnet) from the `NEXT_PUBLIC_STELLAR_NETWORK` environment variable and routes to the correct Stellar Expert base URL:
  - Testnet: `https://stellar.expert/explorer/testnet/`
  - Mainnet: `https://stellar.expert/explorer/public/`
- **New tab**: Links open in a new tab with `target="_blank"` and `rel="noopener noreferrer"` for security.
- **Accessibility**: The link includes an `aria-label` describing its purpose and noting that it opens in a new tab.

## URL Structure

The component constructs URLs using this pattern:

```
https://stellar.expert/explorer/{network}/{type}/{value}
```

**Examples:**

- Account on testnet: `https://stellar.expert/explorer/testnet/account/GCDVUV...`
- Transaction on mainnet: `https://stellar.expert/explorer/public/tx/a3f5c7d...`

## Styling

### Default Styling

```tsx
className="font-mono text-blue-600 hover:text-blue-800 underline"
```

This provides:
- Monospace font for readability of addresses and hashes
- Blue text with hover effect
- Underline to indicate a link

### Custom Styling

Override the default style by providing your own `className`:

```tsx
<StellarLink 
  value={address} 
  type="account" 
  className="text-purple-500 hover:text-purple-700 no-underline font-semibold"
/>
```

**Note:** Custom classes are applied directly; default classes are **not** merged. Use Tailwind's `@apply` directive or the `cn()` utility if you need to extend the defaults.

## Common Use Cases

### In ShipmentMeta

Display buyer and supplier addresses with clickable links to verify on Stellar Expert:

```tsx
<StellarLink value={shipment.buyerAddress} type="account" />
```

### In Transaction Receipts

Show the transaction hash after a successful submission:

```tsx
<StellarLink value={txHash} type="tx" className="text-xs" />
```

### In Comments

Link author addresses in discussion threads:

```tsx
<StellarLink value={comment.authorAddress} type="account" />
```

## Dependencies

- `shortAddress` utility from `src/lib/utils` — shortens addresses for display
- `env` configuration from `src/lib/env` — provides the current Stellar network setting

## Browser Support

The component uses standard web APIs:
- `target="_blank"` and `rel="noopener noreferrer"` for security
- `aria-label` for accessibility

Supported in all modern browsers (Chrome, Firefox, Safari, Edge).

## Security Considerations

1. **Link integrity**: The component does not validate the input format. Ensure values are valid Stellar addresses or transaction hashes before passing them to the component.
2. **New tab security**: The `rel="noopener noreferrer"` attribute prevents the opened page from accessing the `window.opener` reference, protecting against [tabnabbing attacks](https://owasp.org/www-community/attacks/Tabnabbing).
3. **XSS prevention**: The component does not render user-provided HTML; all text is safely rendered as text nodes.

## Related Components

- `ShipmentMeta` — displays shipment metadata including buyer/supplier addresses via `StellarLink`
- `ShipmentComments` — renders comment author addresses linked via `StellarLink`
- `Breadcrumbs` — may use `StellarLink` for account breadcrumbs in future iterations

## Testing

To test the `StellarLink` component:

1. **Rendering**: Verify that the component renders without errors.
2. **Link generation**: Check that the href is correctly constructed based on `type` and network.
3. **Text shortening**: Confirm that long addresses are shortened as expected.
4. **Accessibility**: Use a screen reader to verify the `aria-label` is descriptive.
5. **External verification**: Click a link and verify it opens Stellar Expert in a new tab.

## Example Test

```tsx
import { render, screen } from '@testing-library/react';
import { StellarLink } from '@/components/StellarLink';

it('renders a Stellar account link', () => {
  render(
    <StellarLink 
      value="GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA" 
      type="account" 
    />
  );
  const link = screen.getByRole('link');
  expect(link).toHaveAttribute('target', '_blank');
  expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  expect(link.href).toContain('/account/');
});
```

## Migration Guide

### From raw address/hash strings

**Before:**
```tsx
<span>{shipment.buyerAddress}</span>
```

**After:**
```tsx
<StellarLink value={shipment.buyerAddress} type="account" />
```

This upgrades the user experience by making addresses clickable while adding visual context (blue color, underline) that signals interactivity.

## Environment Variables

The component depends on:

- `NEXT_PUBLIC_STELLAR_NETWORK` — determines whether links point to testnet or mainnet explorer

This must be set in `.env.local` before the app runs. See the [README](../../README.md) for configuration details.
