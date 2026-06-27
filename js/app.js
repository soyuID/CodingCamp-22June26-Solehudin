/**
 * Expense & Budget Visualizer — Application Logic
 *
 * Architecture: unidirectional data flow
 *   user action → validate → persist to localStorage → update in-memory state → re-render
 *
 * All core functions are exported (CommonJS) so Jest can import them for testing.
 */

'use strict';

/* ---------------------------------------------------------------
   In-Memory State
--------------------------------------------------------------- */
let transactions = []; // Transaction[]
let chartInstance = null; // Chart | null

/* ---------------------------------------------------------------
   Constants
--------------------------------------------------------------- */
const STORAGE_KEY = 'expense_transactions';
const CATEGORIES = ['Food', 'Transport', 'Fun'];
const CHART_COLORS = {
  Food: '#4a6cf7',
  Transport: '#f97316',
  Fun: '#10b981',
};

/* ---------------------------------------------------------------
   Utilities
--------------------------------------------------------------- */

/**
 * Format a numeric amount as Indonesian Rupiah currency string.
 * @param {number} amount
 * @returns {string}  e.g. "Rp 45.000"
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })
    .format(amount)
    .replace('IDR', 'Rp')
    .trim();
}

/* ---------------------------------------------------------------
   Persistence Layer
--------------------------------------------------------------- */

/**
 * Load transactions from localStorage.
 * Returns [] on empty, corrupted data, or if any item fails shape validation.
 * @returns {Transaction[]}
 */
function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    // Validate each item's shape — discard the entire array if any item is malformed
    const isValidItem = (item) =>
      item !== null &&
      item !== undefined &&
      typeof item.id === 'string' &&
      typeof item.name === 'string' &&
      typeof item.amount === 'number' &&
      CATEGORIES.includes(item.category) &&
      typeof item.timestamp === 'number';
    if (!parsed.every(isValidItem)) return [];
    return parsed;
  } catch {
    return [];
  }
}

/**
 * Persist the transaction array to localStorage.
 * Throws on QuotaExceededError so callers can handle it.
 * @param {Transaction[]} txns
 */
function saveToStorage(txns) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(txns));
}

/* ---------------------------------------------------------------
   Validation
--------------------------------------------------------------- */

/**
 * Validate the add-transaction form inputs.
 * @param {string} name
 * @param {string} amountStr
 * @returns {{ valid: boolean, errors: string[] }}
 */
function validateForm(name, amountStr) {
  const errors = [];

  // Name validation
  if (!name || !name.trim()) {
    errors.push('Item name is required.');
  } else if (name.trim().length > 100) {
    errors.push('Item name must be 100 characters or fewer.');
  }

  // Amount validation
  if (amountStr === '' || amountStr === null || amountStr === undefined) {
    errors.push('Amount is required.');
  } else {
    const amount = parseFloat(amountStr);
    if (isNaN(amount)) {
      errors.push('Amount must be a valid number.');
    } else if (amount <= 0) {
      errors.push('Amount must be greater than zero.');
    } else if (amount > 999999999.99) {
      errors.push('Amount must not exceed 999,999,999.99.');
    }
  }

  return { valid: errors.length === 0, errors };
}

/* ---------------------------------------------------------------
   State Mutations
--------------------------------------------------------------- */

/**
 * Generate a unique ID for a transaction.
 * Uses crypto.randomUUID() when available; falls back to Date.now() + Math.random().
 * @returns {string}
 */
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random();
}

/**
 * Add a new transaction. Persists to storage before mutating in-memory state.
 * If storage throws (e.g. QuotaExceededError), calls showError and does NOT
 * mutate the in-memory transactions array.
 *
 * @param {{ name: string, amount: number, category: string }} tx
 */
function addTransaction(tx) {
  const newTx = {
    id: generateId(),
    name: tx.name.trim(),
    amount: tx.amount,
    category: tx.category,
    timestamp: Date.now(),
  };
  try {
    saveToStorage([...transactions, newTx]); // persist first — before any state change
    transactions.push(newTx);               // only mutate if save succeeded
  } catch (err) {
    showError('Failed to save transaction: storage quota exceeded.');
    // in-memory state is NOT mutated — no revert needed
  }
}

/**
 * Delete a transaction by ID. Persists the filtered list to storage before
 * mutating in-memory state. If storage throws, calls showError and does NOT
 * mutate the in-memory transactions array.
 *
 * @param {string} id
 */
function deleteTransaction(id) {
  const filtered = transactions.filter((t) => t.id !== id);
  try {
    saveToStorage(filtered); // persist first — before any state change
    transactions = filtered; // only mutate if save succeeded
  } catch (err) {
    showError('Failed to delete transaction: storage error.');
    // in-memory state is NOT mutated — original transactions array preserved
  }
}

/* ---------------------------------------------------------------
   Rendering
--------------------------------------------------------------- */

/**
 * Render the transaction list into #transaction-list.
 * @param {Transaction[]} txns
 */
