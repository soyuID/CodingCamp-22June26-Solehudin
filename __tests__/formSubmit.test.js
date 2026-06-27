/**
 * Tests for handleFormSubmit(event) and app boot sequence — Task 6.2
 * Requirements: 1.2, 1.3, 1.4, 1.5, 5.1, 5.3, 5.4
 */

'use strict';

const {
  handleFormSubmit,
  loadFromStorage,
  saveToStorage,
  deleteTransaction,
  getTransactions,
  setTransactions,
  renderAll,
  clearErrors,
} = require('../js/app.js');

/* ---------------------------------------------------------------
   DOM Setup Helpers
--------------------------------------------------------------- */

function setupDom() {
  document.body.innerHTML = `
    <div id="error-banner" class="hidden"></div>
    <p id="balance">Rp 0</p>
    <ul id="transaction-list"></ul>
    <form id="transaction-form" novalidate>
      <input type="text" name="name" id="tx-name" />
      <span class="field-error" id="error-name"></span>
      <input type="number" name="amount" id="tx-amount" />
      <span class="field-error" id="error-amount"></span>
      <select name="category" id="tx-category">
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Fun">Fun</option>
      </select>
      <button type="submit">Add</button>
    </form>
  `;
}

/**
 * Build a synthetic submit event whose target is the form.
 */
function makeSubmitEvent(name, amount, category = 'Food') {
  const form = document.getElementById('transaction-form');
  form.elements['name'].value = name;
  form.elements['amount'].value = amount;
  form.elements['category'].value = category;

  const event = new Event('submit', { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'target', { writable: false, value: form });
  return event;
}

/* ---------------------------------------------------------------
   handleFormSubmit — success path
--------------------------------------------------------------- */

describe('handleFormSubmit — valid submission (Req 1.2, 1.3)', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    setTransactions([]);
  });

  test('preventDefault is called — page does not navigate', () => {
    const event = makeSubmitEvent('Coffee', '15000');
    const preventSpy = jest.spyOn(event, 'preventDefault');
    handleFormSubmit(event);
    expect(preventSpy).toHaveBeenCalledTimes(1);
  });

  test('valid submission adds a transaction (Req 1.2)', () => {
    handleFormSubmit(makeSubmitEvent('Lunch', '45000', 'Food'));
    expect(getTransactions()).toHaveLength(1);
    expect(getTransactions()[0].name).toBe('Lunch');
    expect(getTransactions()[0].amount).toBe(45000);
    expect(getTransactions()[0].category).toBe('Food');
  });

  test('valid submission persists to localStorage (Req 5.3)', () => {
    handleFormSubmit(makeSubmitEvent('Grab', '25000', 'Transport'));
    const stored = loadFromStorage();
    expect(stored).toHaveLength(1);
    expect(stored[0].name).toBe('Grab');
  });

  test('form resets to defaults after valid submission (Req 1.3)', () => {
    const event = makeSubmitEvent('Movie', '60000', 'Fun');
    handleFormSubmit(event);
    const form = document.getElementById('transaction-form');
    expect(form.elements['name'].value).toBe('');
    expect(form.elements['amount'].value).toBe('');
    expect(form.elements['category'].value).toBe('Food');
  });

  test('balance display is updated after valid submission', () => {
    handleFormSubmit(makeSubmitEvent('Tea', '5000', 'Food'));
    const balanceText = document.getElementById('balance').textContent;
    expect(balanceText).toMatch(/5[.,]?000/);
  });

  test('transaction list shows the new entry after valid submission', () => {
    handleFormSubmit(makeSubmitEvent('Bus', '3000', 'Transport'));
    const list = document.getElementById('transaction-list');
    expect(list.innerHTML).toContain('Bus');
  });

  test('no inline errors are shown after valid submission', () => {
    handleFormSubmit(makeSubmitEvent('Coffee', '10000', 'Food'));
    expect(document.getElementById('error-name').textContent).toBe('');
    expect(document.getElementById('error-amount').textContent).toBe('');
  });
});

/* ---------------------------------------------------------------
   handleFormSubmit — validation failure path (Req 1.4)
--------------------------------------------------------------- */

