/**
 * Smoke test — verifies the Jest + fast-check setup works and
 * that app.js exports are importable.
 */

const {
  formatCurrency,
  validateForm,
  buildChartData,
  loadFromStorage,
  saveToStorage,
} = require('../js/app.js');

const fc = require('fast-check');

describe('Setup smoke tests', () => {
  test('formatCurrency is exported and callable', () => {
    expect(typeof formatCurrency).toBe('function');
    const result = formatCurrency(0);
    expect(typeof result).toBe('string');
  });

  test('validateForm is exported and callable', () => {
    expect(typeof validateForm).toBe('function');
    const result = validateForm('Lunch', '45000');
    expect(result).toHaveProperty('valid');
    expect(result).toHaveProperty('errors');
  });

  test('buildChartData is exported and callable', () => {
    expect(typeof buildChartData).toBe('function');
    const result = buildChartData([]);
    expect(result).toHaveProperty('labels');
    expect(result).toHaveProperty('data');
    expect(result).toHaveProperty('colors');
  });

  test('loadFromStorage returns an array', () => {
    expect(typeof loadFromStorage).toBe('function');
    const result = loadFromStorage();
    expect(Array.isArray(result)).toBe(true);
  });

  test('fast-check is importable and fc.assert works', () => {
    expect(typeof fc.assert).toBe('function');
    // A trivial property that always holds
    fc.assert(
      fc.property(fc.integer(), (n) => typeof n === 'number'),
      { numRuns: 10 }
    );
  });
});
