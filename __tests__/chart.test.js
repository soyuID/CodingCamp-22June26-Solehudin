/**
 * Tests for buildChartData(txns) — Task 5.5
 * Requirements: 4.1, 4.2, 4.3
 *
 * Note: renderChart calls `new Chart(...)` which is a CDN-only dependency not
 * available in Jest/jsdom. Tests for renderChart that require Chart.js are
 * intentionally skipped. All property and unit tests focus on buildChartData,
 * which is a pure function with no external dependencies.
 */

'use strict';

const fc = require('fast-check');
const { buildChartData } = require('../js/app.js');

const VALID_CATEGORIES = ['Food', 'Transport', 'Fun'];

/* ---------------------------------------------------------------
   Unit tests — buildChartData(txns)
--------------------------------------------------------------- */

describe('buildChartData(txns) — unit tests', () => {
  test('returns empty labels, data, and colors for an empty array', () => {
    const result = buildChartData([]);
    expect(result.labels).toEqual([]);
    expect(result.data).toEqual([]);
    expect(result.colors).toEqual([]);
  });

  test('returns correct structure for a single Food transaction', () => {
    const txns = [{ id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 }];
    const { labels, data, colors } = buildChartData(txns);
    expect(labels).toEqual(['Food']);
    expect(data).toEqual([45000]);
    expect(colors).toHaveLength(1);
    expect(typeof colors[0]).toBe('string');
  });

  test('returns correct structure for a single Transport transaction', () => {
    const txns = [{ id: '2', name: 'Grab', amount: 25000, category: 'Transport', timestamp: 2 }];
    const { labels, data, colors } = buildChartData(txns);
    expect(labels).toEqual(['Transport']);
    expect(data).toEqual([25000]);
  });

  test('returns correct structure for a single Fun transaction', () => {
    const txns = [{ id: '3', name: 'Movie', amount: 60000, category: 'Fun', timestamp: 3 }];
    const { labels, data, colors } = buildChartData(txns);
    expect(labels).toEqual(['Fun']);
    expect(data).toEqual([60000]);
  });

  test('aggregates multiple transactions within the same category', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 30000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Dinner', amount: 50000, category: 'Food', timestamp: 2 },
    ];
    const { labels, data } = buildChartData(txns);
    expect(labels).toEqual(['Food']);
    expect(data).toEqual([80000]);
  });

  test('returns all three categories when each has spending', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Grab', amount: 25000, category: 'Transport', timestamp: 2 },
      { id: '3', name: 'Movie', amount: 60000, category: 'Fun', timestamp: 3 },
    ];
    const { labels, data } = buildChartData(txns);
    expect(labels).toHaveLength(3);
    expect(labels).toContain('Food');
    expect(labels).toContain('Transport');
    expect(labels).toContain('Fun');

    const foodIdx = labels.indexOf('Food');
    const transportIdx = labels.indexOf('Transport');
    const funIdx = labels.indexOf('Fun');

    expect(data[foodIdx]).toBe(45000);
    expect(data[transportIdx]).toBe(25000);
    expect(data[funIdx]).toBe(60000);
  });

  test('excludes a category with zero spending (Transport missing)', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Movie', amount: 60000, category: 'Fun', timestamp: 2 },
    ];
    const { labels, data } = buildChartData(txns);
    expect(labels).not.toContain('Transport');
    expect(labels).toContain('Food');
    expect(labels).toContain('Fun');
    expect(data).toHaveLength(2);
    data.forEach((v) => expect(v).toBeGreaterThan(0));
  });

  test('excludes all categories with zero spending — returns empty arrays', () => {
    // Transactions with amount 0 should result in no categories shown
    // (In practice, valid transactions have amount > 0, but buildChartData is pure)
    const txns = [
      { id: '1', name: 'Freebie', amount: 0, category: 'Food', timestamp: 1 },
    ];
    const { labels, data, colors } = buildChartData(txns);
    expect(labels).toEqual([]);
    expect(data).toEqual([]);
    expect(colors).toEqual([]);
  });

  test('labels, data, and colors arrays have the same length', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Grab', amount: 25000, category: 'Transport', timestamp: 2 },
    ];
    const { labels, data, colors } = buildChartData(txns);
    expect(labels.length).toBe(data.length);
    expect(data.length).toBe(colors.length);
  });

  test('each label has a corresponding color string', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 },
      { id: '2', name: 'Grab', amount: 25000, category: 'Transport', timestamp: 2 },
      { id: '3', name: 'Movie', amount: 60000, category: 'Fun', timestamp: 3 },
    ];
    const { labels, colors } = buildChartData(txns);
    labels.forEach((label, i) => {
      expect(typeof colors[i]).toBe('string');
      expect(colors[i].length).toBeGreaterThan(0);
    });
  });
});

/* ---------------------------------------------------------------
   Property-Based Tests
   Feature: expense-budget-visualizer, Property 7: Chart data preparation excludes zero-spending categories
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

// Feature: expense-budget-visualizer, Property 7: Chart data preparation excludes zero-spending categories
describe('Property-based: buildChartData (P7)', () => {
  // **Validates: Requirements 4.1**
  test('P7: buildChartData excludes zero-spending categories for any transaction array', () => {
    fc.assert(
      fc.property(
        fc.array(validTransactionArbitrary(), { minLength: 0, maxLength: 30 }),
        (txns) => {
          const { labels, data, colors } = buildChartData(txns);

          // Arrays must all be the same length
          expect(labels.length).toBe(data.length);
          expect(data.length).toBe(colors.length);

          // No zero values in data (zero-spending categories are excluded)
          data.forEach((v) => expect(v).toBeGreaterThan(0));

          // Every label is a valid category
          labels.forEach((l) => expect(VALID_CATEGORIES).toContain(l));

          // No duplicate labels
          const uniqueLabels = new Set(labels);
          expect(uniqueLabels.size).toBe(labels.length);

          // Each data value equals the exact sum of amounts for its category
          labels.forEach((label, i) => {
            const expected = txns
              .filter((t) => t.category === label)
              .reduce((s, t) => s + t.amount, 0);
            expect(data[i]).toBeCloseTo(expected, 5);
          });
        }
      ),
      { numRuns: 100 }
    );
  });
});
