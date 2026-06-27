/**
 * Tests for renderBalance(txns) — Task 5.3
 * Requirements: 3.1, 3.2
 *
 * Also covers formatCurrency(amount) as used by renderBalance.
 */

'use strict';

const fc = require('fast-check');
const { renderBalance, formatCurrency } = require('../js/app.js');

/* ---------------------------------------------------------------
   DOM Setup
--------------------------------------------------------------- */

/**
 * Create a minimal DOM environment with a #balance element.
 * Each test gets a fresh element via beforeEach.
 */
function setupBalanceDom() {
  document.body.innerHTML = '<p id="balance">Rp 0</p>';
}

function getBalanceText() {
  return document.getElementById('balance').textContent;
}

/* ---------------------------------------------------------------
   Unit tests — renderBalance(txns)
--------------------------------------------------------------- */

describe('renderBalance(txns) — unit tests', () => {
  beforeEach(() => {
    setupBalanceDom();
  });

  test('displays Rp 0 for an empty array', () => {
    renderBalance([]);
    const text = getBalanceText();
    expect(text).toMatch(/Rp/);
    expect(text).toMatch(/0/);
  });

  test('displays the formatted sum for a single transaction', () => {
    const txns = [{ id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 }];
    renderBalance(txns);
    expect(getBalanceText()).toBe(formatCurrency(45000));
  });

  test('displays the sum of multiple transactions', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Grab', amount: 25000, category: 'Transport', timestamp: 2 },
    ];
    renderBalance(txns);
    expect(getBalanceText()).toBe(formatCurrency(70000));
  });

  test('displays formatCurrency(0) when txns is empty (Requirement 3.1 zero case)', () => {
    renderBalance([]);
    expect(getBalanceText()).toBe(formatCurrency(0));
  });

  test('sum includes all transaction amounts regardless of category', () => {
    const txns = [
      { id: '1', name: 'A', amount: 10000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'B', amount: 20000, category: 'Transport', timestamp: 2 },
      { id: '3', name: 'C', amount: 15000, category: 'Fun', timestamp: 3 },
    ];
    renderBalance(txns);
    expect(getBalanceText()).toBe(formatCurrency(45000));
  });

  test('does not throw when #balance element is absent', () => {
    document.body.innerHTML = ''; // remove #balance
    expect(() => renderBalance([])).not.toThrow();
    expect(() => renderBalance([{ id: '1', name: 'X', amount: 1000, category: 'Food', timestamp: 1 }])).not.toThrow();
  });

  test('updates synchronously — balance reflects new total immediately after re-render', () => {
    const txns = [{ id: '1', name: 'Coffee', amount: 15000, category: 'Food', timestamp: 1 }];
    renderBalance(txns);
    expect(getBalanceText()).toBe(formatCurrency(15000));

    // Simulate adding a transaction (Requirement 3.2: synchronous update)
    const updatedTxns = [
      ...txns,
      { id: '2', name: 'Tea', amount: 5000, category: 'Food', timestamp: 2 },
    ];
    renderBalance(updatedTxns);
    expect(getBalanceText()).toBe(formatCurrency(20000));
  });

  test('updates synchronously after deletion', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Grab', amount: 25000, category: 'Transport', timestamp: 2 },
    ];
    renderBalance(txns);
    expect(getBalanceText()).toBe(formatCurrency(70000));

    // Simulate deleting the first transaction (Requirement 3.2)
    renderBalance([txns[1]]);
    expect(getBalanceText()).toBe(formatCurrency(25000));
  });

  test('text content is set, not appended', () => {
    const txns = [{ id: '1', name: 'X', amount: 10000, category: 'Food', timestamp: 1 }];
    renderBalance(txns);
    renderBalance(txns);
    // Should not accumulate/duplicate content
    expect(getBalanceText()).toBe(formatCurrency(10000));
  });
});

/* ---------------------------------------------------------------
   Property-Based Tests
   Feature: expense-budget-visualizer, Property 6: Balance always equals sum
--------------------------------------------------------------- */

function validTransactionArbitrary() {
  return fc.record({
    id: fc.string({ minLength: 1, maxLength: 36 }),
    name: fc.string({ minLength: 1, maxLength: 100 }).filter((s) => s.trim().length > 0),
    amount: fc.float({ min: 0.01, max: 999999999.99, noNaN: true, noDefaultInfinity: true }),
    category: fc.constantFrom('Food', 'Transport', 'Fun'),
    timestamp: fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
  });
}

// Feature: expense-budget-visualizer, Property 6: Balance always equals the sum of all transaction amounts
describe('Property-based: renderBalance (P6)', () => {
  beforeEach(() => {
    setupBalanceDom();
  });

  // **Validates: Requirements 3.1, 3.2**
  test('P6: rendered balance equals formatCurrency(sum of amounts) for any transaction array', () => {
    fc.assert(
      fc.property(
        fc.array(validTransactionArbitrary(), { minLength: 0, maxLength: 20 }),
        (txns) => {
          setupBalanceDom(); // reset DOM for each iteration
          renderBalance(txns);
          const expectedSum = txns.reduce((acc, t) => acc + t.amount, 0);
          const expected = formatCurrency(expectedSum);
          const actual = getBalanceText();
          expect(actual).toBe(expected);
        }
      ),
      { numRuns: 100 }
    );
  });

  // **Validates: Requirements 3.1**
  test('P6 (empty): renderBalance([]) always shows formatCurrency(0)', () => {
    renderBalance([]);
    expect(getBalanceText()).toBe(formatCurrency(0));
  });
});
