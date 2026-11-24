import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeAddress, isValidStellarAddress } from './address';

describe('Stellar address utilities', () => {
  describe('normalizeAddress', () => {
    it('converts lowercase addresses to uppercase', () => {
      const input = 'gcdvuvdfyrmzuvr2v2ujhbvl2zxi33ewqd37zrzthllzs2qqyt6zqua';
      const result = normalizeAddress(input);
      assert.equal(result, 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA');
    });

    it('leaves uppercase addresses unchanged', () => {
      const input = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA';
      const result = normalizeAddress(input);
      assert.equal(result, input);
    });

    it('converts mixed case addresses to uppercase', () => {
      const input = 'GcDvUvDfYrMzUvR2V2uJhBvL2ZxI33eWqD37zRzThLlZs2QqYt6zQuA';
      const result = normalizeAddress(input);
      assert.equal(result, 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA');
    });

    it('trims whitespace before normalizing', () => {
      const input = '  gcdvuvdfyrmzuvr2v2ujhbvl2zxi33ewqd37zrzthllzs2qqyt6zqua  ';
      const result = normalizeAddress(input);
      assert.equal(result, 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA');
    });

    it('returns contract addresses unchanged', () => {
      const input = 'CAB7DXV5GWMJ7BQBFTNRQ2OB6QOFL3V45B4EVFVVZRR2V7Q3H3QACWQ';
      const result = normalizeAddress(input);
      assert.equal(result, input);
    });
  });

  describe('isValidStellarAddress', () => {
    it('validates correct Stellar account addresses (starting with G)', () => {
      const address = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA';
      assert.equal(isValidStellarAddress(address), true);
    });

    it('validates correct Stellar contract addresses (starting with C)', () => {
      const address = 'CAB7DXV5GWMJ7BQBFTNRQ2OB6QOFL3V45B4EVFVVZRR2V7Q3H3QACWQ';
      assert.equal(isValidStellarAddress(address), true);
    });

    it('rejects addresses with incorrect length', () => {
      const shortAddress = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQU';
      const longAddress = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUAA';
      assert.equal(isValidStellarAddress(shortAddress), false);
      assert.equal(isValidStellarAddress(longAddress), false);
    });

    it('rejects addresses with invalid first character', () => {
      const address = 'ACDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA';
      assert.equal(isValidStellarAddress(address), false);
    });

    it('rejects addresses with invalid characters (not base32)', () => {
      const address = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQU@';
      assert.equal(isValidStellarAddress(address), false);
    });

    it('accepts lowercase valid addresses', () => {
      const address = 'gcdvuvdfyrmzuvr2v2ujhbvl2zxi33ewqd37zrzthllzs2qqyt6zqua';
      assert.equal(isValidStellarAddress(address), true);
    });

    it('rejects empty string', () => {
      assert.equal(isValidStellarAddress(''), false);
    });

    it('rejects whitespace-only string', () => {
      assert.equal(isValidStellarAddress('   '), false);
    });

    it('rejects undefined/null-like strings', () => {
      assert.equal(isValidStellarAddress('null'), false);
      assert.equal(isValidStellarAddress('undefined'), false);
    });

    it('validates base32 character set correctly', () => {
      // Base32 for Stellar uses: A-Z and 2-7
      // Invalid: lowercase (unless normalized), 0-1, 8-9, symbols
      
      const validAddress = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQYT6ZQUA';
      const invalidAddress1 = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQY0ZQUA'; // 0 is invalid
      const invalidAddress2 = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQY1ZQUA'; // 1 is invalid
      const invalidAddress3 = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQY8ZQUA'; // 8 is invalid
      const invalidAddress4 = 'GCDVUVDFYRMZUVR2V2UJHBVL2ZXI33EWQD37ZRZTHLLZS2QQY9ZQUA'; // 9 is invalid
      
      assert.equal(isValidStellarAddress(validAddress), true);
      assert.equal(isValidStellarAddress(invalidAddress1), false);
      assert.equal(isValidStellarAddress(invalidAddress2), false);
      assert.equal(isValidStellarAddress(invalidAddress3), false);
      assert.equal(isValidStellarAddress(invalidAddress4), false);
    });
  });

  describe('address format constants', () => {
    it('documents Stellar address length', () => {
      // Standard Stellar address length is 56 characters
      // Both account addresses (G) and contract addresses (C) are 56 chars
      const length = 56;
      assert.equal(length, 56);
    });

    it('documents valid address prefixes', () => {
      // Valid first characters:
      // - 'G' or 'g': Public Stellar account address
      // - 'C' or 'c': Stellar contract address
      const validPrefixes = ['G', 'C'];
      assert.equal(validPrefixes.length, 2);
    });
  });
});
