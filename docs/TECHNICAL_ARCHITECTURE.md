# rifKANDO — Full-Stack Technical Architecture

**Audience:** founders, engineers, operations, security reviewers and future technical hires.  
**Repository:** `Choukti01/rifKANDO` · **Reviewed:** 2026-11-06 · **Public app:** `https://www.rifkando.com` · **API:** `https://api.rifkando.com`

This is a living technical reference derived from the current source, configuration, migrations and GitHub workflows. It deliberately separates implemented functionality from operational limits. Never place database URLs, tunnel tokens, bank details, R2 keys, OAuth secrets or session secrets in this file.

## 1. Product and domains

rifKANDO is a multi-service marketplace built in Morocco for local and wider markets.

| Domain | Purpose | Current transaction model |
| --- | --- | --- |
| Products | New, Used as New and Joutiya listings | COD with controlled operations/reconciliation |
| FINDit | Buyer need requests and seller offers | Accepted offer becomes a COD workflow |
| Services | Professional profiles, packages, workrooms and reviews | Manual bank-transfer verification and controlled payout recording |
| Courses | Instructor courses and protected lessons | Manual bank-transfer verification before access/payout |
| Food Market | Market/kitchen/local-food listings | Reuses Products, cart, COD, reviews and moderation |

Bookings and Digital remain in the repository but are controlled by feature flags. Source code existing does not mean a public launch is active.

## 2. Runtime architecture

```text
Browser / PWA (React, Vite, i18next)
        │ HTTPS
Cloudflare Worker: static SPA + route SEO
www.rifkando.com
        │ API calls
Cloudflare DNS
api.rifkando.com
        │ HTTPS
Node.js / Express API on Railway (production)
        ├──────────────► Neon PostgreSQL
        └──────────────► Cloudflare R2 / S3-compatible storage
```

### Important current boundary

The Cloudflare storefront is independently available and the Node API runs on Railway. The production path no longer depends on a Windows machine or Cloudflare Tunnel. Railway currently runs one API replica, so it is reliable always-on hosting but not yet a multi-region/high-availability deployment.

Cloudflare Workers serve the frontend; they do **not** host the current Express API. Migrating the backend to a Worker-native runtime is a separate refactor because the Node origin uses Express, `sqlite3`, `sharp`, filesystem streams, timers and server semantics.

## 3. Full stack

### Frontend

| Concern | Technology | Purpose |
| --- | --- | --- |
| UI | React 18 | Component-based marketplace application |
| Build | Vite 8 | Local dev and production bundle |
| Routing | React Router 7 | Public, buyer, seller, operations and admin routes |
| HTTP | Axios | Cookie-aware API client / CSRF-aware requests |
| Translation | i18next, react-i18next | English, French and Arabic/RTL |
| UX | CSS brand system, Framer Motion, Heroicons | Brand blue/glass/wave system and responsive UI |
| Media/forms | react-dropzone, native inputs | Upload selection and browser validation assistance |
| Authentication UI | Google OAuth, SimpleWebAuthn browser | Google login and passkeys |
| Documents | @react-pdf/renderer | Browser-side supported document/invoice UI |
| Testing | Vitest, Testing Library, Playwright | Unit/component and browser navigation tests |
| PWA | Manifest, service worker, icons | Installable app shell |

### Backend

| Concern | Technology | Purpose |
| --- | --- | --- |
| Runtime/API | Node.js + Express 4 | HTTP application, routing and middleware |
| Database | Neon PostgreSQL through `pg` | Production durable data |
| Local compatibility | SQLite | Isolated development/smoke-test runtime only |
| Migrations | Versioned PostgreSQL SQL | Immutable, reviewable schema evolution |
| Authentication | Secure session cookies, CSRF, passkeys | Browser sessions, revocation and passwordless support |
| Identity | Google auth library, Twilio | Google token verification and optional SMS OTP |
| Files | AWS S3 SDK / R2 compatibility | Public and private object storage |
| Media | Multer and Sharp | Constrained upload pipeline and Node-origin image handling |
| Notifications | Durable in-app notification records | User-scoped marketplace alerts |
| Finance | Minor-unit money service, wallets/ledger/COD services | Transaction integrity and reconciliation support |
| Observability | Structured JSON logs, request IDs, protected metrics | Incident investigation and operational visibility |

### Platform

| System | Current use |
| --- | --- |
| Cloudflare Workers | Frontend assets, SPA routing and dynamic SEO metadata |
| Cloudflare DNS/Tunnel | Securely maps `api.rifkando.com` to the private backend origin |
| Cloudflare R2 | S3-compatible target for public/private media when configured |
| Neon | Managed PostgreSQL and provider recovery/restore branches |
| GitHub | Source control and Actions CI |
| GitHub Actions | Quality gate plus 30-minute storefront/API/database/R2 readiness monitor |

