# Zoreva

**Availability & shift coordination for teams**

Frontend MVP built with **React**, **Next.js**, and **TypeScript**.

Zoreva helps employees share weekly availability and managers assign, track, and cover shifts — without scheduling through group chats and having to send messages.

> Portfolio project focused on product UX, role-based flows, and a clean architecture that can plug into a real backend later.

---

## Problem

Small teams often schedule in chat. That leads to missed shifts, unclear coverage, and slow swap approvals.

Zoreva gives both roles one shared place to work from.

| Employees can | Managers can |
| --- | --- |
| Submit weekly availability | Review the team roster |
| Confirm or cancel assigned shifts | Create and monitor shifts |
| Request shift swaps | Approve or reject swap requests |
| Stay updated with notifications | Spot coverage gaps early |

---

## Features

### Product surface
- Brand landing page
- Login and registration screens with client-side validation
- Separate **Employee** and **Manager** app experiences
- Responsive layout for mobile, tablet, and desktop

### Employee
- Dashboard with upcoming shifts
- Weekly availability form (notes + validation)
- Confirm / cancel shifts
- Request and track shift swaps
- Notifications page + navbar dropdown

### Manager
- Overview with shift/swap stats and coverage board
- Employee directory
- Shift table + create-shift modal
- Swap approval workflow

### UX polish
- Custom UI kit (button, input, card, table, modal, badge)
- Field-level form validation
- Loading skeletons and empty states
- Consistent dark theme, spacing, and typography

---

## Tech stack

| Area | Technology |
| --- | --- |
| UI library | **React 19** |
| Framework | **Next.js 16** (App Router) |
| Language | **TypeScript** |
| Styling | **Tailwind CSS 4** |
| Fonts | Geist Sans / Geist Mono |
| Auth | **Firebase Authentication** (Google sign-in) |
| Demo data | In-memory mock services + `useSyncExternalStore` |

Built without a third-party component library — UI primitives are custom and reusable.

**Not used:** Angular or Vue.

---

## Project structure

```text
app/                     # Routes: landing, auth, employee, manager
components/
  ui/                    # Shared primitives
  layout/                # App shell, sidebar, mobile nav
  employee/              # Employee feature UI
  manager/               # Manager feature UI
  shifts/                # Shared shift cards
  notifications/         # Notification UI
lib/
  mocks/                 # Seed data
  services/              # Session data APIs (swaps, shifts, etc.)
  validation.ts          # Shared form validators
types/                   # Domain types
```

### Design choices worth noting
- **Separation of concerns:** UI talks to service modules, not raw seed arrays
- **Live session updates:** services notify subscribers when data changes
- **Role-based routing:** employee and manager areas use dedicated layouts
- **Backend-ready shape:** mock services can be replaced with real API calls without rewriting screens

---

## Screenshots

_Add 2–4 screenshots here before sharing with employers (landing, employee shifts, manager shifts, swap approvals)._

```text
![Landing](docs/screenshots/landing.png)
![Employee shifts](docs/screenshots/employee-shifts.png)
![Manager shifts](docs/screenshots/manager-shifts.png)
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

### Firebase Google auth setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Add a **Web** app and copy the config values
3. Enable **Authentication → Sign-in method → Google**
4. Under Authentication → Settings → Authorized domains, add `localhost`
5. Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

6. Restart `npm run dev`
7. On **Register**, pick Employee or Manager, then **Continue with Google**
8. On **Log in**, use **Continue with Google**

Role is stored locally after sign-in so the app can route to `/employee` or `/manager`. Without Firebase env vars, the UI still loads for local browsing.

**Useful routes**

| Path | What you’ll see |
| --- | --- |
| `/` | Landing page |
| `/register` · `/login` | Auth UI (frontend only; redirects by role) |
| `/employee` | Employee dashboard, availability, shifts, swaps, notifications |
| `/manager` | Manager dashboard, employees, shifts, swap approvals |

```bash
npm run build    # Production build
npm run start    # Run production build
npm run lint     # Lint
```

---

## What’s included vs what’s next

### Included in this MVP
- Full employee and manager UI flows
- Firebase Google authentication
- Mock services for employees, shifts, swaps, and notifications
- Validation, loading/empty states, and responsive polish

### Not included yet
- Email/password Firebase auth
- Persistent database or REST API
- Server-side role storage (roles are local for now)
- Email or push notification delivery

---

## What this demonstrates

- Building a multi-role product UI in React + Next.js
- Structuring a growing App Router codebase
- Designing reusable components and validation helpers
- Thinking beyond “pages” — services, types, and UX states employers expect in production apps

---

## License

Private portfolio project. All rights reserved.
