# Requirements Document

## Introduction

The Expense & Budget Visualizer is a client-side web application that allows users to track personal expenses, view a running total balance, and visualize spending by category through a pie chart. The app requires no backend or build tooling — it runs entirely in the browser using HTML, CSS, and vanilla JavaScript, with data persisted via the browser's Local Storage API.

---

## Glossary

- **App**: The Expense & Budget Visualizer web application.
- **Transaction**: A single expense record consisting of an item name, a monetary amount, and a category.
- **Category**: A fixed classification for a transaction — one of: Food, Transport, or Fun.
- **Transaction_List**: The scrollable UI component that renders all stored transactions.
- **Balance_Display**: The UI element at the top of the page that shows the sum of all transaction amounts.
- **Input_Form**: The HTML form used to create a new transaction.
- **Chart**: The pie chart rendered using Chart.js that visualizes spending distribution by category.
- **Local_Storage**: The browser's `localStorage` API used for client-side data persistence.
- **Validator**: The client-side logic that checks Input_Form fields before submission.

---

## Requirements

### Requirement 1: Add a Transaction

**User Story:** As a user, I want to fill in a form with an item name, amount, and category so that I can record a new expense.

#### Acceptance Criteria

1. THE Input_Form SHALL contain a text field for item name (max 100 characters), a numeric field for amount (range 0.01–999,999,999.99), and a dropdown for category with options: Food, Transport, and Fun.
2. WHEN the Input_Form is submitted with all fields filled and amount greater than zero, THE App SHALL add a new Transaction to the Transaction_List and persist it to Local_Storage.
3. WHEN the Input_Form is submitted successfully, THE Input_Form SHALL reset to: item name field empty, amount field empty, and category dropdown set to "Food".
4. IF the Input_Form is submitted with any field empty, amount equal to zero, a negative amount, or an amount exceeding 999,999,999.99, THEN THE Validator SHALL display an inline error message and prevent the Transaction from being added.
5. IF Local_Storage write fails when adding a Transaction, THEN THE App SHALL display an error message and not add the Transaction to the Transaction_List.

---

### Requirement 2: Display Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a list so that I can review my spending history.

#### Acceptance Criteria

5. THE Transaction_List SHALL display each Transaction showing its item name, amount (formatted as currency in the same format as Balance_Display), and category, with the most recently added Transaction appearing first.
6. IF the number of transactions exceeds the visible area of the Transaction_List container, THEN THE Transaction_List SHALL be scrollable to reveal all items.
7. WHEN the delete button for a Transaction is clicked, THE App SHALL remove that Transaction from Local_Storage and re-render the Transaction_List.
8. THE Transaction_List SHALL display a delete button for each Transaction.
9. IF no Transactions exist, THEN THE Transaction_List SHALL display an empty state message (e.g., "No transactions yet").

---

### Requirement 3: Display Total Balance

**User Story:** As a user, I want to see my total spending at the top of the page so that I can quickly understand my overall expense situation.

#### Acceptance Criteria

9. THE Balance_Display SHALL show the sum of all Transaction amounts formatted as currency (e.g., Rp 0 or $0.00), and SHALL show Rp 0 (or equivalent zero value) when no Transactions exist.
10. WHEN a Transaction is added or deleted, THE Balance_Display SHALL update synchronously within the same user interaction to reflect the new total without requiring a page reload.

---

### Requirement 4: Visualize Spending by Category

**User Story:** As a user, I want to see a pie chart of my expenses by category so that I can understand where my money is going.

#### Acceptance Criteria

11. THE Chart SHALL render a pie chart using Chart.js that shows the proportion of total spending for each category (Food, Transport, Fun) that has at least one Transaction; categories with zero spending SHALL be excluded from the chart. Each segment SHALL display the category name and its percentage of total spending.
12. WHEN a Transaction is added or deleted, THE Chart SHALL update within 1 second to reflect the new spending distribution.
13. IF no Transactions exist, THEN THE Chart SHALL display a "No data" text label with no pie segments rendered.

---

### Requirement 5: Persist Data Across Sessions

**User Story:** As a user, I want my transactions to be saved so that I can close and reopen the browser without losing my data.

#### Acceptance Criteria

14. WHEN the App is loaded, THE App SHALL read all previously saved Transactions from Local_Storage and render them in the Transaction_List, Balance_Display, and Chart; IF Local_Storage is empty, THE App SHALL render the zero/empty state for all three components; IF the stored data is corrupted or unparseable, THE App SHALL discard the corrupted data, render the zero/empty state, and display an error message to the user.
15. THE App SHALL store all Transaction data exclusively in Local_Storage with no network requests.
16. WHEN a Transaction is added or deleted, THE App SHALL write the updated Transaction list to Local_Storage immediately, before updating the UI.
17. IF a Local_Storage write fails during add or delete, THEN THE App SHALL revert the attempted change and display an error message to the user.

---

### Requirement 6: Single-File Structure and Browser Compatibility

**User Story:** As a developer, I want the project to use a clean, minimal file structure so that it is easy to maintain and deploy.

#### Acceptance Criteria

16. THE App SHALL be structured with exactly one HTML file, one CSS file inside a `css/` directory, and one JavaScript file inside a `js/` directory.
17. THE App SHALL pass all acceptance criteria from Requirements 1–5 in current stable versions of Chrome, Firefox, Edge, and Safari without polyfills or transpilation.
18. WHEN the App is loaded on a device with a network connection of at least 25 Mbps download speed, THE App SHALL become interactive — defined as the Input_Form accepting user input and the Transaction_List being rendered — within 3 seconds.

---

### Requirement 7: Responsive and Readable UI

**User Story:** As a user, I want the interface to be clean and readable so that I can use the app comfortably on any screen.

#### Acceptance Criteria

19. THE App SHALL render Balance_Display text at a larger font size than chart labels, and chart labels at a larger font size than Transaction_List item text, with uniform spacing between the balance summary, chart, and transaction list sections.
20. WHEN the viewport width is below 600px, THE App SHALL stack the balance summary, chart, and transaction list vertically in that order, and no horizontal scrollbar SHALL be present on the page.
