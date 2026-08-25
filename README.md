# Rely Active Web

Frontend scaffold for **Rely Active**, a senior-living community operations
platform. React 19 + TypeScript (strict) + Vite — tooling and linting are
wired up; no feature pages exist yet.

## Stack

- React 19, TypeScript ~6.0 (strict)
- Vite (dev server on port **5174**), `@vitejs/plugin-react`
- ESLint 9 (flat config): `typescript-eslint`, `eslint-plugin-react-hooks`,
  `eslint-plugin-react-refresh`, `eslint-config-prettier`
- Prettier, husky + lint-staged (formats staged files on commit)
- `@` path alias → `./src`

## First-run setup

```bash
npm install
cp .env.example .env
npm run dev              # http://localhost:5174
```

## Scripts

| Script                             | What it does                          |
| ----------------------------------- | -------------------------------------- |
| `npm run dev`                       | Vite dev server                        |
| `npm run build`                     | `tsc -b` (typecheck) then `vite build` |
| `npm run preview`                   | Preview the production build           |
| `npm run lint` / `lint:fix`         | ESLint (flat config)                   |
| `npm run format` / `format:check`   | Prettier                               |

## Layout

```
src/
├── main.tsx     # React root
├── App.tsx      # entry component — start building here
├── index.css    # global styles
└── env.d.ts     # typed import.meta.env
```

`VITE_API_BASE_URL` (see `.env.example`) points at the API — default
`http://localhost:3002`, matching `rely-active-api`'s default port.

See `PROJECT.md` at the repo root for the product/domain context this app
will grow into.
