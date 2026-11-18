# TripSplit — Mini Group Travel Expense Manager

A responsive, single-page group expense tracker made with **HTML, CSS, and vanilla JavaScript**. Data is stored in the browser's **LocalStorage**. **Chart.js** provides the spending doughnut chart.

## How to run


### Recommended in VS Code
1. Open the  `TripSplit` folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey).
3. Right-click `index.html` and select **Open with Live Server**.
4. The browser opens at an address such as `http://127.0.0.1:5500/index.html`.

### Optional: Python local server
From the extracted folder run `python -m http.server 8000` and open `http://localhost:8000`.

No npm install, Node.js, Express, or database is required. An internet connection is helpful for the Chart.js library and web fonts, which load from a CDN. The rest of the application works without them.

## Features
- Create a trip with a name, destination, budget, and comma-separated member names.
- Edit trip details and budget. Member names cannot change once expenses exist, to preserve balances.
- Add expenses with title, category, date, amount, and payer.
- Split every expense equally among **all** members, including the person who paid.
- View category spending, recent expenses, budget utilization, and remaining budget.
- Filter expenses by category and delete incorrect entries.
- View each member's net balance and suggested payments to settle debts.
- Persist everything automatically in LocalStorage.
- Reset all data and start a new trip.

## Example
Aman pays ₹1,500 for dinner for Aman, Rahul, and Priya. Everyone's share is ₹500. Rahul owes Aman ₹500 and Priya owes Aman ₹500. Additional expenses update these balances automatically.

## Notes and limitations
- Only **one active trip** is stored at a time. Creating a new trip replaces the current trip and expenses after confirmation.
- This is a frontend-only educational app; no accounts, cloud sync, payment transfers, or shared real-time data.
- Expense splitting is equal among **all trip members**. Custom/partial splits are not included.
- Balances are calculated in integer paise internally to reduce floating-point rounding errors. Any extra paise from division is assigned deterministically in member order.
- Suggested settlements are computed from net balances, not recorded as payments. They are suggestions and do not mark balances as paid.
- Browser data can be lost if site data is cleared or when switching browsers/devices.
- Chart.js and Google Fonts are external resources; the charts may be unavailable without internet.

## File structure
- `index.html` — Dashboard layout, navigation, forms, and modals
- `style.css` — Responsive styling and UI design
- `script.js` — Trip/expense logic, balance calculations, charts, and storage
- `README.md` — Instructions and project details

