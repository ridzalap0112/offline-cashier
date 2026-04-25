# Offline Cashier

An offline-first cashier web application for small shops, built with React, Vite, Dexie, and PWA support.

## Overview

`offline-cashier` is a lightweight point-of-sale application designed for small stores and local businesses.  
It runs entirely in the browser, stores data locally with IndexedDB, and can be installed as a Progressive Web App.

The project currently includes:

- A POS checkout interface
- Product management
- Sales and report dashboard
- Local offline storage with Dexie
- Bluetooth thermal receipt printing via Web Bluetooth
- Multi-language UI support: Indonesian, English, and Chinese

## Tech Stack

- React
- Vite
- Dexie + IndexedDB
- Zustand
- Recharts
- Vite PWA Plugin

## Features

### POS Checkout

- Add products to the cart
- Update item quantities
- Support multiple payment methods:
  - Cash
  - QRIS
  - Debt
- Automatic change calculation for cash payments
- Transaction validation and stock protection in the service layer

### Product Management

- Add products
- Edit products
- Delete products
- Store price, cost, stock, minimum stock, barcode, and product image data

### Reports

- Daily sales summary
- Profit estimate
- Best-selling products
- Payment method breakdown
- Sales chart visualization

### Offline-First Storage

- Stores data locally with IndexedDB
- Works without a backend server
- Can be installed as a PWA on supported devices

### Receipt Printing

- Bluetooth thermal receipt printing
- ESC/POS-style printer support
- Uses the Web Bluetooth API in supported browsers

## Getting Started

### Requirements

- Node.js 18 or newer
- npm

### Install Dependencies

```bash
npm install
```

### Start the Development Server

```bash
npm run dev
```

Recommended local URL:

```text
http://127.0.0.1:5174
```

To force a stable local host and port:

```bash
npm run dev -- --host 127.0.0.1 --port 5174
```

### Build for Production

```bash
npm run build
npm run preview
```

## How to Test It in the Browser

After starting the dev server:

1. Open `http://127.0.0.1:5174`
2. Go to the `POS` page:
   - add products to the cart
   - select a payment method
   - complete a transaction
3. Go to the `Products` page:
   - create a new product
   - edit an existing product
4. Go to the `Report` page:
   - switch between date ranges
   - review charts and summary cards

## Project Structure

```text
offline-cashier/
|-- src/
|   |-- App.jsx
|   |-- main.jsx
|   |-- index.css
|   |-- db.js
|   |-- hooks/
|   |   `-- useStore.js
|   |-- i18n/
|   |   `-- index.js
|   |-- pages/
|   |   |-- POS.jsx
|   |   |-- Products.jsx
|   |   `-- Report.jsx
|   `-- services/
|       |-- index.js
|       `-- printer.js
|-- index.html
|-- vite.config.js
|-- package.json
`-- README.md
```

## Data Storage

This application stores data locally in the browser using IndexedDB through Dexie.

Current tables include:

- `products`
- `transactions`
- `transactionItems`
- `cashiers`

Because the app is offline-first, stored data depends on the current browser profile and device.

## Printing Notes

Receipt printing depends on Web Bluetooth support.

Recommended browsers:

- Google Chrome
- Microsoft Edge

Important notes:

- Web Bluetooth works on `localhost` or secure origins (`https`)
- Printer compatibility may vary by model
- Generic ESC/POS-compatible BLE printers usually work best

## Current Limitations

- No backend or cloud sync yet
- No backup and restore UI yet
- No admin PIN protection flow yet
- Product deletion is still a direct delete
- Report history still depends on local browser data

## Security Improvements Already Added

Recent transaction hardening includes:

- recalculating totals from IndexedDB instead of trusting raw UI values
- validating payment methods and item quantities
- preventing stock from dropping below the available amount during checkout
- rejecting invalid product references
- storing transaction item snapshots for more stable reporting

## Repository

GitHub repository:

`https://github.com/ridzalap0112/offline-cashier`

## License

MIT