## 4. Repository map

```text
src/                         React frontend
  pages/                     Marketplace, buyer, seller, admin, operations views
  components/                Shared UI, media, auth, notification, SEO components
  contexts/                  Authentication, cart and favorites state
  i18n/                      English, French, Arabic translations
  services/api.js            Central Axios/browser-session client
  cloudflareWorker.js        Static/SEO Worker behavior
  styles/                    Brand, waves and responsive mobile CSS
public/                      PWA manifest, service worker, icons, robots
e2e/                         Playwright navigation tests
.github/workflows/           CI and uptime monitor
rifKANDI-backend/
  src/app.js                 Express composition root
  src/routes/                Domain routers
  src/services/              Finance, auth, storage, audit, notification logic
  src/middleware/            Security, upload, auth, validation, observability
  migrations/postgres/       Immutable PostgreSQL migrations
  scripts/                   Tests, migrations, backup and maintenance commands
  deploy/                    legacy local/Oracle deployment helpers (not production)
```

The backend is a **modular monolith**: domains are isolated into routes/services while financial, audit and access logic remain within one deployable application. Do not create microservices without a concrete scaling or isolation requirement.

## 5. Frontend design and behavior

`src/main.jsx` starts React; `src/App.jsx` defines all public/protected/lazy-loaded routes. The shared application shell includes the Navbar, Footer, language switcher, notification center, error boundary, unavailable state and mobile/RTL styling.

`src/services/api.js` is the only approved browser API client. It sends secure session credentials, supplies CSRF context for unsafe methods, and uses the controlled refresh flow. Browser code must never contain database, storage, SMS, bank, CMI, tunnel or session secrets. `VITE_*` variables are public by design.

### Localization and responsive rules

Supported languages are `en`, `fr`, and `ar`. Arabic switches document direction to RTL. All new public strings must be translated; do not hard-code English into feature components.

For any UI change:

1. Build mobile-first and prevent horizontal page overflow.
2. Use usable touch targets and readable contrast.
3. Test desktop, tablet, narrow mobile and Arabic RTL views.
4. Design loading, empty, unavailable, unauthorized and success states.
5. Preserve the rifKANDO blue visual system; use white/glass surfaces and soft wave dividers only at major layout boundaries.
6. Do not create an interface that hides essential content behind an unresponsive sidebar.

### SEO

`RouteSeo`, `SeoHead`, `seoConfig`, `cloudflareWorker.js`, `robots.txt` and the sitemap provide canonical URLs, route metadata, social metadata and structured data. Index only valuable public pages. Never index checkout, dashboards, account routes, operations/reconciliation pages, empty states or arbitrary search filters. Product structured data must be truthful.

## 6. Backend composition

`rifKANDI-backend/src/app.js` registers:

1. Request IDs and structured request observability.
2. Security headers and strict CORS origin behavior.
3. Size-limited JSON/form parsers.
4. Local public-media paths only when local storage is selected.
5. Authentication and feature flag guards.
6. Domain routers plus retained legacy-compatible endpoints.
7. Safe 404 and central error handlers.

`server.js` validates environment configuration, waits for `db.ready`, starts Express, runs COD expiry work, and performs graceful shutdown.

### Main domains

| Module | Responsibility |
| --- | --- |
| `authRoutes`, auth controller, `sessionService` | Google, passkeys, phone OTP, secure cookie sessions and revocation |
| `productRoutes` | Listings, media, storefronts, reviews, reports, trust, saved searches |
| `finditRoutes` | Buyer requests, seller offers, acceptance and COD conversion |
| `serviceRoutes` | Profiles, packages, client briefs, workroom, disputes, transfer verification/payouts |
| `courseRoutes`, `coursePaymentRoutes` | Courses, lessons, enrollment, transfer reconciliation and payout records |
| `digitalRoutes` | Controlled digital access/download delivery |
| `bookingRoutes` | Availability and appointment protocol |
| `disputeRoutes` | COD delivery dispute workflow |
| `codFulfillmentService` | COD state/collection/remittance/commission/payout integrity |
| `walletService`, `moneyService` | Minor-unit arithmetic, ledger and financial state handling |
| `storageService`, `digitalFileService` | Public/private object boundaries and protected files |
| `notificationService` | Durable in-app notifications |
| `auditService`, error/observability services | Tamper-evident audit and redacted operational data |

