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
│   │   ├── axios.ts           # Centralized Axios instances with interceptors (JWT & Location headers)
│   │   └── endpoints.ts       # Centralized API endpoint URLs & route helpers
│   ├── services/
│   │   ├── propertyService.ts # Pure API service layer for Property domain
│   │   ├── companyService.ts  # Pure API service layer for Company domain
│   │   └── <module>Service.ts # Service layer for new module
│   ├── types/
│   │   ├── property.ts        # Shared DTOs and API payload interfaces
│   │   ├── company.ts
│   │   └── index.ts
│   └── constants/
│       └── theme.ts           # Design tokens, status colors, & UI styles
├── hooks/
│   ├── useAuth.ts             # Custom hook for auth state
│   ├── useDebounce.ts         # Custom hook for debouncing input
│   └── use<Feature>.ts        # Domain or feature-specific React custom hooks
├── pages/
│   └── <ModuleName>/          # e.g., Property, Company, Setup, Users
│       ├── index.tsx          # Main module listing / dashboard view
│       ├── Create<Module>Page.tsx (Optional full-screen screen entrypoint)
│       ├── components/        # Sub-components, forms, modal dialogs, drawers
│       │   ├── Create<Module>Screen.tsx
│       │   ├── Edit<Module>Modal.tsx
│       │   └── <Module>DetailDrawer.tsx
│       └── types.ts           # Module-specific local UI types & form state schemas
```

---

### 2. API Endpoints Standard (`src/lib/api/endpoints.ts`)

- **Rule**: All API URL strings **MUST** be defined in `src/lib/api/endpoints.ts` under the `API_ENDPOINTS` object dictionary.
- **Location-Scoped Endpoints**: Location/Property-scoped modules must use the `buildLocationEndpoint(path, locationId)` helper.
- **Example**:

```typescript
export const API_ENDPOINTS = {
  property: {
    getAll: `${BASE_URL}/property`,
    getById: (id: string) => `${BASE_URL}/property/${id}`,
    create: `${BASE_URL}/property`,
    update: (id: string) => `${BASE_URL}/property/${id}`,
    delete: (id: string) => `${BASE_URL}/property/${id}`,
  },
  modules: {
    employees: (locationId?: string | null) => buildLocationEndpoint('/users', locationId),
  },
}
```

---

### 3. Axios Interceptor & HTTP Client Standard (`src/lib/api/axios.ts`)

- **Rule**: Direct `fetch()` calls or unconfigured `axios` calls in components are **STRICTLY PROHIBITED**.
- **Axios Instances**: Use `api` (or `apiClient`) from `@/lib/api/axios`.
- **Automatic Interceptors**:
  - `Authorization`: Attaches `Bearer ${token}` from `localStorage.getItem('rely_auth_token')`.
  - `x-location-id` & `x-property-id`: Automatically attaches active location/property context header from `localStorage.getItem('rely_active_property_id')`.

```typescript
import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
```

---

### 4. Services Layer Standard (`src/lib/services/<module>Service.ts`)

- **Rule**: Every module must have a service file under `src/lib/services/` wrapping HTTP calls into typed async functions.
- **Example**:

```typescript
import api from '@/lib/api/axios'
import { API_ENDPOINTS } from '@/lib/api/endpoints'
import type { CreatePropertyPayload, Property } from '@/lib/types'

export const getPropertiesAPI = async (companyId?: string): Promise<Property[]> => {
  const url = companyId ? `${API_ENDPOINTS.property.getAll}?companyId=${companyId}` : API_ENDPOINTS.property.getAll
  const response = await api.get(url)
  return response.data?.data || response.data
}

export const createPropertyAPI = async (payload: CreatePropertyPayload): Promise<Property> => {
  const response = await api.post(API_ENDPOINTS.property.create, payload)
  return response.data?.data || response.data
}
```

---

### 5. Custom Hooks Layer Standard (`src/hooks/`)

- **Rule**: Encapsulate reusable state management, async operations, side-effects, or debouncing inside custom React hooks in `src/hooks/`.
- **Naming**: Custom hook filenames and function names must begin with `use` (e.g. `useDebounce`, `useProperty`, `useAuth`).

---

### 6. Form Schemas, Validation & Type Inference Standard

- **Validation Library**: Use **Zod** (`import { z } from 'zod'`) for defining form validation schemas.
- **Type Inference**: Derive form types directly using `z.infer<typeof schema>`.
- **Validation Rules**:
  - Use regex constants for string formats (e.g., `PINCODE_REGEX = /^[1-9][0-9]{5}$/`, `PHONE_REGEX`, `EMAIL_REGEX`).
  - Use `.trim()` and `.min(1, 'Required message')` on required text fields.
  - Use `.refine()` for conditional or custom pattern validations.

```typescript
import { z } from 'zod'

export const PINCODE_REGEX = /^[1-9][0-9]{5}$/

export const propertyAddressSchema = z.object({
  street: z.string().optional(),
  city: z.string().trim().min(1, 'City is required'),
  state: z.string().trim().min(1, 'State is required'),
  pincode: z
    .string()
    .trim()
    .min(1, 'Pincode is required')
    .refine((val) => PINCODE_REGEX.test(val), {
      message: 'Pincode must be exactly 6 digits',
    }),
  country: z.string().default('India'),
})

