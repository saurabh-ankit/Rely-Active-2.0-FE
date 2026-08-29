# Rely Active Web

React 19, Vite, and TailwindCSS foundation for the Rely Active 2.0 operations console.

Requires Node.js 24.19.0 LTS and pnpm 10.18.3. Run `nvm use` from this directory to select the pinned runtime.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

---

## Mandatory Module Architecture & Standards

All new feature modules added to Rely-Active-2.0-FE **MUST** strictly adhere to the following architecture, folder layout, and layer conventions.

### 1. Folder Structure Standard

Every feature module (e.g. `Property`, `Company`, `User`, `Resident`, `Employee`) must strictly conform to this folder layout:

```text
src/
├── lib/
│   ├── api/
│   │   ├── axios.ts           # Centralized Axios instances with interceptors
│   │   └── endpoints.ts       # Centralized API endpoint URLs & route helpers
│   ├── services/
│   │   ├── propertyService.ts # Pure API service layer for Property domain
│   │   ├── companyService.ts  # Pure API service layer for Company domain
│   │   ├── userService.ts     # Pure API service layer for User/Employee domain
│   │   └── residentService.ts # Pure API service layer for Resident domain
│   ├── types/
│   │   ├── property.ts        # Shared DTOs and API payload interfaces
│   │   ├── company.ts
│   │   ├── user.ts
│   │   ├── resident.ts        # Resident DTOs & payload interfaces
│   │   └── index.ts
│   └── constants/
│       └── theme.ts           # Design tokens, status colors, & UI styles
├── hooks/
│   ├── useAuth.ts             # Custom hook for auth state
│   ├── useLocation.ts         # Custom hook for active property location context
│   └── useDebounce.ts         # Custom hook for debouncing input
├── validations/               # Zod validation schemas
│   ├── residentValidation.ts  # Resident onboarding form validation schema
│   └── property.validation.ts
├── pages/
│   └── Resident/              # Resident Directory & Onboarding Module
│       ├── index.tsx          # Router container & initialView resolution
│       └── components/        # Dedicated full-page screens
│           ├── ResidentListScreen.tsx     # Full-width directory listing with DataTable
│           └── OnboardResidentScreen.tsx  # Full-page onboarding form (React Hook Form + Zod)
```

---

## Centralized API & Form Validation Standards

### 1. Centralized API Layer (`src/lib/services/` & `src/lib/api/`)

- **Rule**: All HTTP calls **MUST** pass through services in `src/lib/services/` using the central Axios instance (`api` from `@/lib/api/axios`).
- **Interceptors**: Attaches Bearer JWT token and location headers (`x-location-id`, `x-property-id`) automatically.
- **Endpoints**: Defined in `src/lib/api/endpoints.ts` (`API_ENDPOINTS`).

### 2. Form Validation Standard (`src/validations/`)

- **Validation Engine**: Built with **React Hook Form** + **Zod** (`@hookform/resolvers/zod`).
- **Validation Schemas**:
  - `residentValidation.ts`: Validates unit assignment, location, first name, mobile username handle (`@handle`), password length, email format, phone numbers, and move-in dates.

---

## Key Modules & Screen Architecture

### 1. Resident Directory & Onboarding Module (`/admin/residents`)

Full-page, 100% width management module matching the Employee Management design system.

#### Routes

- `/admin/residents`: Resident Directory List Screen.
- `/admin/residents/create`: Onboard New Resident / Tenant Screen.
- `/admin/residents/edit/:id`: Edit Resident Profile Screen.

#### Key Features & Business Rules

- **Header Location Sync**: Automatically synchronizes `selectedPropertyId` with the top header location selector (`useLocationContext()`).
- **Role Selection First**: Section 1 card (**Resident Type & Residing Status**) is placed at the top. Selecting **Owner** vs **Tenant** instantly updates the unit selection rules.
- **Tenant Off-site Owner Filter**: When **Tenant** is selected, the **Property Flat / Unit** dropdown dynamically filters to display **ONLY units that have a registered Off-site Owner (`isResiding: false`)**. If no units qualify, submit is disabled and an alert banner guides the admin.
- **Individual Family Member App Logins**: In the Family Members section, each member card includes a toggle: `[x] Enable Individual Mobile App Login Credentials` with inputs for `@username`, `password`, and `email`.
- **UI Design Alignment**: Styled with Rely Active 2.0 glassmorphism cards (`rounded-3xl border border-white/60 bg-white/80 backdrop-blur-xl`), `DataTable` pagination, and `DropdownMenu` actions.

---

### 2. Property Management Module (`/property`)

- **Property Listing**: `/property`
- **Property Create (Full-Screen Wizard)**: `/property/create`
- **Property Edit**: `/property/edit/:id`
- **Visual Matrix**: Visual stacked floor matrix grid in `PropertyDetailDrawer.tsx`.

---

### 3. Navigation Hierarchy & Routes Summary

- **Dashboard**: `/dashboard`
- **Properties**: `/property` (`/property/create`, `/property/edit/:id`)
- **Locations**: `/locations` (`/locations/create`, `/locations/edit/:id`)
- **Residents**: `/admin/residents` (`/admin/residents/create`, `/admin/residents/edit/:id`)
- **Employees**: `/admin/employees` (`/admin/employees/create`, `/admin/employees/edit/:id`)
- **Company**: `/company`
- **Setup**: `/setup`
- **Global Settings**: `/global-settings`

---

## Quality & Verification Commands

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing.
