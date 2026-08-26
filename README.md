# Rely Active Web

React 19, Vite, and TailwindCSS foundation for the Rely Active 2.0 operations console.

Requires Node.js 24.19.0 LTS and pnpm 10.18.3. Run `nvm use` from this directory to select the pinned runtime.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

## Features & UI Layout

### 1. Navigation & Side Nav Structure (`rely-active-1.0/rely_frontend` aligned)

The main navigation hierarchy and fields are sourced directly from `rely-active-1.0/rely_frontend`:

- **Dashboard**: `/dashboard`
- **Resident**: `/admin/residents`
- **Employee**: `/admin/employees`
- **Medical Management**: `/admin/medical` (sub-items: Dashboard, Doctors, Nurses, House Visits, Shifts, Care Tasks, Appointments, Residents, Room Management, Care Management)
- **Billing Management**: `/admin/billing-management` (sub-items: Dashboard, Residents & Services, Invoices, Payments, Services, Reports)
- **Shift & Roster Management**: `/admin/shift-roster-management`
- **Visitors Management**: `/admin/visitor-history`
- **Event Management**: `/admin/events`
- **Food & Beverages**: `/admin/fnb-history`
- **Inventory**: `/admin/inventory/home`
- **Asset Management**: `/admin/asset-management`
- **Company**: `/company`
- **Feedback And Training**: `/admin/feedback-and-training`
- **Global Settings**: `/global-settings`

### 2. Login Screen UI (`rely-assist` screenshot reference aligned)

Located at `/login`. Matches the provided screenshot reference:

- Neutral silver-gray background (`#c4c6c9`) with centered glass card (`rounded-[32px]`, `bg-[#d7d9dc]/90`).
- Original vibrant `R_Logo.svg` branding.
- Wide tracking title `R E L Y` and uppercase `A C T I V E`.
- Soft rounded input containers for `User ID` and `Password` with person/lock icon indicators and eye toggle.
- Muted slate-blue button (`Sign In`) with log-in icon (`#6f8298`).
- _Authentication Policy_: No authentication restriction on routes. Clicking "Sign In" or navigating directly opens the dashboard.

### 3. Dashboard UI (`rely-assist` aligned)

Located at `/dashboard`. Features responsive tabs (`Dashboard`, `Occupancy`, `Billing`, `Inventory`) and operational status metrics cards.

### 4. Company Creation & Management (`rely-assist` aligned)

Located at `/company`. Provides an organizational view and `EditCompanyModal` supporting company fields, GST, bank details, accountant signature, file uploads, and custom fields connected to backend `/api/v1/company`.

### 5. Global Settings (`rely-assist` aligned)

Located at `/global-settings`. Features a grid layout grouped into Medical Settings, Operation Settings, and System Settings.

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing.
