/**
 * Tests for loadFromStorage() and saveToStorage() — Task 2.2
 * Requirement 5.2, 5.3, 5.4
 */

'use strict';

const fc = require('fast-check');
const { loadFromStorage, saveToStorage } = require('../js/app.js');

// Helper to build a valid transaction object
function makeTransaction(overrides = {}) {
  return {
    id: 'id-001',
    name: 'Lunch',
    amount: 45000,
    category: 'Food',
    timestamp: 1720000000000,
    ...overrides,
  };
}

describe('loadFromStorage()', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('returns [] when localStorage is empty', () => {
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when the key is absent', () => {
    // Ensure the key is not set
    localStorage.removeItem('expense_transactions');
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] and does not throw when localStorage has corrupted JSON', () => {
    localStorage.setItem('expense_transactions', '{this is not valid json{{');
    expect(() => loadFromStorage()).not.toThrow();
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when stored data is not an array (object)', () => {
    localStorage.setItem('expense_transactions', JSON.stringify({ id: 'x' }));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when stored data is not an array (null)', () => {
    localStorage.setItem('expense_transactions', JSON.stringify(null));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when stored data is not an array (number)', () => {
    localStorage.setItem('expense_transactions', JSON.stringify(42));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when any item has an invalid id (non-string)', () => {
    const data = [makeTransaction({ id: 123 })];
    localStorage.setItem('expense_transactions', JSON.stringify(data));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when any item has an invalid name (non-string)', () => {
    const data = [makeTransaction({ name: null })];
    localStorage.setItem('expense_transactions', JSON.stringify(data));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when any item has an invalid amount (string)', () => {
    const data = [makeTransaction({ amount: '45000' })];
    localStorage.setItem('expense_transactions', JSON.stringify(data));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when any item has an invalid category', () => {
    const data = [makeTransaction({ category: 'Shopping' })];
    localStorage.setItem('expense_transactions', JSON.stringify(data));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] when any item has an invalid timestamp (string)', () => {
    const data = [makeTransaction({ timestamp: '1720000000000' })];
    localStorage.setItem('expense_transactions', JSON.stringify(data));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns [] and discards entire array when one item is invalid among many valid ones', () => {
    const valid = makeTransaction({ id: 'id-001' });
    const invalid = makeTransaction({ id: 'id-002', category: 'Groceries' }); // bad category
    localStorage.setItem('expense_transactions', JSON.stringify([valid, invalid]));
    expect(loadFromStorage()).toEqual([]);
  });

  test('returns the full valid array when all items pass validation', () => {
    const txns = [
      makeTransaction({ id: 'id-001', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1720000000000 }),
      makeTransaction({ id: 'id-002', name: 'Grab', amount: 25000, category: 'Transport', timestamp: 1720000001000 }),
    ];
    localStorage.setItem('expense_transactions', JSON.stringify(txns));
    expect(loadFromStorage()).toEqual(txns);
  });

  test('returns empty array when stored JSON is an empty array', () => {
    localStorage.setItem('expense_transactions', JSON.stringify([]));
    expect(loadFromStorage()).toEqual([]);
  });
});

describe('saveToStorage(txns)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('writes serialized transactions to localStorage', () => {
    const txns = [makeTransaction()];
    saveToStorage(txns);
    const raw = localStorage.getItem('expense_transactions');
    expect(JSON.parse(raw)).toEqual(txns);
  });

  test('overwrites previously stored data', () => {
    const first = [makeTransaction({ id: 'id-001', name: 'Lunch' })];
    const second = [makeTransaction({ id: 'id-002', name: 'Dinner', amount: 60000 })];
    saveToStorage(first);
    saveToStorage(second);
    expect(JSON.parse(localStorage.getItem('expense_transactions'))).toEqual(second);
  });

  test('throws when localStorage.setItem throws QuotaExceededError', () => {
    const originalSetItem = localStorage.setItem.bind(localStorage);
    jest.spyOn(localStorage.__proto__, 'setItem').mockImplementation(() => {
      const err = new DOMException('QuotaExceededError', 'QuotaExceededError');
      throw err;
    });
    expect(() => saveToStorage([makeTransaction()])).toThrow();
    // Restore is handled by restoreMocks: true in jest.config.js
  });
});

describe('saveToStorage + loadFromStorage round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('saved data is recovered correctly after a round-trip', () => {
    const txns = [
      { id: 'abc-1', name: 'Coffee', amount: 15000, category: 'Food', timestamp: 1720000000001 },
      { id: 'abc-2', name: 'Bus', amount: 5000, category: 'Transport', timestamp: 1720000000002 },
      { id: 'abc-3', name: 'Movie', amount: 75000, category: 'Fun', timestamp: 1720000000003 },
    ];
    saveToStorage(txns);
    const recovered = loadFromStorage();
    expect(recovered).toEqual(txns);
  });

  test('round-trip with empty array returns empty array', () => {
    saveToStorage([]);
    expect(loadFromStorage()).toEqual([]);
  });

  test('round-trip preserves all Transaction fields accurately', () => {
    const tx = {
      id: 'unique-id-xyz',
      name: 'Nasi Goreng',
      amount: 35000,
      category: 'Food',
      timestamp: 1720099999999,
    };
    saveToStorage([tx]);
    const [recovered] = loadFromStorage();
    expect(recovered.id).toBe(tx.id);
    expect(recovered.name).toBe(tx.name);
    expect(recovered.amount).toBe(tx.amount);
    expect(recovered.category).toBe(tx.category);
    expect(recovered.timestamp).toBe(tx.timestamp);
  });
});

// ---------------------------------------------------------------
// Property-Based Tests
// ---------------------------------------------------------------

/**
 * A fast-check arbitrary that generates a valid Transaction object.
 */
function validTransactionArbitrary() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    amount: fc.float({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
    category: fc.constantFrom('Food', 'Transport', 'Fun'),
    timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  });
}

describe('Property-based: storage round-trip (P8)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Feature: expense-budget-visualizer, Property 8: Data loading is a round-trip through serialization
  test('P8: saveToStorage then loadFromStorage deeply equals original array', () => {
    // **Validates: Requirements 5.2**
    fc.assert(
      fc.property(
        fc.array(validTransactionArbitrary(), { minLength: 0, maxLength: 20 }),
        (txns) => {
          localStorage.clear();
          saveToStorage(txns);
          const recovered = loadFromStorage();
          // Same length
          expect(recovered).toHaveLength(txns.length);
          // Deep equality for each entry
          txns.forEach((original, i) => {
            expect(recovered[i].id).toBe(original.id);
            expect(recovered[i].name).toBe(original.name);
            expect(recovered[i].amount).toBeCloseTo(original.amount, 5);
            expect(recovered[i].category).toBe(original.category);
            expect(recovered[i].timestamp).toBe(original.timestamp);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
