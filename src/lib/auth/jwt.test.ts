import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { decodeJwtPayload, getTokenExpiry, isExpired } from './jwt';

describe('JWT utility functions', () => {
  describe('decodeJwtPayload', () => {
    it('decodes a valid JWT payload', () => {
      // This is a valid JWT structure with a base64url-encoded payload
      const token = 'header.eyJleHAiOjE2OTQ2MDAwMDB9.signature';
      const payload = decodeJwtPayload(token);
      assert.deepEqual(payload, { exp: 1694600000 });
    });

    it('returns null for a malformed JWT (not 3 parts)', () => {
      const token = 'invalid.token';
      const payload = decodeJwtPayload(token);
      assert.equal(payload, null);
    });

    it('returns null for a JWT with invalid base64 payload', () => {
      const token = 'header.!!!invalid!!!.signature';
      const payload = decodeJwtPayload(token);
      assert.equal(payload, null);
    });

    it('returns null for a JWT with non-object payload', () => {
      // "null" encoded in base64url
      const token = 'header.bnVsbA.signature';
      const payload = decodeJwtPayload(token);
      assert.equal(payload, null);
    });

    it('handles base64url padding correctly', () => {
      // Encode a payload without padding
      const payload = JSON.stringify({ iss: 'test' });
      const base64url = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const token = `header.${base64url}.signature`;
      const decoded = decodeJwtPayload(token);
      assert.deepEqual(decoded, { iss: 'test' });
    });

    it('handles UTF-8 characters in claims', () => {
      const payload = JSON.stringify({ sub: 'user-123', name: 'Jöhn Döe' });
      const base64url = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const token = `header.${base64url}.signature`;
      const decoded = decodeJwtPayload(token);
      assert.equal(decoded?.name, 'Jöhn Döe');
    });
  });

  describe('getTokenExpiry', () => {
    it('returns the expiry as a millisecond timestamp', () => {
      const expSeconds = 1694600000;
      const payload = JSON.stringify({ exp: expSeconds });
      const base64url = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const token = `header.${base64url}.signature`;
      const expiry = getTokenExpiry(token);
      assert.equal(expiry, expSeconds * 1000);
    });

    it('returns null when token has no exp claim', () => {
      const payload = JSON.stringify({ sub: 'user-123' });
      const base64url = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const token = `header.${base64url}.signature`;
      const expiry = getTokenExpiry(token);
      assert.equal(expiry, null);
    });

    it('returns null when exp is not a number', () => {
      const payload = JSON.stringify({ exp: 'not-a-number' });
      const base64url = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const token = `header.${base64url}.signature`;
      const expiry = getTokenExpiry(token);
      assert.equal(expiry, null);
    });

    it('returns null when exp is Infinity', () => {
      const payload = JSON.stringify({ exp: Infinity });
      const base64url = Buffer.from(payload).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
      const token = `header.${base64url}.signature`;
      const expiry = getTokenExpiry(token);
      assert.equal(expiry, null);
    });

    it('returns null for invalid token', () => {
      const expiry = getTokenExpiry('not.a.valid.jwt');
      assert.equal(expiry, null);
    });
  });

  describe('isExpired', () => {
    it('returns true when expiry is in the past', () => {
      const now = 1694600000;
      const expiresAt = 1694599999;
      assert.equal(isExpired(expiresAt, now), true);
    });

    it('returns true when expiry equals now', () => {
      const now = 1694600000;
      const expiresAt = 1694600000;
      assert.equal(isExpired(expiresAt, now), true);
    });

    it('returns false when expiry is in the future', () => {
      const now = 1694600000;
      const expiresAt = 1694600001;
      assert.equal(isExpired(expiresAt, now), false);
    });

    it('returns false when expiresAt is null', () => {
      const now = 1694600000;
      assert.equal(isExpired(null, now), false);
    });

    it('uses current time when now parameter is omitted', () => {
      const future = Date.now() + 1000;
      assert.equal(isExpired(future), false);
      const past = Date.now() - 1000;
      assert.equal(isExpired(past), true);
    });
  });
});
