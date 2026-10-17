# Zoreva

**Choose a shift. Confirm attendance. Enter hours.**

Zoreva is a mobile-first shift coordination app. Managers open shifts. Employees choose one, confirm they are coming, and enter hours after the shift.

Frontend MVP built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Firebase Authentication**.

[Live app](#getting-started) · [Architecture](#architecture) · [What this demonstrates](#what-this-demonstrates)

---

## Why it exists

Shift teams often know who is supposed to work, but not who has actually committed.

1. A manager opens shifts for a day.
2. Employees choose a shift on their phone.
3. The app reminds them to confirm before the shift starts.
4. After the shift, they enter hours in the same place.
5. The manager sees who confirmed and which hours were entered.

---

## Product

### Employees

- Sign in with Google and land on a phone-first home screen
- Browse open shifts and claim a slot
- See remaining capacity, overlapping-shift blocks, and full-shift states
- Confirm attendance from the schedule
- Submit hours after a shift, then review what was sent

### Managers

- Complete a guided company setup (name, team size, named shift templates)
- Get an isolated workspace per manager account
- Create, edit, and remove upcoming shifts (with presets for common factory windows)
- See who selected vs who confirmed
- See the hours employees entered
- Look at past shifts and the hours recorded for them

### Constraints the UI actually enforces

The schedule service is not a thin CRUD layer. It encodes shop-floor rules in TypeScript:

- No booking a shift that has already finished
- No double-booking overlapping times for the same person
- Capacity cannot drop below people already signed up
- Duplicate day + time slots are rejected
- Shifts with signups cannot be deleted
- Hours can only be submitted against a real signup

That domain logic lives in `lib/services/schedule.ts` and `lib/shift-utils.ts`, so a future API can reuse the same rules.

---

## What this demonstrates

This is a portfolio product, not a production multi-tenant SaaS. It is written so a hiring manager can see how I think about real operations software:

| Area | What you will find |
| --- | --- |
| Product sense | Phone-first flow: choose a shift, confirm, enter hours |
| Frontend architecture | Next.js App Router, role-based route groups, shared UI primitives |
| Domain modeling | Shifts, signups, hours, companies, templates as typed entities |
| State | In-memory store + `useSyncExternalStore`, synced to Firestore and cached in `localStorage` |
| Auth | Firebase Google sign-in with popup, redirect fallback, and return-to routing |
| UX | Dark, large-tap mobile UI; field-level validation; empty/loading states |
| Honesty about scope | Client-side domain rules today; roles still live on the device |

---

## Architecture

```text
┌─────────────┐     Google OAuth      ┌──────────────────────┐
│  Browser UI │ ───────────────────►  │ Firebase Auth        │
│  Next.js    │                       └──────────────────────┘
│  App Router │
│             │     subscribe()       ┌──────────────────────┐
│  Employee / │ ◄──────────────────►  │ Schedule service     │
│  Admin      │     commands          │ (capacity, overlap,  │
│  routes     │                       │  confirm, hours)     │
└─────────────┘                       └──────────┬───────────┘
                                                 │ persist
                            ┌────────────────────▼────────────────────┐
                            │ Company workspace                       │
                            │ Firestore (source of truth)             │
                            │ localStorage cache + mock seed fallback │
                            └─────────────────────────────────────────┘
```

**Routing**

| Path | Role | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing |
| `/register` · `/login` | Public | Google auth + role pick |
| `/setup` | Manager | First-run company workspace |
| `/join` · `/join/[code]` | Employee | Join a company with a manager’s code |
| `/employee/*` | Employee | Home, choose, schedule, hours, reminders |
| `/admin/*` | Manager | Shifts, hours, history, advisor |
| `/api/advisor/*` | Server | Operations Advisor jobs (InfiniSynapse, key stays on the server) |

Auth is Firebase. Role is stored locally after sign-in so the client can route to the right shell. Company setup creates a workspace keyed to the manager’s owner id. Employees join with a code. Schedule changes write back into that workspace in Firestore (and a local cache).

Without Firebase env vars the UI still loads, which keeps local browsing and UI work unblocked.

---

## Tech stack

| Layer | Choice |
| --- | --- |
| UI | React 19 |
| Framework | Next.js 16 (App Router, webpack dev server) |
| Language | TypeScript |
| Styling | Tailwind CSS 4, Geist fonts, dark theme |
| Auth | Firebase Authentication (Google) |
| Domain data | Typed in-memory services + Firestore workspaces |
| Backend | Firebase Auth + Cloud Firestore |

---

## Project layout

```text
app/                 Route groups: landing, auth, setup, join, employee, admin
app/api/advisor/     Advisor endpoints (analyze, status, cancel, health)
components/          Feature UI (landing, auth, admin, employee, setup, join, shifts, layout)
hooks/               Schedule and company subscriptions
lib/company/         Workspace build, Firestore + local persistence, join codes
lib/services/        Schedule commands and queries
lib/advisor/         In-memory advisor job store
lib/infinisynapse/   Server-only InfiniSynapse adapter
lib/workforce/       Workforce file parsing and local checks
lib/firebase/        Auth + Firestore client config
lib/validation.ts    Shared form rules
types/               Domain types (Shift, Signup, Hours, Company)
```

---

## Getting started

**Requirements:** Node.js 18+ and npm

```bash
git clone https://github.com/Emmanuell17/Zoreva.git
cd Zoreva
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Firebase (optional for browsing, required for Google sign-in)

1. Create a project in the [Firebase Console](https://console.firebase.google.com/).
2. Add a **Web** app and copy the config values.
3. Enable **Authentication → Sign-in method → Google**.
4. Add `localhost` under Authentication → Settings → Authorized domains.
5. Copy `.env.example` to `.env.local` and fill in the keys.
6. Restart `npm run dev`.
7. On **Register**, pick Employee or Admin, then **Continue with Google**.

### InfiniSynapse (Operations Advisor)

The API key is **server-only**. Put it in `.env.local` as `INFINISYNAPSE_API_KEY` (never `NEXT_PUBLIC_…`). Full setup, production env vars, and a manual test are in [docs/INFINISYNAPSE.md](docs/INFINISYNAPSE.md).

```bash
npm run test:advisor
npm run test:infinisynapse
npm run lint
npm run build
npm run start
```

---

## Current scope

**In this MVP**

- Employee join (code) → choose → confirm → schedule → hours
- Manager setup, shift CRUD, confirmation overview, submitted hours
- Firebase Google authentication
- Firestore workspaces shared between a manager and their team
- InfiniSynapse operations advisor for uploaded workforce CSV/Excel (advisory only)
- In-app reminders derived from live shift state

**Intentionally not in this MVP**

- Email/password auth
- A server-side API for the schedule itself (only the Advisor has server routes today)
- Server-side role and tenancy (roles are client-side today)
- Email or push delivery
- Payroll or chat integrations

The next production step is to keep the same schedule service, then move role storage and tenancy checks off the client.

---

## Author

Built by [Emmanuel](https://github.com/Emmanuell17) as a product-focused frontend project: operational workflow, typed domain rules, and a UI people can use on a phone.

---

## License

Private portfolio project. All rights reserved.
