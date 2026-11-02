# My Events

Personal finance web app: shared expenses with other people, travels, savings, loans, bank accounts and a net worth dashboard that shows where every guaraní is.

## Features

| Module | What it does |
| --- | --- |
| **Dashboard** | Net worth (assets − debts) by currency, liquidity and institution, plus a summary of every module. |
| **Accounts** | Checking, savings accounts and cash, with a monthly balance snapshot per account. |
| **Savings Goals** | Installment goals (fixed, ascending, descending, random), free form, scheduled savings, fixed deposits, CDAs, mutual funds and rotating savings, with payouts and actual vs. estimated yield. |
| **Loans** | Money you borrowed and money you lent, with amortization schedule, payments and early payoff. |
| **Transactions** | Expenses shared with collaborators: who paid, how it is split and what is still pending. |
| **Collaborators** | People you share expenses with; they can be linked to a real user through match requests. |
| **Travels** | Trips with members, operations in any currency, card charges in local currency and attachments. |

The app is available in Spanish and English, with light and dark themes, and can be installed as a PWA.

## Tech stack

- **Frontend (`spa/`)**: Angular 20 (standalone components, zoneless), NgRx Signals, Tailwind CSS 4 + DaisyUI 5, ngx-translate.
- **Backend (`api/`)**: NestJS 10 with layered services (controllers → managers → access), Passport JWT, deployable as Azure Functions.
- **Database**: Supabase (PostgreSQL). The full schema and migrations live in [`resources/db.sql`](resources/db.sql).
- **Services**: Cloudinary (attachments), Nodemailer (emails), Web Push (notifications).

## Getting started

### Requirements

- Node.js 18 or later
- A Supabase project
- Cloudinary account and SMTP credentials (only for attachments and emails)

### 1. Database

Run [`resources/db.sql`](resources/db.sql) in the Supabase SQL editor. The script is split into numbered parts (`PARTE N`); when updating an existing database, run only the parts added since your last update.

### 2. API environment

Create `api/.env`:

```env
SUPABASE_URL=
SUPABASE_KEY=
JWT_TOKEN=
URL=                     # SPA URL allowed by CORS
URL2=                    # optional second SPA URL
LOCAL_DEV=true           # allows any http://localhost:<port> origin
MAIL_HOST=
MAIL_USER=
MAIL_PASSWORD=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
WEB_PUSH_PUBLIC_KEY=
WEB_PUSH_PRIVATE_KEY=
```

### 3. Install and run

```bash
cd api && npm install
cd ../spa && npm install
cd .. && npm install

npm run start:both       # SPA on http://localhost:4200 + API in debug mode
```

## Useful commands

| Where | Command | Description |
| --- | --- | --- |
| root | `npm run start:both` | Run SPA and API together |
| `spa/` | `npm run start` | Dev server on port 4200 |
| `spa/` | `npm run build` | Production build |
| `spa/` | `npm run start-pwa` | Production build served as a PWA |
| `api/` | `npm run start:dev` | API with watch mode |
| `api/` | `npm test` | Unit tests (Jest) |
| `api/` | `npm run build` | Compile the API |
| `api/` | `npm run start:azure` | Build and run with the Azure Functions host |

## Project structure

```text
api/src/
  host/        controllers, API request models, guards
  manager/     business logic and models
  access/      Supabase data access (contracts + services)
  utility/     enums, injection tokens, helpers (loan, savings and net worth calculators)
spa/src/app/
  components/  standalone pages and shared inputs
  store/       NgRx Signals stores (useXStore hooks)
  services/    API services and helpers
  models/      API models and enums
spa/src/assets/i18n/   es.json / en.json
resources/db.sql       database schema and migrations
```

## Roadmap

Work is tracked in GitHub issues grouped by epics. The current goal is the **net worth** roadmap: foundations, accounts and balances, dashboard MVP and full dashboard, followed by the MyMoney integration and a read-only MCP agent.
