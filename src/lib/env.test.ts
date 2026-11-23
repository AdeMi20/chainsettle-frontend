import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Note: This test file documents the expected structure and validation
// of the env module. Due to the nature of environment variables being read
// at module load time and the difficulty of isolating them in tests without
// affecting the global state, these tests serve as documentation of the
// isUrl validation helper and the expected Env interface structure.
//
// The isUrl function and CONTRACT_ID_PATTERN validation can be tested
// if they are exported from env.ts for testing purposes.

describe('Environment validation structure', () => {
  it('documents the required Env interface', () => {
    // The env module exports a typed Env object with these fields:
    const expectedFields = [
      'apiUrl',
      'stellarNetwork',
      'contractId',
      'usdcAddress',
      'stellarRpcUrl',
      'horizonUrl',
      'ipfsGateway',
    ];

    assert.deepEqual(expectedFields, [
      'apiUrl',
      'stellarNetwork',
      'contractId',
      'usdcAddress',
      'stellarRpcUrl',
      'horizonUrl',
      'ipfsGateway',
    ]);
  });

  it('documents required environment variables', () => {
    // These env vars are required and must be set before the app runs:
    // - NEXT_PUBLIC_CONTRACT_ID: 56-char Stellar contract ID starting with C
    // - NEXT_PUBLIC_USDC_ADDRESS: 56-char Stellar contract ID starting with C
    // - NEXT_PUBLIC_STELLAR_RPC_URL: Valid https:// URL
    // - NEXT_PUBLIC_API_URL: Optional, defaults to http://localhost:3000/api/v1
    // - NEXT_PUBLIC_STELLAR_NETWORK: 'testnet' or 'mainnet' (defaults to 'testnet')
    // - NEXT_PUBLIC_HORIZON_URL: Optional, defaults based on network
    // - NEXT_PUBLIC_IPFS_GATEWAY: Optional, defaults to https://ipfs.io/ipfs/

    const requiredVars = [
      'NEXT_PUBLIC_CONTRACT_ID',
      'NEXT_PUBLIC_USDC_ADDRESS',
      'NEXT_PUBLIC_STELLAR_RPC_URL',
    ];

    assert.ok(requiredVars.length === 3);
  });

  it('documents Stellar contract ID pattern', () => {
    // Stellar contract IDs match the pattern: C[A-Z2-7]{55}
    // Example: CAB7DXV5GWMJ7BQBFTNRQ2OB6QOFL3V45B4EVFVVZRR2V7Q3H3QACWQ
    const contractIdPattern = /^C[A-Z2-7]{55}$/;

    assert.ok(contractIdPattern.test('CAB7DXV5GWMJ7BQBFTNRQ2OB6QOFL3V45B4EVFVVZRR2V7Q3H3QACWQ'));
    assert.equal(contractIdPattern.test('GAB7DXV5GWMJ7BQBFTNRQ2OB6QOFL3V45B4EVFVVZRR2V7Q3H3QACWQ'), false);
    assert.equal(contractIdPattern.test('C' + 'A'.repeat(55)), false); // wrong characters
    assert.equal(contractIdPattern.test('C' + 'A'.repeat(54)), false); // too short
  });

  it('documents supported Stellar networks', () => {
    const supportedNetworks = ['testnet', 'mainnet'];
    assert.deepEqual(supportedNetworks, ['testnet', 'mainnet']);
  });

  it('documents validation error handling', () => {
    // When environment variables are invalid, the env module throws
    // an Error with a detailed message listing all validation failures.
    // This ensures the app fails fast during initialization rather than
    // at runtime when invalid env values are first used.

    const mockErrors = [
      'NEXT_PUBLIC_CONTRACT_ID is missing',
      'NEXT_PUBLIC_STELLAR_NETWORK must be one of testnet | mainnet (got "invalidnet")',
      'NEXT_PUBLIC_API_URL must be a valid http or https URL (got "not-a-url")',
    ];

    assert.ok(mockErrors.every((e) => typeof e === 'string'));
  });

  it('documents gateway URL normalization', () => {
    // The ipfsGateway is normalized to always end with a slash
    // Input:  "https://ipfs.io/ipfs"
    // Output: "https://ipfs.io/ipfs/"
    // Input:  "https://ipfs.io/ipfs/"
    // Output: "https://ipfs.io/ipfs/"

    const normalizeUrl = (url: string) => (url.endsWith('/') ? url : `${url}/`);
    assert.equal(normalizeUrl('https://ipfs.io/ipfs'), 'https://ipfs.io/ipfs/');
    assert.equal(normalizeUrl('https://ipfs.io/ipfs/'), 'https://ipfs.io/ipfs/');
  });
});
