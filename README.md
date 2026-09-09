# Zoreva

**Choose a shift. Confirm. Enter hours.**

A simple, mobile-first app for factory teams. It sits **next to** Facebook, paper forms, and the payment website — it does not replace them.

Frontend MVP built with **React**, **Next.js**, and **TypeScript**.

---

## How it works

### Employee

1. Choose a shift in the app
2. Get a reminder
3. Confirm you are coming
4. Still use Facebook if the team needs that
5. Work
6. Still complete the paper form
7. Enter the same hours in the app
8. Continue payment on the existing website

### Admin

1. Create open shifts
2. See who chose each shift
3. See who confirmed (and who has not)
4. Continue the usual no-show process
5. See submitted hours
6. Compare digital hours with paper records
7. Continue the existing payment process

The digital record is useful from day one, even while the old process stays active.

---

## Roles

**Employee** — log in, choose open shifts, see the schedule, confirm, view reminders, enter hours after a shift, review submitted hours.

**Admin** — log in, create/manage shifts, see who selected and who confirmed, review/approve hours, look at basic history.

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

**Not used:** Angular or Vue.

---

## Getting started

**Requirements:** Node.js 18+ and npm

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Firebase Google auth setup

1. Create a project in the [Firebase Console](https://console.firebase.google.com/)
2. Add a **Web** app and copy the config values
3. Enable **Authentication → Sign-in method → Google**
4. Under Authentication → Settings → Authorized domains, add `localhost`
5. Copy `.env.example` to `.env.local` and fill in the Firebase keys
6. Restart `npm run dev`
7. On **Register**, pick Employee or Admin, then **Continue with Google**

Role is stored locally after sign-in so the app can route to `/employee` or `/admin`. Without Firebase env vars, the UI still loads for local browsing.

**Useful routes**

| Path | What you’ll see |
| --- | --- |
| `/` | Landing page |
| `/register` · `/login` | Auth UI |
| `/employee` | Home, choose, schedule, hours, reminders |
| `/admin` | Home, shifts, hours, history |

```bash
npm run build
npm run start
npm run lint
```

---

## What’s included vs what’s next

### Included
- Employee choose → confirm → schedule → hours
- Admin create shifts, confirmations, hours review
- Firebase Google authentication
- In-app reminders derived from real shift state
- Companion copy so the old factory process stays in place

### Not included yet
- Email/password Firebase auth
- Persistent database or REST API
- Server-side role storage (roles are local for now)
- Email or push notification delivery
- Facebook, paper, or payment-site integrations (by design — those stay as they are)

---

## License

Private portfolio project. All rights reserved.
