/**
 * Tests for validateForm(name, amountStr) — Task 3.1
 * Requirements: 1.1, 1.4
 *
 * Also includes tests for formatCurrency(amount) — Task 2.1
 * Requirements: 2.1, 3.1
 */

'use strict';

const fc = require('fast-check');
const { formatCurrency, validateForm } = require('../js/app.js');

/* ---------------------------------------------------------------
   formatCurrency tests (kept from prior task)
--------------------------------------------------------------- */

describe('formatCurrency(amount)', () => {
  test('formats a typical amount in Rupiah style', () => {
    const result = formatCurrency(45000);
    expect(result).toMatch(/Rp/);
    expect(result).toMatch(/45[.,]?000/);
  });

  test('formats zero as Rp 0 (or equivalent zero value)', () => {
    const result = formatCurrency(0);
    expect(result).toMatch(/Rp/);
    expect(result).toMatch(/0/);
  });

  test('returns a string', () => {
    expect(typeof formatCurrency(45000)).toBe('string');
    expect(typeof formatCurrency(0)).toBe('string');
    expect(typeof formatCurrency(1000000)).toBe('string');
  });

  test('formats amounts without fractional digits (minimumFractionDigits: 0)', () => {
    const result = formatCurrency(45000);
    expect(result).not.toMatch(/[,.]00$/);
  });

  test('formats large amounts correctly', () => {
    const result = formatCurrency(1000000);
    expect(result).toMatch(/Rp/);
    expect(result).toMatch(/1[.,]000[.,]000|1\.000\.000/);
  });

  test('formats small amounts correctly', () => {
    const result = formatCurrency(1000);
    expect(result).toMatch(/Rp/);
    expect(result).toMatch(/1[.,]?000/);
  });

  test('result starts with or contains "Rp"', () => {
    const result = formatCurrency(25000);
    expect(result).toContain('Rp');
  });

  test('formatCurrency(0) does not throw', () => {
    expect(() => formatCurrency(0)).not.toThrow();
  });
});

/* ---------------------------------------------------------------
   validateForm unit tests — Task 3.1
--------------------------------------------------------------- */

describe('validateForm(name, amountStr)', () => {
  // --- Valid inputs ---
  test('valid name and amount returns { valid: true, errors: [] }', () => {
    const result = validateForm('Coffee', '15000');
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('valid name with amount at lower boundary (0.01) is valid', () => {
    const result = validateForm('Tea', '0.01');
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('valid name with amount at upper boundary (999999999.99) is valid', () => {
    const result = validateForm('Big Purchase', '999999999.99');
    expect(result).toEqual({ valid: true, errors: [] });
  });

  test('name with leading/trailing spaces is valid when trimmed content is non-empty', () => {
    const result = validateForm('  Coffee  ', '5000');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  // --- Name validation ---
  test('empty name returns invalid with an error', () => {
    const result = validateForm('', '5000');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('whitespace-only name returns invalid with an error', () => {
    const result = validateForm('   ', '5000');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('name exactly 100 characters is valid', () => {
    const name = 'a'.repeat(100);
    const result = validateForm(name, '5000');
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  test('name longer than 100 characters returns invalid', () => {
    const name = 'a'.repeat(101);
    const result = validateForm(name, '5000');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  // --- Amount validation ---
  test('amount of 0 returns invalid', () => {
    const result = validateForm('Coffee', '0');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('negative amount returns invalid', () => {
    const result = validateForm('Coffee', '-100');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('amount exceeding 999999999.99 returns invalid', () => {
    const result = validateForm('Coffee', '1000000000');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('amount just above the maximum (999999999.999) returns invalid', () => {
    const result = validateForm('Coffee', '999999999.999');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('missing amount (undefined) returns invalid', () => {
    const result = validateForm('Coffee', undefined);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('null amount returns invalid', () => {
    const result = validateForm('Coffee', null);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('empty string amount returns invalid', () => {
    const result = validateForm('Coffee', '');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('non-numeric amount string (NaN) returns invalid', () => {
    const result = validateForm('Coffee', 'abc');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  test('both name and amount invalid returns multiple errors', () => {
    const result = validateForm('', '-5');
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });

  test('return value always has valid boolean and errors array', () => {
    const result = validateForm('Test', '100');
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
  });
});

/* ---------------------------------------------------------------
   Property-based tests — Task 3.1
   Feature: expense-budget-visualizer, Property 2: Invalid inputs are always rejected
--------------------------------------------------------------- */

// Feature: expense-budget-visualizer, Property 2: Invalid inputs are always rejected
describe('validateForm property-based tests', () => {
  test('Property 2a: valid name (1–100 non-whitespace-only chars) + valid amount always passes', () => {
    // **Validates: Requirements 1.1, 1.4**
    fc.assert(
      fc.property(
        // name: non-empty string, trimmed length 1–100
        fc.stringOf(fc.char(), { minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        // amount: float in valid range (0.01 to 999999999.99)
        fc.float({ min: 0.01, max: 999999999.99, noNaN: true }).filter(n => n > 0),
        (name, amount) => {
          const result = validateForm(name, String(amount));
          return result.valid === true && result.errors.length === 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2b: empty or whitespace-only name always returns invalid', () => {
    // **Validates: Requirements 1.1, 1.4**
    fc.assert(
      fc.property(
        // whitespace-only strings
        fc.stringOf(fc.constantFrom(' ', '\t', '\n', '\r'), { minLength: 0, maxLength: 50 }),
        fc.float({ min: 0.01, max: 999999999.99, noNaN: true }).filter(n => n > 0),
        (name, amount) => {
          const result = validateForm(name, String(amount));
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2c: name longer than 100 characters always returns invalid', () => {
    // **Validates: Requirements 1.1, 1.4**
    fc.assert(
      fc.property(
        // name exceeding 100 chars
        fc.stringOf(fc.char(), { minLength: 101, maxLength: 200 }),
        fc.float({ min: 0.01, max: 999999999.99, noNaN: true }).filter(n => n > 0),
        (name, amount) => {
          const result = validateForm(name, String(amount));
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2d: amount <= 0 always returns invalid', () => {
    // **Validates: Requirements 1.1, 1.4**
    fc.assert(
      fc.property(
        fc.stringOf(fc.char(), { minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        // amount <= 0
        fc.oneof(
          fc.constant(0),
          fc.float({ min: -999999999, max: -0.001, noNaN: true })
        ),
        (name, amount) => {
          const result = validateForm(name, String(amount));
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2e: amount exceeding 999999999.99 always returns invalid', () => {
    // **Validates: Requirements 1.1, 1.4**
    fc.assert(
      fc.property(
        fc.stringOf(fc.char(), { minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),
        // amount > 999999999.99
        fc.integer({ min: 1000000000, max: 9999999999 }),
        (name, amount) => {
          const result = validateForm(name, String(amount));
          return result.valid === false && result.errors.length > 0;
        }
      ),
      { numRuns: 100 }
    );
  });

  test('Property 2f: result always has boolean valid field and array errors field', () => {
    // **Validates: Requirements 1.1, 1.4**
    fc.assert(
      fc.property(
        fc.string(),
        fc.string(),
        (name, amountStr) => {
          const result = validateForm(name, amountStr);
          return (
            typeof result.valid === 'boolean' &&
            Array.isArray(result.errors) &&
            (result.valid === (result.errors.length === 0))
          );
        }
      ),
      { numRuns: 100 }
    );
  });
});
