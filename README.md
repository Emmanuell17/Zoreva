# Zoreva

**Choose a shift. Confirm attendance. Enter hours.**

Zoreva is a mobile-first shift coordination app for teams that still run on chat groups, paper timesheets, and a separate payroll site. It does not try to replace that process. It sits next to it and gives managers a digital record of who picked a shift, who confirmed, and which hours were submitted.

Frontend MVP built with **Next.js 16**, **React 19**, **TypeScript**, **Tailwind CSS 4**, and **Firebase Authentication**.

[Live app](#getting-started) · [Architecture](#architecture) · [What this demonstrates](#what-this-demonstrates)

---

## Why it exists

Shift teams often know who is supposed to work, but not who has actually committed. Hours still live on paper. Tools that demand a full payroll or HRIS replacement fail in that environment.

Zoreva is designed as a **companion workflow**:

1. A manager opens shifts for a day.
2. Employees choose a shift on their phone.
3. The app reminds them to confirm before the shift starts.
4. After the shift, they enter hours in the same place.
5. The manager reviews confirmations and hours against the existing paper/payroll process.

Digital records are useful on day one, even while Facebook, paper forms, and payment stay in place.

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
- Review submitted hours (`submitted` / `approved` / `check paper`)
- Look at basic history without leaving the existing payment process

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
| Product sense | Companion-to-legacy design instead of “replace the factory” |
| Frontend architecture | Next.js App Router, role-based route groups, shared UI primitives |
| Domain modeling | Shifts, signups, hours, companies, templates as typed entities |
| State | In-memory store + `useSyncExternalStore`, persisted per company in `localStorage` |
| Auth | Firebase Google sign-in with popup, redirect fallback, and return-to routing |
| UX | Dark, large-tap mobile UI; field-level validation; empty/loading states |
| Honesty about scope | Mock persistence today, service boundary ready for a backend |

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
                                      ┌──────────▼───────────┐
                                      │ Company workspace    │
                                      │ localStorage         │
                                      │ (per manager owner)  │
                                      └──────────────────────┘
```

**Routing**

| Path | Role | Purpose |
| --- | --- | --- |
| `/` | Public | Product landing |
| `/register` · `/login` | Public | Google auth + role pick |
| `/setup` | Manager | First-run company workspace |
| `/employee/*` | Employee | Home, choose, schedule, hours, reminders |
| `/admin/*` | Manager | Home, shifts, hours, history |

Auth is Firebase. Role is stored locally after sign-in so the client can route to the right shell. Company setup creates a workspace keyed to the manager’s owner id; schedule changes write back into that workspace.

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
| Domain data | Typed in-memory services + local workspace persistence |

---

## Project layout

```text
app/                 Route groups: landing, auth, setup, employee, admin
components/          Feature UI (auth, admin, employee, setup, shifts, layout)
hooks/               Schedule and company subscriptions
lib/company/         Workspace build, persistence, defaults
lib/services/        Schedule commands and queries
lib/firebase/        Auth + client config
lib/validation.ts    Shared form rules
types/               Domain types (Shift, Signup, Hours, Company)
```

---

## Getting started

**Requirements:** Node.js 18+ and npm

```bash
git clone https://github.com/Emmanuell17/Availability-and-shift-coordinator-.git
cd Availability-and-shift-coordinator-
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

```bash
npm run lint
npm run build
npm run start
```

---

## Current scope

**In this MVP**

- Employee choose → confirm → schedule → hours
- Manager setup, shift CRUD, confirmation overview, hours review
- Firebase Google authentication
- In-app reminders derived from live shift state
- Per-manager workspaces in the browser

**Intentionally not in this MVP**

- Email/password auth
- Server-side database or REST API
- Server-side role and tenancy (roles are client-side today)
- Email or push delivery
- Integrations with Facebook, paper, or payroll (those stay as they are)

The next production step is a real backend behind the existing schedule service: persist companies, shifts, signups, and hours, and move role storage off the client.

---

## Author

Built by [Emmanuel](https://github.com/Emmanuell17) as a product-focused frontend project: operational workflow, typed domain rules, and a UI people can use on a phone.

---

## License

Private portfolio project. All rights reserved.
