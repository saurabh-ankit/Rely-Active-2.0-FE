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

## Centralized Architecture & Design Systems

### 1. Centralized API Layer (`src/api/`)

All API interactions are centrally organized in `src/api/` named by domain module:

- **`src/api/api.ts`**: Defines base configuration (`API_BASE_URL` = `http://localhost:3002/api/v1`) and the generic `ApiResponse<T>` wrapper.
- **`src/api/property.ts`**: Contains all Property API methods (`getAll`, `getById`, `create`, `update`, `delete`).
- **`src/api/company.ts`**: Contains all Company API methods (`getAll`, `getById`, `create`, `update`, `saveFormData`, `getSetupStatus`).
- **`src/api/index.ts`**: Unified re-export entrypoint.
- *Policy*: No `api.ts` files or direct `fetch()` calls allowed inside page or component directories.

### 2. Global Color & Theme System (`src/constants/theme.ts`)

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
