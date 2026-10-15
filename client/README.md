# BookStore Client (React + Vite)

This is the frontend of the **BookStore Management System**, built with React, Vite, Material UI, Redux Toolkit, and React Router.

For full setup, environment variables, API details, testing, and deployment, see the [main README](../README.md) in the project root.

## Quick start

```bash
npm install
npm run dev
```

The app runs at `http://localhost:5173`. The backend (in `../server`) must also be running for the app to load data.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run component tests in watch mode (Vitest) |
| `npm run test:run` | Run component tests once (Vitest) |
| `npm run e2e` | Open the Cypress runner |
| `npm run e2e:run` | Run Cypress end-to-end tests headless |

## Folder overview

```text
client/
├── cypress/        End-to-end tests (Cypress)
├── public/         Static assets
└── src/
    ├── api/        API helpers
    ├── components/ Reusable UI (admin/ holds dashboard components)
    ├── hooks/      Custom hooks
    ├── pages/      Customer pages (admin/ holds admin pages)
    ├── services/   Axios API instance
    ├── store/      Redux store and slices
    └── tests/      Component tests (Vitest)
```
