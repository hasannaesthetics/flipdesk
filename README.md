# FlipDesk  LIVE https://flipdesk.web.app/

**FlipDesk** is a full-featured, real-time resell business tracker designed for device flippers and secondhand traders — built specifically for the Singapore & Malaysia market.

## What it does

FlipDesk gives resellers a single dashboard to run their entire operation:

- **Deals Tracker** — Log every buy and sell with device name, category, platform, condition, bought/sold price, and profit. Automatically calculates margins and flags losses.
- **Leads Manager** — Track potential buyers and sellers, their device interests, asking prices, status (Hot / Warm / Cold), and source (Carousell, Facebook, Referral, etc.)
- **Ad Spend Logger** — Record Meta / Facebook Ads and Carousell Boost spending by campaign, date, and platform. Visualize spend breakdown with live bar charts.
- **Inventory View** — See all unsold stock at a glance with what you paid and what you're targeting to sell for.
- **Capital Tracker** — Monitor your available working capital and expenses over time.
- **Price List** — Maintain a personal buyback/resell reference price list by device model.
- **Summary & Analytics** — Monthly profit/loss breakdown, ROI, ad spend vs revenue, top-performing platforms, and deal volume charts.
- **Profit Target** — Set a monthly profit goal and track your progress with a live ring indicator on the dashboard.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla HTML5, CSS3, JavaScript (ES6+) |
| Authentication | Firebase Authentication (Email/Password) |
| Database | Cloud Firestore (NoSQL, real-time sync) |
| Hosting | Firebase Hosting |
| Fonts | Google Fonts — Space Grotesk, Space Mono |
| Storage | localStorage (offline-first) + Firestore (cloud sync) |
| Build Tool | None — zero dependencies, zero bundler |

## Architecture

FlipDesk is intentionally built with **zero npm dependencies and no build step**. The entire app is a single `index.html`, `app.js`, and `style.css`. Data is stored in the browser's `localStorage` as the source of truth, with a **CloudSync** layer that mirrors all data to Firestore in real time.

The sync architecture is designed to be **offline-first** — the app works fully without an internet connection, and syncs automatically when connectivity is restored. Firestore's `onSnapshot` listener ensures real-time updates across all logged-in devices.

### Data Flow
```
User Action → localStorage (instant) → CloudSync.saveAllToCloud() → Firestore
                                              ↓
                               onSnapshot → localStorage → re-render
```

### Security
- All Firestore documents are scoped under `/users/{uid}/data`
- Security rules enforce that users can only read/write their own data
- No data is ever shared between accounts

## Features

- ✅ Real-time sync across PC, tablet, and mobile
- ✅ Offline-first — works without internet
- ✅ Email/password authentication via Firebase Auth
- ✅ Import/Export data as JSON
- ✅ Terms & Conditions modal on sign-up
- ✅ Mobile responsive design
- ✅ Dark mode UI with glassmorphism effects
- ✅ Zero cost to self-host (Firebase free tier)
- ✅ No third-party analytics or tracking

## Self-Hosting

1. Clone the repo
2. Create a Firebase project and enable **Authentication** (Email/Password) and **Firestore Database**
3. Replace the Firebase config in `index.html` with your own project credentials
4. Set Firestore security rules:
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
5. Deploy with `firebase deploy --only hosting` or serve `index.html` from any static host

 Live Demo

(https://flipdesk.web.app)