### Operational endpoints

| Endpoint | Purpose |
| --- | --- |
| `GET /health` | Liveness: Node process responds |
| `GET /ready` | Readiness: application/database can serve traffic |
| `GET /metrics` | Aggregate metrics; requires `X-Metrics-Token` |

All responses include `X-Request-ID`. Preserve it for incident reports. Logs must not include request bodies, cookies, auth headers, payment references or secrets.

## 7. Authentication, roles and security

### Authentication flows

- **Google:** Browser sends a Google credential; backend verifies it and maps it to a rifKANDO user.
- **Passkeys:** WebAuthn credential registration/verification is server controlled.
- **Phone:** Six-digit OTP is available only after a complete Twilio setup. If not configured, phone endpoints return a clear unavailable response.

Sessions are server-recorded, HTTP-only cookies. Access expiration/refresh rotation and session revocation are backend controlled. POST/PUT/PATCH/DELETE require valid CSRF state.

### Roles and scoped privileges

Core roles include `buyer`, `seller`, `support`, `operations`, `finance`, `admin`, and `super_admin`. Server authorization is mandatory—frontend hiding is only UI.

| Restricted area | Rule |
| --- | --- |
| COD Operations Desk | Delivery/parcel facts only; no cash reconciliation authority |
| COD Reconciliation | Exact configured founder/finance emails; collection, commission, remittance and payout controls |
| Service/Course reconciliation | Dedicated restricted reconciliation access |
| Error Tracking | Founder-restricted operational view |
| Product reports | Private reporter/moderator workflow; seller does not see reporter identity |

Suspended marketplace accounts are blocked at backend authentication. Serious moderation can end listings and revoke active sessions.

### Security controls

- Production startup rejects weak/reused secrets, invalid origins, unsafe database/storage configuration and partial CMI setup.
- CORS uses allowed origins; deployed origins require HTTPS.
- Server validation covers field limits, enums, IDs, pagination and financial values.
- Public and private storage objects are separate; private uses opaque `storage://` references.
- Financial math uses integer minor units—never JavaScript floating point for balances or settlements.
- Sensitive workflows use conditional state checks, transactions/idempotency records and audits.
- Reviews require an actual delivered COD fulfilment for the relevant buyer, product and seller.
- Seller trust badges are calculated from delivered orders and verified reviews; there are no invented “verified” claims.
- Application error tracking is redacted and access-controlled.

Contributor rules: never commit `.env`, customer uploads, database URLs, credentials or tunnel tokens; never alter an applied migration; never weaken CORS/CSRF/validation to bypass a browser error; never publish private files to solve an access issue.

## 8. Data, migrations and recovery

PostgreSQL is the production target. SQLite remains supported for isolated local development and compatibility tests. Migrations in `rifKANDI-backend/migrations/postgres/` are append-only and recorded in `schema_migrations`.

Major data families:

| Family | Main records |
| --- | --- |
| Identity | users, auth sessions, passkey/phone challenges |
| Catalog | products, media, reviews, reports, cart, favorites |
| COD | orders, items, fulfilments, status history, delivery/settlement evidence |
| FINDit | requests, media, offers, accepted-offer orders |
| Services | services, packages, provider profiles, orders, workroom, transfers, disputes, reviews |
| Courses | courses, lessons, enrollments, progress, transfers |
| Financial | wallets, ledger, escrow, refunds, withdrawals, payment operations |
| Operations | notifications, audit logs, application errors, disputes |
| Discovery | saved searches and idempotent saved-search notification markers |

Migration 036 uses `mida` as an internal stable database value for the public **Food Market / المأكولات** marketplace. Do not rename persisted values without a new explicit migration.

### Migration process

```powershell
cd rifKANDI-backend
npm run db:postgres:plan
$env:POSTGRES_MIGRATION_CONFIRM='apply-postgres-schema'
npm run db:postgres:migrate
npm run db:postgres:preflight
```

Run a backup/restore plan before applying production migrations. Do not modify already-applied SQL migrations; use a forward repair migration. Neon/provider recovery and a restore-branch drill are the primary PostgreSQL recovery mechanism. `backup:postgres:r2` requires a real `pg_dump` installation and a private R2 target.

## 9. Files and media

| Namespace | Visibility | Examples |
| --- | --- | --- |
| `public/` | Browser/CDN readable | Listing media, profile photos, portfolio images |
| `private/` | Authenticated backend delivery only | Paid digital files, invoices and confidential records |

