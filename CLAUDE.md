# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Full-stack expense and event management web application. Users can track shared expenses across travels, transactions between collaborators, and savings goals.

- **Frontend (`spa/`):** Angular 20 SPA with standalone components, NgRx Signals, Tailwind CSS + DaisyUI
- **Backend (`api/`):** NestJS REST API backed by Supabase PostgreSQL, with JWT auth, Cloudinary for file uploads, and Nodemailer for email

## Commands

### Root
```bash
npm run start:both        # Run SPA and API concurrently in debug mode
```

### SPA (`spa/`)
```bash
npm run start             # Dev server on port 4200
npm run build             # Production build
npm run test              # Run tests (Karma/Jasmine)
npm run watch             # Build in watch mode
npm run start-pwa         # Production build + serve as PWA
```

### API (`api/`)
```bash
npm run start:dev         # Dev server with watch
npm run build             # Compile NestJS
npm run test              # Jest unit tests
npm run test:e2e          # End-to-end tests
npm run test:integration  # Integration tests
npm run lint              # ESLint with auto-fix
npm run format            # Prettier format
npm run start:azure       # Build + Azure Functions local host
```

## Architecture

### Frontend (`spa/src/app/`)

**Routing:** Lazy-loaded standalone components with `loadComponent()`. Two route guards:
- `authGuard` — requires authentication, redirects to `/login`
- `guestGuard` — blocks authenticated users (login/signup pages)

**State Management:** NgRx Signals stores in `store/`. Each store uses `patchState()` for updates and `computed()` for derived state. Stores are injected via custom hook functions (`useAuthStore()`, `useTravelStore()`, etc.).

Key stores: `AuthStore`, `TravelStore`, `TransactionStore`, `CollaboratorStore`, `SavingsStore`, `CurrencyStore`, `LoadingStore`.

**HTTP Layer:**
- API services live in `services/api/`
- HTTP interceptors (applied globally): `jwtInterceptor` (auth headers), `urlInterceptor` (base URL), `loadingInterceptor` (loading state), `catchErrorInterceptor` (error handling)

**Styling:** Tailwind CSS 4 + DaisyUI 5. Theme (dark/light) is persisted in localStorage.

**i18n:** `@ngx-translate/core` — translation keys in templates, JSON translation files.

### Backend (`api/src/`)

**Layered service pattern:**
```
Controllers → Manager Services (business logic) → Access Services (DB/Supabase queries)
```

- Controllers: `host/controllers/`
- Business logic: `manager/services/`
- Data access: `access/data/services/`
- Entities/models: `access/data/entities/`

**Auth:** Passport-JWT for protected endpoints, Basic Auth for login. `PrivateEndpointGuard` protects API routes.

**Key modules:** Auth, Users, Travels (+ operations, members, attachments), Transactions (+ splits, reimbursements), Collaborators (+ matches, invitations), Savings Goals (+ installments, deposits), Configuration (currencies, payment methods), Blob (Cloudinary), Mail (Nodemailer), Cache (1hr TTL).

**Environment config:** `api/.env` and `api/.env.local` — requires `SPA_URL`, SMTP settings, Supabase credentials, and Cloudinary credentials.

## Key Patterns

- **Zoneless Angular:** The app uses Angular's zoneless change detection with signals — avoid triggering zone-based change detection patterns.
- **Injection tokens:** Feature modules use tokens like `TRANSACTION_TOKENS`, `SAVINGS_TOKENS`, `TRAVEL_TOKENS` for DI.
- **rxMethod():** NgRx Signals' `rxMethod()` is used for reactive store methods that call API services. Standard pattern is `tap → switchMap → tap/catchError`.
- **Unsaved changes guard:** `WarningUnsavedChanges` guard is implemented on forms — components using it must implement the required interface.
- **File uploads:** Cloudinary is the storage backend; the frontend file upload component (currently being built on branch `149-add-file-upload-module`) supports drag-and-drop with type and size validation.
