# TayGaff Frontend

Admin expense dashboard for the TayGaff tailor shop platform.

## Stack

- React 19 + JavaScript + Vite
- Tailwind CSS 4
- Recharts
- React Router

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`.

Default API base: `http://localhost:5000/v1/api`

## Structure

```
src/
  app/                 # App shell & routing
  features/
    auth/              # Login & session
    dashboard/         # Stats, charts, period filters
    expenses/          # CRUD ledger
  shared/              # API client, constants, layout, utils
  styles/
```

Future modules (bookings, sizing, orders) should be added under `features/` the same way.
