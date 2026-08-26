# Rely Active Web

React 19, Vite, and TailwindCSS foundation for the Rely Active 2.0 operations console.

Requires Node.js 24.19.0 LTS and pnpm 10.18.3. Run `nvm use` from this directory to select the pinned runtime.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

## Features & Reusable Component System

### 1. Reusable UI Components (`src/components/common`)

- **`CommonInput`** (`src/components/common/CommonInput.tsx`):
  - Standardized form input field component with header label, placeholder, red asterisk for required fields (`required`), icon support, character max length, and inline red validation error text (`error`).
  - Supports both standard `<input>` (`text`, `email`, `password`, `number`) and `<textarea>` types.

- **`CommonButton`** (`src/components/common/CommonButton.tsx`):
  - Standardized button component with distinct UI variant styling:
    - `variant="success"`: Emerald/Green action button (e.g. Save, Submit).
    - `variant="cancel"`: Subtle neutral border outline button (e.g. Cancel).
    - `variant="primary"`: Indigo primary action button.
    - `variant="danger"`: Red destructive action button.
    - `variant="outline"`: Border outline accent button.
  - Supports loading state spinner (`isLoading`), custom icons (`icon`), size configurations (`sm`, `md`, `lg`), and custom `className`.

- **`CommonModal`** (`src/components/common/CommonModal.tsx`):
  - Modal overlay dialog matching the Rely Active glassmorphism design system (`bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl`).
  - **Hidden Scroll Feature**: Built-in hidden scrollbar (`[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden`) allowing smooth scrolling of lengthy modal content without visible scrollbar clutter.
  - Reusable props for title, subtitle, icon, max width (`sm`, `md`, `lg`, `xl`, `2xl`, `4xl`), and custom footer button actions.

### 2. Frontend Text Library Constants (`src/constants/textLibrary.ts`)

- Centralized `TEXT_LIBRARY` object exporting all UI copy, headers, button labels, form headers, and validation error messages across screens:
  - `TEXT_LIBRARY.APP`: Application branding, welcome titles, and subtitles.
  - `TEXT_LIBRARY.BUTTONS`: Button names (`SUBMIT`, `SAVE`, `CANCEL`, `CREATE_COMPANY`, `EDIT_COMPANY`, `ADD_FIELD`).
  - `TEXT_LIBRARY.COMPANY`: Company section headers and field labels.
  - `TEXT_LIBRARY.VALIDATIONS`: Validation failure messages for required inputs, email format, and 10-digit mobile numbers starting with 6-9.

---

## Screen Architecture

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

### 3. Setup Screen (`/setup`)

Standalone full-page setup screen rendered when company data is null. Features initial setup flow using `CommonInput`, `CommonButton`, and `TEXT_LIBRARY`.

### 4. Company Creation & Management (`/company`)

Located at `/company`. Provides an organizational view and `EditCompanyModal` supporting company fields, GST, bank details, accountant signature, file uploads, and custom fields connected to backend `/api/v1/company`. Uses `CommonModal`, `CommonInput`, and `CommonButton`.

### 5. Global Settings (`/global-settings`)

Located at `/global-settings`. Features a grid layout grouped into Company Profile and Properties & Locations.

---

## Quality & Verification Commands

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing.
