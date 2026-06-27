# Implementation Plan: Expense & Budget Visualizer

## Overview

Implement a zero-dependency, single-page expense tracker using plain HTML, CSS, and vanilla JavaScript. The implementation follows a unidirectional data flow: user action → validate → persist to localStorage → update in-memory state → re-render all UI components. Tests are written with Jest and fast-check.

## Tasks

- [x] 1. Set up project file structure and HTML skeleton
  - Create `index.html` with semantic sections: error banner, balance display, chart canvas, transaction form, and transaction list
  - Create `css/styles.css` with placeholder CSS file
  - Create `js/app.js` with placeholder JS file
  - Wire Chart.js v4 CDN `<script>` tag into `index.html`
  - Set up Jest + fast-check as dev dependencies (`package.json`, `jest.config.js`)
  - _Requirements: 6.1, 6.2_

- [ ] 2. Implement utility and persistence layer
  - [x] 2.1 Implement `formatCurrency(amount)` utility
    - Use `Intl.NumberFormat` to format amounts (e.g., `"Rp 45.000"`)
    - _Requirements: 2.1, 3.1_

  - [ ] 2.2 Implement `loadFromStorage()` and `saveToStorage(txns)`
    - `loadFromStorage`: read and `JSON.parse` from `"expense_transactions"` key; return `[]` on empty; discard and return `[]` on corrupted/non-array data; validate each item's shape
    - `saveToStorage`: JSON-serialize and write; throw on `QuotaExceededError`
    - Export both functions for testing
    - _Requirements: 5.2, 5.3, 5.4_

- [x] 3. Implement form validation and transaction mutations
  - [x] 3.1 Implement `validateForm(name, amountStr)`
    - Returns `{ valid: boolean, errors: string[] }`
    - Reject: empty/whitespace-only name, name > 100 chars, amount ≤ 0, amount > 999,999,999.99, missing/NaN amount
    - Export for testing
    - _Requirements: 1.1, 1.4_

  
  - [x] 3.3 Implement `addTransaction(tx)` and `deleteTransaction(id)`
    - `addTransaction`: call `saveToStorage` first; on success push to `transactions`; on failure (quota) revert and call `showError`
    - `deleteTransaction`: call `saveToStorage` first with the filtered array; on success update `transactions`; on failure revert and call `showError`
    - Each transaction object: `{ id, name, amount, category, timestamp }`
    - Use `crypto.randomUUID()` with fallback to `Date.now().toString() + Math.random()`
    - Export for testing
    - _Requirements: 1.2, 1.5, 2.3, 5.3, 5.4_

  
- [ ] 4. Checkpoint — Ensure all persistence and validation tests pass
  - Run `jest --testPathPattern="storage|validate"` and confirm all pass; ask the user if questions arise.

- [x] 5. Implement rendering functions
  - [x] 5.1 Implement `renderTransactionList(txns)`
    - Sort descending by `timestamp`; render each transaction as `<li>` with name, formatted amount, category badge, and delete `<button data-id="...">`
    - Render `<li class="empty-state">No transactions yet.</li>` when `txns.length === 0`
    - Apply `overflow-y: auto` (or `scroll`) on the list container to satisfy scrollability requirement
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  
  - [x] 5.3 Implement `renderBalance(txns)`
    - Sum all `amount` fields; display via `formatCurrency(sum)`; show `formatCurrency(0)` for empty array
    - _Requirements: 3.1, 3.2_


  - [x] 5.5 Implement `buildChartData(txns)` and `renderChart(txns)`
    - `buildChartData`: aggregate amounts per category; exclude categories with zero total; return `{ labels, data, colors }`
    - `renderChart`: if no data show `#chart-no-data` overlay and skip Chart.js; otherwise hide overlay, call `chartInstance.destroy()` if exists, create `new Chart(ctx, config)`
    - _Requirements: 4.1, 4.2, 4.3_


  - [x] 5.7 Implement `renderAll(transactions)`
    - Calls `renderTransactionList`, `renderBalance`, and `renderChart` in sequence
    - _Requirements: 3.2, 4.2_

- [x] 6. Implement error display and app initialization
  - [x] 6.1 Implement `showError(message)` and `clearErrors()`
    - `showError`: set text content on `#error-banner`, remove `hidden` class, `setTimeout(5000)` to re-add `hidden`
    - `clearErrors`: clear inline form error messages
    - _Requirements: 1.4, 1.5, 5.3, 5.4_

  - [x] 6.2 Implement `handleFormSubmit(event)` and app boot sequence
    - `handleFormSubmit`: `preventDefault`, call `validateForm`, show inline errors on failure, call `addTransaction` + reset form on success
    - Boot: `DOMContentLoaded` → call `loadFromStorage` → populate `transactions` → call `renderAll`; handle corrupted data by calling `showError` and rendering empty state
    - Attach `handleFormSubmit` to the form's `submit` event; attach delete handler via event delegation on `#transaction-list`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 5.1, 5.3, 5.4_


- [ ] 7. Checkpoint — Ensure all rendering and interaction tests pass
  - Run `jest` and confirm all tests pass; ask the user if questions arise.

- [x] 8. Implement CSS styles and responsive layout
  - [x] 8.1 Write `css/styles.css` — base layout, typography hierarchy, component styles
    - Balance font-size > chart label size > transaction list item font-size
    - Uniform vertical spacing between balance, chart, and list sections
    - `overflow-y: auto` on `#transaction-list` container for scrollability
    - _Requirements: 7.1_

  - [x] 8.2 Add responsive media query for viewport < 600px
    - Stack balance, chart, and list vertically in that order using flexbox `flex-direction: column`
    - Eliminate any horizontal scrollbar (`max-width: 100%; box-sizing: border-box`)
    - _Requirements: 7.2_


- [ ] 9. Final checkpoint — Full test suite and cross-browser smoke check
  - Run `jest --coverage` and confirm all tests pass with no regressions
  - Manually verify the app loads in Chrome, Firefox, Edge, and Safari
  - Confirm the app becomes interactive within 3 seconds on a standard connection
  - Ask the user if questions arise.
  - _Requirements: 6.2, 6.3_

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- The design specifies vanilla JS with no build step — do not introduce a bundler or transpiler
- All property tests must run a **minimum of 100 iterations** (`{ numRuns: 100 }`)
- Each property test must carry the tag comment: `// Feature: expense-budget-visualizer, Property N: <title>`
- `saveToStorage` must always be called **before** mutating the in-memory `transactions` array so that a storage failure can be caught without corrupting state
- Chart.js `destroy()` must be called before recreating the chart instance to prevent canvas-reuse errors
- The `crypto.randomUUID()` fallback (`Date.now().toString() + Math.random()`) must be implemented for compatibility with older browsers
- Checkpoints are for the executing agent to self-verify; they are not user-facing steps

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["2.1", "2.2"] },
    { "id": 1, "tasks": ["2.3", "2.4", "3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3"] },
    { "id": 3, "tasks": ["3.4", "3.5", "5.1", "5.3", "5.5"] },
    { "id": 4, "tasks": ["5.2", "5.4", "5.6", "5.7", "6.1"] },
    { "id": 5, "tasks": ["6.2"] },
    { "id": 6, "tasks": ["6.3", "6.4", "8.1"] },
    { "id": 7, "tasks": ["8.2"] },
    { "id": 8, "tasks": ["8.3"] }
  ]
}
```