export type PropertyAddressFormValues = z.infer<typeof propertyAddressSchema>
```

- **UI Form Components**:
  - Always use standard reusable components from `@/components/common` (`CommonInput`, `CommonButton`, `CommonModal`, `CommonProgressBar`) and `@/components/ui`.

---

## Centralized Architecture & Design Systems

### 1. Centralized API Layer (`src/lib/api/`)

All API interactions are centrally organized in `src/lib/api/` named by domain module:

- **`src/lib/api/axios.ts`**: Defines base configuration, timeout, Bearer token interceptor, and location headers.
- **`src/lib/api/endpoints.ts`**: Defines endpoint constants and location-scoped endpoint helpers.
- _Policy_: No direct `fetch()` calls allowed inside page or component directories.

### 2. Global Color & Theme System (`src/lib/constants/theme.ts`)

Centralized project color palette and UI utility maps:

- **`THEME_COLORS.primary`**: Main brand blue color codes (`#2563eb`), background classes (`bg-blue-600`), hover classes (`hover:bg-blue-700`), border rings, and button styles.
- **`THEME_COLORS.status`**: Unit-level status styles (`available`, `booked`, `sold`, `onHold`).
- **`THEME_COLORS.groundFloor`**: Ground floor banner styling (`bg-blue-50/60 border-blue-200 text-blue-700`).
- **`THEME_COLORS.neutral`**: Neutral card backgrounds, borders, and typography.

---

## Features & Reusable Component System

### Reusable UI Components (`src/components/common`)

- **`CommonProgressBar`** (`src/components/common/CommonProgressBar.tsx`):
  - Stepper / progress bar occupying **100% of container width** with smooth progress line animation.
  - Features point count badges (`1`, `2`, `3`), point labels/names, Lucide icon support, active blue rings, and completed checkmark badges.
  - Supports step-click navigation for completed steps.

- **`CommonInput`** (`src/components/common/CommonInput.tsx`):
  - Standardized form input field component with header label, placeholder, required red asterisk (`required`), icon support, character max length, and inline red error text.
  - Supports standard input types (`text`, `email`, `password`, `number`) and `<textarea>`.

- **`CommonButton`** (`src/components/common/CommonButton.tsx`):
  - Standardized button component with distinct UI variant styling:
    - `variant="primary"`: Primary global action button (Blue `#2563eb`).
    - `variant="success"`: Emerald/Green action button.
    - `variant="cancel"`: Subtle neutral border outline button.
    - `variant="danger"`: Red destructive action button.
    - `variant="outline"`: Border outline accent button.
  - Supports loading spinner (`isLoading`), custom icons (`icon`), size configurations (`sm`, `md`, `lg`), and custom `className`.

- **`CommonModal`** (`src/components/common/CommonModal.tsx`):
  - Modal overlay dialog matching the Rely Active glassmorphism design system (`bg-white/95 backdrop-blur-xl border border-white/60 shadow-2xl rounded-3xl`).
  - Built-in hidden scrollbar allowing smooth scrolling of lengthy modal content without scrollbar clutter.

- **`SetupStatusGuard`** (`src/components/common/SetupStatusGuard.tsx`):
  - Route guard enforcing company setup completion before accessing application features.

---

## Screen Architecture & Navigation

### 1. Navigation Hierarchy & Routes

- **Dashboard**: `/dashboard`
- **Properties & Locations**:
  - Property Listing: `/property`
  - Property Create (Full Screen): `/property/create`
  - Property Edit (Full Screen): `/property/edit/:id`
  - Location Listing: `/locations`
  - Location Create: `/locations/create`
  - Location Edit: `/locations/edit/:id`
- **Resident**: `/admin/residents`
- **Employee**: `/admin/employees`
- **Medical Management**: `/admin/medical`
- **Billing Management**: `/admin/billing-management`
- **Company**: `/company`
- **Setup**: `/setup`
- **Global Settings**: `/global-settings`

### 2. Full-Screen Property Wizard (`CreatePropertyScreen.tsx`)

Replaced modal overlay dialogs with full-screen route-based views for property creation and editing:

- **Step 1: Property Details**: Project Name, Property Type chips, Total Area, Area Unit, Amenities suggestion chips, custom amenity input, and Description.
- **Step 2: Address**: Street Address, City, State, Pincode, and Country.
- **Step 3: Structure Builder**: Tower/Block configuration with Unit Nomenclature Template (disabled preview input `{{TowerPrefix}}-{{FloorNumber}}{{Position}}`), BHK variant assigner, visual floor preview, and automatic floor & unit generation.
- Integrated with 100% width `CommonProgressBar`.

### 3. Visual Tower & Floor Matrix Grid (`PropertyDetailDrawer.tsx`)

- Visual stacked floor matrix (Top Floor down to Ground Floor).
- Emerald green unit chips (`bg-emerald-50/80 border-emerald-300 text-emerald-900`) showing unit number, unit type (e.g. `A-101 (2BHK)`), and facing direction.
- Full-width Ground Floor banner styling.
- Edit property button navigating directly to `/property/edit/:id`.

---

## Quality & Verification Commands

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing.