`OBJECT_STORAGE_DRIVER=local` is for development/single disk-backed host. `OBJECT_STORAGE_DRIVER=s3` supports R2/S3 and requires separate public/private buckets, least-privilege credentials and a public base URL. Private bucket access must never be public.

Uploads are constrained then attached to listings. A product needs a clear image cover; pre-owned conditions need at least two real photos. Videos complement, not replace, the cover photo. Service credential proofs may be PDF/image evidence but must not be ID cards, passports, banking records or sensitive documents.

## 10. Core marketplace state flows

### Products/COD

```text
Seller publishes → buyer cart/checkout → seller confirms before deadline
→ Operations: handoff, delivery quote, carrier/tracking
→ delivered / refused / returned
→ Reconciliation: collection evidence, delivery cost, commission,
  remittance and seller payout
→ eligible buyer review
```

Toufiq/operations records parcel facts; restricted reconciliation records money. Sellers do not set arbitrary delivery price. A listing may be ended without destroying order history. Pre-pickup cancellation follows controlled fulfilment handling. Delivery disputes pause relevant settlement decisions.

### FINDit

```text
Buyer request → seller offers → buyer accepts one offer → COD order/fulfilment
```

Requests remain open until their buyer closes them. Commission policy is backend controlled, not frontend display text.

### Trust, moderation and discovery

- Storefronts expose safe public seller data, active listings and evidence-based reputation.
- Buyers can report scam/prohibited/misleading/counterfeit listings privately.
- Moderation can dismiss, warn, end a listing or suspend a seller; serious actions are audited.
- Product search supports condition, text, category, city, price, rating, sort and pagination.
- Buyers may save a specific search. A matching new listing creates no more than one in-app alert per saved-search/listing pair. Broad all-catalogue subscriptions are rejected.

### Services

```text
Provider profile/packages → client brief → provider accepts
→ buyer submits transfer reference → rifKANDO verifies
→ workroom / work submission / acceptance or dispute
→ controlled payout record → real client review
```

### Courses

```text
Instructor course/lessons → learner transfer submission → verification
→ enrollment / protected lessons → payout record
```

Course delivery supports protected external learning paths (such as unlisted YouTube, Zoom, Telegram, resource links). rifKANDO controls enrollment/delivery metadata; it is not a free video-transcoding host.

### Food Market

Food Market reuses Products/COD rather than creating another financial system. Its food metadata includes channel (market/kitchen), unit, origin, storage, ingredients, allergens and pickup availability.

## 11. Money and payment modes

All marketplace financial calculations use integer minor units. Wallet, ledger, escrow, withdrawal, refund, operation and reconciliation records are durable sources of truth; a screen status alone is not.

| Method | Current design |
| --- | --- |
| Product/FINDit COD | Buyer pays on delivery; Operations and Reconciliation control outcome/cash records/payouts |
| Service transfer | Buyer submits reference; restricted team verifies before work and later records payout |
| Course transfer | Same controlled verification before lesson access and payout |
| CMI | Retained integration; activate only with complete merchant config, signed callback/reconciliation testing |
| Wallet/other payment rails | Feature-flagged; do not market as live before provider/reconciliation approval |

Bank/payment configuration belongs only in backend environment variables. It must never be committed or copied into frontend source.

## 12. Feature flags and configuration

`FEATURE_FLAGS` safely controls launch/incident behavior for checkout, CMI, wallet payments, digital downloads, courses, services and digital. Invalid/duplicated values fail startup. Example format only:

```text
checkout=true,cmi_payments=false,wallet_payments=false,digital_downloads=false,courses=true,services=true,digital=false
```

Changing flags needs a backend restart and `/ready` check. Flags are safety controls, not fixes.

Configuration families:

| Family | Examples |
| --- | --- |
| Identity/origins | `NODE_ENV`, `APP_ENV`, `CLIENT_URL`, `ALLOWED_ORIGINS`, `BACKEND_URL` |
| Secrets | JWT/session/audit/OTP distinct secrets |
| Database | `DATABASE_ENGINE`, `DATABASE_URL`, SSL/pool settings |
| Storage | driver, R2/S3 endpoint, public/private bucket credentials |
| Auth | Google client ID, Twilio configuration |
| Operations | COD allow-lists, confirmation hours, metrics token |
| Payments | Bank-transfer settings; complete CMI values only when activated |

Local, staging and production must have separate database, buckets, OAuth client, secrets and payment configuration. `.env.example` is a checklist—not deployable production configuration.

## 13. Development and quality workflow

```powershell
# Frontend, from repository root
npm ci
npm run dev                  # isolated frontend: port 5174
npm run lint
npm test
npm run test:e2e
npm run test:seo
npm run test:repository-hygiene
npm run build

# Backend
cd rifKANDI-backend
npm ci
npm run dev                  # isolated SQLite backend: port 5001
npm run check
npm test
```