describe('handleFormSubmit — invalid submission (Req 1.4)', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    setTransactions([]);
  });

  test('empty name shows inline error on #error-name', () => {
    handleFormSubmit(makeSubmitEvent('', '15000'));
    expect(document.getElementById('error-name').textContent).not.toBe('');
  });

  test('empty amount shows inline error on #error-amount', () => {
    handleFormSubmit(makeSubmitEvent('Coffee', ''));
    expect(document.getElementById('error-amount').textContent).not.toBe('');
  });

  test('zero amount shows inline error on #error-amount', () => {
    handleFormSubmit(makeSubmitEvent('Coffee', '0'));
    expect(document.getElementById('error-amount').textContent).not.toBe('');
  });

  test('negative amount shows inline error on #error-amount', () => {
    handleFormSubmit(makeSubmitEvent('Coffee', '-100'));
    expect(document.getElementById('error-amount').textContent).not.toBe('');
  });

  test('invalid submission does NOT add a transaction (Req 1.4)', () => {
    handleFormSubmit(makeSubmitEvent('', '0'));
    expect(getTransactions()).toHaveLength(0);
  });

  test('invalid submission does NOT write to localStorage', () => {
    handleFormSubmit(makeSubmitEvent('', '-50'));
    expect(loadFromStorage()).toHaveLength(0);
  });

  test('invalid submission does NOT reset the form fields', () => {
    const form = document.getElementById('transaction-form');
    form.elements['name'].value = 'Coffee';
    form.elements['amount'].value = '-5';
    const event = new Event('submit', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'target', { writable: false, value: form });
    handleFormSubmit(event);
    // Name should still be in the field (not cleared)
    expect(form.elements['name'].value).toBe('Coffee');
  });

  test('whitespace-only name shows inline error', () => {
    handleFormSubmit(makeSubmitEvent('   ', '5000'));
    expect(document.getElementById('error-name').textContent).not.toBe('');
  });

  test('amount exceeding max shows inline error', () => {
    handleFormSubmit(makeSubmitEvent('Coffee', '9999999999'));
    expect(document.getElementById('error-amount').textContent).not.toBe('');
  });
});

/* ---------------------------------------------------------------
   Boot sequence / DOMContentLoaded behaviour (Req 5.1)
--------------------------------------------------------------- */

describe('Boot sequence — loadFromStorage on init (Req 5.1, 5.3, 5.4)', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    setTransactions([]);
  });

  test('populates in-memory transactions from valid localStorage data', () => {
    const stored = [
      { id: 'a', name: 'Lunch', amount: 45000, category: 'Food', timestamp: 1 },
    ];
    saveToStorage(stored);
    // Simulate boot: load from storage and render
    const loaded = loadFromStorage();
    setTransactions(loaded);
    renderAll(loaded);
    expect(getTransactions()).toHaveLength(1);
    expect(getTransactions()[0].name).toBe('Lunch');
  });

  test('renders loaded transactions to the DOM', () => {
    const stored = [
      { id: 'b', name: 'Bus Fare', amount: 5000, category: 'Transport', timestamp: 2 },
    ];
    saveToStorage(stored);
    const loaded = loadFromStorage();
    setTransactions(loaded);
    renderAll(loaded);
    expect(document.getElementById('transaction-list').innerHTML).toContain('Bus Fare');
  });

  test('renders empty state when localStorage is empty', () => {
    const loaded = loadFromStorage(); // returns []
    setTransactions(loaded);
    renderAll(loaded);
    expect(document.getElementById('transaction-list').textContent).toContain('No transactions yet');
  });

  test('renders empty state on corrupted localStorage data', () => {
    localStorage.setItem('expense_transactions', '{corrupted{{');
    const loaded = loadFromStorage(); // returns [] on parse error
    setTransactions(loaded);
    renderAll(loaded);
    expect(document.getElementById('transaction-list').textContent).toContain('No transactions yet');
    expect(getTransactions()).toHaveLength(0);
  });

  test('renders balance as Rp 0 on empty localStorage', () => {
    const loaded = loadFromStorage();
    setTransactions(loaded);
    renderAll(loaded);
    const balance = document.getElementById('balance').textContent;
    expect(balance).toMatch(/Rp/);
    expect(balance).toMatch(/0/);
  });
});

/* ---------------------------------------------------------------
   Event delegation — delete via #transaction-list (Req 2.3)
   Note: The event listener is attached inside init() which runs on DOMContentLoaded.
   In tests we wire it up manually, mirroring the real boot sequence logic.
--------------------------------------------------------------- */

/**
 * Attach the same delete delegation that init() attaches in the real app.
 */
function attachDeleteHandler() {
  const list = document.getElementById('transaction-list');
  if (!list) return;
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-delete');
    if (!btn) return;
    const id = btn.getAttribute('data-id');
    if (!id) return;
    deleteTransaction(id);
    renderAll(getTransactions());
  });
}

describe('Delete event delegation on #transaction-list (Req 2.3)', () => {
  beforeEach(() => {
    setupDom();
    localStorage.clear();
    setTransactions([]);
    attachDeleteHandler(); // wire up delegation just like init() does
  });

  test('clicking a delete button removes the transaction from in-memory state', () => {
    // Add a transaction via the form submit handler
    handleFormSubmit(makeSubmitEvent('Nasi Goreng', '35000', 'Food'));
    expect(getTransactions()).toHaveLength(1);

    const btn = document.querySelector('button[data-id]');
    expect(btn).not.toBeNull();

    // Simulate click on the delete button
    btn.click();
    expect(getTransactions()).toHaveLength(0);
  });

  test('clicking delete removes the entry from localStorage', () => {
    handleFormSubmit(makeSubmitEvent('Sate', '20000', 'Food'));
    const btn = document.querySelector('button[data-id]');
    btn.click();
    expect(loadFromStorage()).toHaveLength(0);
  });

  test('clicking delete re-renders the transaction list', () => {
    handleFormSubmit(makeSubmitEvent('Ayam Bakar', '50000', 'Food'));
    const btn = document.querySelector('button[data-id]');
    btn.click();
    expect(document.getElementById('transaction-list').textContent).toContain('No transactions yet');
  });
});