function renderTransactionList(txns) {
  const list = document.getElementById('transaction-list');
  if (!list) return;

  list.innerHTML = '';

  if (txns.length === 0) {
    const li = document.createElement('li');
    li.className = 'empty-state';
    li.textContent = 'No transactions yet.';
    list.appendChild(li);
    return;
  }

  const sorted = [...txns].sort((a, b) => b.timestamp - a.timestamp);

  sorted.forEach((tx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <div class="tx-details">
        <span class="tx-name">${escapeHtml(tx.name)}</span>
        <span class="tx-meta">
          <span class="tx-amount">${formatCurrency(tx.amount)}</span>
          <span class="category-badge">${escapeHtml(tx.category)}</span>
        </span>
      </div>
      <button class="btn-delete" data-id="${escapeHtml(tx.id)}" aria-label="Delete ${escapeHtml(tx.name)}">
        Delete
      </button>
    `;
    list.appendChild(li);
  });
}

/**
 * Render the balance display into #balance.
 * @param {Transaction[]} txns
 */
function renderBalance(txns) {
  const el = document.getElementById('balance');
  if (!el) return;
  const sum = txns.reduce((acc, t) => acc + t.amount, 0);
  el.textContent = formatCurrency(sum);
}

/**
 * Build chart data from transactions.
 * @param {Transaction[]} txns
 * @returns {{ labels: string[], data: number[], colors: string[] }}
 */
function buildChartData(txns) {
  const totals = {};
  CATEGORIES.forEach((cat) => (totals[cat] = 0));
  txns.forEach((t) => {
    if (totals[t.category] !== undefined) {
      totals[t.category] += t.amount;
    }
  });

  const labels = [];
  const data = [];
  const colors = [];

  CATEGORIES.forEach((cat) => {
    if (totals[cat] > 0) {
      labels.push(cat);
      data.push(totals[cat]);
      colors.push(CHART_COLORS[cat]);
    }
  });

  return { labels, data, colors };
}

/**
 * Render the pie chart into #spending-chart.
 * @param {Transaction[]} txns
 */
function renderChart(txns) {
  const canvas = document.getElementById('spending-chart');
  const noData = document.getElementById('chart-no-data');
  if (!canvas || !noData) return;

  const { labels, data, colors } = buildChartData(txns);

  if (data.length === 0) {
    noData.style.display = 'flex';
    if (chartInstance) {
      chartInstance.destroy();
      chartInstance = null;
    }
    return;
  }

  noData.style.display = 'none';

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const ctx = canvas.getContext('2d');
  chartInstance = new Chart(ctx, {
    type: 'pie',
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 2,
          borderColor: '#ffffff',
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: { size: 14 },
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${formatCurrency(ctx.parsed)} (${pct}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Re-render all UI components from current transactions state.
 * @param {Transaction[]} txns
 */
function renderAll(txns) {
  renderTransactionList(txns);
  renderBalance(txns);
  renderChart(txns);
}

/* ---------------------------------------------------------------
   Error Display
--------------------------------------------------------------- */

/**
 * Show a global error banner that auto-dismisses after 5 s.
 * @param {string} message
 */
function showError(message) {
  const banner = document.getElementById('error-banner');
  if (!banner) return;
  banner.textContent = message;
  banner.classList.remove('hidden');
  setTimeout(() => banner.classList.add('hidden'), 5000);
}

/**
 * Clear all inline form error messages.
 */
function clearErrors() {
  document.querySelectorAll('.field-error').forEach((el) => {
    el.textContent = '';
  });
}

/* ---------------------------------------------------------------
   Form Handler
--------------------------------------------------------------- */

/**
 * Handle transaction form submission.
 * @param {Event} event
 */
function handleFormSubmit(event) {
  event.preventDefault();
  clearErrors();

  const form = event.target;
  const name = form.elements['name'].value;
  const amountStr = form.elements['amount'].value;
  const category = form.elements['category'].value;

  const { valid, errors } = validateForm(name, amountStr);

  if (!valid) {
    // Show inline errors: first error goes to name field, second to amount
    errors.forEach((msg) => {
      if (msg.toLowerCase().includes('name')) {
        const el = document.getElementById('error-name');
        if (el) el.textContent = msg;
      } else if (msg.toLowerCase().includes('amount')) {
        const el = document.getElementById('error-amount');
        if (el) el.textContent = msg;
      }
    });
    return;
  }

  try {
    addTransaction({ name, amount: parseFloat(amountStr), category });
    form.reset();
    renderAll(transactions);
  } catch (err) {
    showError('Failed to save transaction: storage quota exceeded.');
  }
}

/* ---------------------------------------------------------------
   Helpers
--------------------------------------------------------------- */

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ---------------------------------------------------------------
   App Initialization
--------------------------------------------------------------- */

function init() {
  try {
    transactions = loadFromStorage();
  } catch {
    transactions = [];
    showError('Stored data was corrupted and has been cleared.');
  }

  renderAll(transactions);

  const form = document.getElementById('transaction-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }

  const list = document.getElementById('transaction-list');
  if (list) {
    list.addEventListener('click', (e) => {
      const btn = e.target.closest('.btn-delete');
      if (!btn) return;
      const id = btn.getAttribute('data-id');
      if (!id) return;
      try {
        deleteTransaction(id);
        renderAll(transactions);
      } catch {
        showError('Failed to delete transaction: storage error.');
      }
    });
  }
}

if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', init);
}

/* ---------------------------------------------------------------
   Exports (CommonJS — for Jest)
--------------------------------------------------------------- */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    formatCurrency,
    loadFromStorage,
    saveToStorage,
    validateForm,
    addTransaction,
    deleteTransaction,
    buildChartData,
    renderTransactionList,
    renderBalance,
    renderChart,
    renderAll,
    showError,
    clearErrors,
    handleFormSubmit,
    generateId,
    // expose state for testing
    getTransactions: () => transactions,
    setTransactions: (txns) => { transactions = txns; },
    getChartInstance: () => chartInstance,
  };
}
