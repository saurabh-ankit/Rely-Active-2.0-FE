# Rely Active Web

React 19 and Vite foundation for the Rely Active 2.0 operations console.

Requires Node.js 24.19.0 LTS and pnpm 10.18.3. Run `nvm use` from this directory to select the pinned runtime.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` before pushing. Husky runs lint-staged on commit and the verification suite on push. `/components` contains the UI and typed data-table showcase.
