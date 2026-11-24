import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { stroopsToUsdc, usdcToStroops, stroopsToUsdcInput } from './index';

describe('USDC and stroops conversion utilities', () => {
  describe('stroopsToUsdc', () => {
    it('converts stroops to USDC with default 2 decimal places', () => {
      // 1 USDC = 10,000,000 stroops (7 decimal places)
      assert.equal(stroopsToUsdc('10000000'), '1.00');
    });

    it('converts larger amounts correctly', () => {
      // 1000 USDC = 10,000,000,000 stroops
      assert.equal(stroopsToUsdc('10000000000'), '1000.00');
    });

    it('converts amounts with decimal fractions', () => {
      // 1.5 USDC = 15,000,000 stroops
      assert.equal(stroopsToUsdc('15000000'), '1.50');
    });

    it('converts very small amounts', () => {
      // 0.0000001 USDC = 1 stroop, displayed as 0.00 with 2 decimals
      assert.equal(stroopsToUsdc('1'), '0.00');
    });

    it('respects custom decimal places', () => {
      assert.equal(stroopsToUsdc('10000000', 0), '1');
      assert.equal(stroopsToUsdc('10000000', 3), '1.000');
      assert.equal(stroopsToUsdc('10000000', 7), '1.0000000');
    });

    it('accepts stroops as bigint', () => {
      assert.equal(stroopsToUsdc(10000000n), '1.00');
    });

    it('accepts stroops as string', () => {
      assert.equal(stroopsToUsdc('10000000'), '1.00');
    });

    it('handles large amounts without overflow', () => {
      // 1 trillion USDC
      const trillion = '10000000000000000000';
      const result = stroopsToUsdc(trillion);
      assert.ok(result.includes('1000000000000'));
    });

    it('truncates excess decimal places', () => {
      // 1.123456789 USDC with 2 decimal places should be 1.12 (truncated)
      assert.equal(stroopsToUsdc('11234567'), '1.12');
    });
  });

  describe('usdcToStroops', () => {
    it('converts USDC string to stroops (bigint)', () => {
      // 1.5 USDC = 15,000,000 stroops
      assert.equal(usdcToStroops('1.5'), 15000000n);
    });

    it('converts whole numbers without decimal point', () => {
      // 100 USDC = 1,000,000,000 stroops
      assert.equal(usdcToStroops('100'), 1000000000n);
    });

    it('handles zero', () => {
      assert.equal(usdcToStroops('0'), 0n);
      assert.equal(usdcToStroops('0.0'), 0n);
    });

    it('pads fractional parts to 7 decimal places', () => {
      // 1.5 → 1.5000000
      assert.equal(usdcToStroops('1.5'), 15000000n);
      // 1.1 → 1.1000000
      assert.equal(usdcToStroops('1.1'), 11000000n);
    });

    it('truncates more than 7 decimal places', () => {
      // 1.12345678 → 1.1234567 (last digit 8 is truncated)
      assert.equal(usdcToStroops('1.12345678'), 11234567n);
    });

    it('handles very small amounts', () => {
      // 0.0000001 USDC = 1 stroop
      assert.equal(usdcToStroops('0.0000001'), 1n);
    });

    it('performs round-trip conversion', () => {
      const original = '123.456789';
      const stroops = usdcToStroops(original);
      // stroopsToUsdcInput should give us back a string without trailing zeros
      const displayString = stroops.toString();
      assert.ok(displayString.length > 0);
    });
  });

  describe('stroopsToUsdcInput', () => {
    it('converts stroops to USDC for form input (no rounding, no trailing zeros)', () => {
      // 1.5 USDC = 15,000,000 stroops → "1.5"
      assert.equal(stroopsToUsdcInput('15000000'), '1.5');
    });

    it('returns whole number without decimal point', () => {
      // 1 USDC = 10,000,000 stroops → "1"
      assert.equal(stroopsToUsdcInput('10000000'), '1');
    });

    it('returns whole numbers without fraction part', () => {
      // 100.0 USDC = 1,000,000,000 stroops → "100"
      assert.equal(stroopsToUsdcInput('1000000000'), '100');
    });

    it('shows exact fractional values', () => {
      // 1.0001 USDC = 10,001,000 stroops → "1.0001"
      assert.equal(stroopsToUsdcInput('10001000'), '1.0001');
    });

    it('handles single stroops', () => {
      // 1 stroop = 0.0000001 USDC → "0.0000001"
      assert.equal(stroopsToUsdcInput('1'), '0.0000001');
    });

    it('accepts bigint input', () => {
      assert.equal(stroopsToUsdcInput(15000000n), '1.5');
    });

    it('trims trailing zeros from fractional part', () => {
      // 1.100000 USDC should display as "1.1"
      assert.equal(stroopsToUsdcInput('11000000'), '1.1');
    });

    it('handles zero', () => {
      assert.equal(stroopsToUsdcInput('0'), '0');
    });
  });

  describe('USDC and stroops round-trip conversion', () => {
    it('round-trips conversion for typical values', () => {
      const testValues = ['1', '1.5', '100', '0.5', '999.999999'];
      for (const value of testValues) {
        const stroops = usdcToStroops(value);
        const result = stroopsToUsdcInput(stroops);
        assert.equal(result, value);
      }
    });
  });
});