Run focused smoke tests while developing; run relevant full suites before changes to finance, identity, storage, migrations or deployment. The backend test collection includes authorization, sessions, validation, COD, FINDit, finance, storage, services, courses, audit, observability, migration, PostgreSQL preflight and schema parity checks.

## 14. CI/CD, deployment and rollback

GitHub Actions (`.github/workflows/ci.yml`) runs on pull requests and `main` pushes:

1. Frontend clean install, lint, unit tests, Playwright, build and dependency audit.
2. Backend clean install and comprehensive test suite.
3. Repository-hygiene and dependency security checks.

The uptime workflow requests `https://api.rifkando.com/ready` every 15 minutes.

```text
Git push → GitHub checks → Cloudflare frontend deploy
         → separate backend deployment/restart → /health + /ready
         → public API/catalog smoke check
```

Cloudflare frontend deployment does not deploy the Node backend. Restart/deploy backend separately after backend source/config changes.

Rollback rules:

- Frontend: use Cloudflare version history.
- Backend: restore prior reviewed code/config and verify readiness.
- Database: use a forward repair migration or isolated restore plan—never casually edit/revert applied migrations.
- Behavior: use scoped feature flags to stop new risky activity while retaining already-in-flight reconciliation paths.

## 15. Operations and incident response

| Source | Question answered |
| --- | --- |
| `/health`, `/ready` | Is API/live database reachable? |
| Protected `/metrics` | Are request/error/latency aggregates changing? |
| Error Tracking | What redacted errors need action? |
| COD Operations Desk | What parcels/handoffs/quotes/outcomes are pending? |
| COD Reconciliation | What cash/commission/remittance/payout record needs action? |
| Course/Service reconciliation | What transfer is awaiting verification/payout? |
| Audit logs | Who performed a privileged/financial action? |
| GitHub Actions | Did the build/test/security gate pass? |

Incident first response:

1. Check `/health` and `/ready`.
2. Record time, user impact and `X-Request-ID`.
3. Check Railway deployment status, `/health`, `/ready`, `/ready/storage`, and structured logs.
4. Consult Error Tracking for redacted diagnostic context.
5. Disable only the affected operation with a reviewed feature flag if needed.
6. Add a regression test before declaring the incident fixed.

## 16. Current limitations and next milestones

1. **Primary scaling blocker:** Windows PC + tunnel backend is not managed always-on compute.
2. **External messaging:** SMS/WhatsApp/business email needs verified provider accounts; in-app notifications are independent.
3. **Manual payments:** service/course transfers require human verification and controlled payout recording.
4. **COD carriers:** logistics execution is operational/manual; no nationwide carrier API guarantee is claimed.
5. **Worker migration:** Cloudflare Workers are not a direct host for the present Express/Sharp/SQLite-style runtime.
6. **Dependencies:** remaining audit findings need controlled upgrade branches and regression testing; never blindly run breaking `npm audit fix --force`.

Recommended sequence:

1. Move backend to managed always-on compute or begin a staged Worker-native API migration.
2. Establish separate staging (Neon/R2/OAuth/secrets/host).
3. Schedule independent PostgreSQL-to-R2 backups and complete an isolated restore-branch drill.
4. Configure external uptime/error alerts.
5. Upgrade vulnerable dependencies in tested changes.
6. Expand genuine end-to-end buyer/seller/COD/service/course tests.

## 17. Engineering conventions

- Put new functionality in domain routers/services, not more unrelated `app.js` handlers.
- Validate every untrusted field before a write.
- Use transactions/conditional updates/idempotency/audit for financial state changes.
- Store money in minor units.
- Keep public/private storage separate.
- Use safe customer errors and redacted detailed logs.
- Implement English/French/Arabic and RTL at the same time.
- Update this document whenever architecture, infrastructure, security, payments, migrations or recovery process changes.

## 18. Owner responsibility boundaries

| Owner | Responsibility |
| --- | --- |
| Founder / technical owner | Secrets, deploy approval, backup/recovery, incidents and launch approval |
| COD Operations | Handoff, carrier/tracking facts and delivery outcome |
| COD Reconciliation | Collections, commissions, remittances and seller payouts |
| Moderation | Reports, unsafe listings and suspension decisions |
| Engineer | Tests, migrations, reviews, monitoring and documentation maintenance |

Apply least privilege: delivery personnel do not need cash-reconciliation access; financial reviewers do not need broad marketplace administration.
