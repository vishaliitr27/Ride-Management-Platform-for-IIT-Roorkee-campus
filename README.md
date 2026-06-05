# IITR Rides

A real-time ride management platform for a campus served by e-rickshaws. Passengers
request rides, nearby online drivers see the request instantly, one driver takes it, and
both sides follow the ride through to completion in real time.

Full-stack app: a React frontend, a Node/Express + Socket.IO backend, and a Prisma +
SQLite database.

## Features

**Passenger**
- Register / login with an institute `@iitr.ac.in` email, edit profile
- Request a ride with pickup and destination — now or scheduled for a later time
- Manage and cancel upcoming scheduled rides
- See which drivers are online on a live map
- Track the ride in real time — status changes, the driver's location, a live arrival ETA,
  and a timestamped trip timeline
- Pay the driver by UPI after completion — scan the QR, copy the UPI ID, or open a UPI app
- Cancel a ride; rate the driver and leave feedback after completion
- Ride history

**Driver**
- Register with vehicle and license details — the profile starts as `PENDING` and must be
  verified by an admin before it can be used
- Add a UPI ID to collect ride payments; get notified when a passenger pays
- Go online / offline (only once verified)
- Receive ride requests in real time
- Accept or dismiss requests — a request can only ever be taken by one driver
- Run the ride: start, complete, or cancel — with an ETA to pickup / destination
- Dashboard with completed rides, active rides, earnings, average rating, a 7-day rides
  chart, recent history, and feedback

**Admin**
- Review driver applications filtered by status (pending / verified / rejected)
- See each driver's vehicle, license, and contact details
- Verify or reject a driver — verification is required before a driver becomes visible to
  passengers or can take rides
- Demand analytics dashboard — campus-wide ride demand over the last 14 days: peak hours,
  busiest days, popular pickup points and destinations, busiest routes, and headline
  numbers (rides, completion rate, average fare)

**Real-time (Socket.IO)**
- New requests are pushed to nearby online drivers
- Assignment and status updates are delivered live to both parties
- The driver streams location to the passenger during the ride
- Driver availability updates the passenger map

**Extras**
- Map view with Leaflet + OpenStreetMap (no API key needed)
- Fixed fares — flat ₹10 anywhere inside campus, fixed prices to/from outside points
  (railway station ₹50, bus stand ₹40, civil lines / market ₹30), distance-based fallback
  otherwise. Computed on the server (`backend/src/lib/geo.ts`), previewed on the booking page
- Ratings, feedback, and a driver analytics dashboard

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Zustand, Recharts, Leaflet |
| Backend | Node.js, Express, TypeScript, Socket.IO |
| Database | SQLite via Prisma ORM |
| Auth | JWT + bcrypt |

## Project structure

```
.
├── backend/          Express + Socket.IO API
│   ├── prisma/       schema + seed
│   └── src/
│       ├── routes/   REST endpoints
│       ├── sockets/  Socket.IO gateway and handlers
│       ├── services/ ride and driver business logic
│       ├── middleware/
│       └── lib/
└── frontend/         React app (Vite)
    └── src/
        ├── pages/    passenger, driver, and admin screens
        ├── components/
        ├── store/    auth + UI state (Zustand)
        └── lib/      api client, socket client, helpers
```

## Getting started

Requires Node 18+ and npm.

**1. Backend**

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev      # creates the SQLite database and seeds demo data
npm run dev                 # http://localhost:4000
```

**2. Frontend** (in a second terminal)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev                 # http://localhost:5173
```

Open http://localhost:5173.

## Demo accounts

Password for everyone: `password123`

- Admin: `admin@iitr.ac.in`
- Passengers (students): `aarav@iitr.ac.in`, `diya@iitr.ac.in`
- Drivers: `rohan@campusrides.in`, `sneha@campusrides.in` (both verified),
  `vikram@campusrides.in` (pending — verify him from the admin account)

To see the real-time flow, open two windows — one logged in as a passenger, one as a
driver who is online. For the single-assignment behaviour, log a third window in as a
second driver and have both try to accept the same request. To see verification, log in as
the admin, open **Driver verification**, and verify the pending driver — then log in as that
driver and notice the go-online toggle is now enabled.

## How a ride works

States: `REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED`, with `CANCELLED` reachable from
the active states.

- The state machine is enforced on the server. Illegal transitions return `409`.
- Acceptance is atomic: it is a single conditional update
  (`UPDATE rides SET driver_id = ? WHERE id = ? AND status = 'REQUESTED' AND driver_id IS NULL`).
  The first driver to match wins; everyone else gets "ride already assigned". This is what
  guarantees a ride is never handed to two drivers.
- The database is the source of truth and the sockets only carry notifications. After a
  disconnect the client re-fetches the active ride, so the UI stays consistent.

## Driver verification

Drivers can't put themselves on the road. Every driver profile carries a
`verificationStatus` of `PENDING`, `VERIFIED`, or `REJECTED`, and an admin controls it.

**The flow**

1. A driver signs up (or saves vehicle details). The profile is created as `PENDING` and
   the driver sees an "awaiting verification" banner on the dispatch screen — the go-online
   toggle is disabled.
2. An admin logs in and opens **Driver verification** (`/admin`). The `Pending` tab lists
   each applicant with their vehicle, license, and contact details.
3. The admin clicks **Verify** or **Reject**:
   - **Verify** → status becomes `VERIFIED`. The driver can now go online, appear on the
     passenger map, and accept rides.
   - **Reject** → status becomes `REJECTED` and the driver is forced offline. They keep the
     "not approved" banner and stay hidden from passengers.

**Where it's enforced** (server-side, not just the UI):

- `GET /api/drivers/available` only returns drivers that are both online **and** `VERIFIED`,
  so an unverified driver is never shown to passengers.
- Going online (`PATCH /api/drivers/me/status` and the `driver:online` socket event) is
  rejected with `403 NOT_VERIFIED` unless the profile is `VERIFIED`.
- Accepting a ride is rejected with `403 NOT_VERIFIED` for an unverified driver.
- The admin endpoints require the `ADMIN` role; anyone else gets `403`.

Admins are not self-service — they exist only via the seed (or by setting a user's `role`
to `ADMIN` directly). Public registration is limited to passengers and drivers.

## Ride scheduling

Passengers can book a ride for now or for a later time.

- On the booking page, **Schedule** reveals a date/time picker. A scheduled ride is created
  `REQUESTED` but **undispatched** (`dispatchedAt = null`), so it isn't offered to drivers,
  doesn't block booking another ride now, and isn't shown as the active ride.
- Upcoming scheduled rides are listed on the booking page and can be cancelled; they also
  show in **My rides** as `Scheduled · <time>`.
- Drivers see upcoming scheduled rides in a **Scheduled rides** section on their dispatch
  screen (`GET /api/rides/scheduled/open`) and can **claim one ahead of time** — accepting
  assigns the driver immediately, just like a normal request. New scheduled bookings are
  pushed to online drivers via `ride:scheduled-new`.
- A background **scheduler** (`backend/src/scheduler.ts`, polling every 15s) dispatches any
  ride that no driver claimed when its time arrives: it sets `dispatchedAt`, offers the ride
  to nearby drivers, and pushes `ride:scheduled-dispatched` to the passenger so their app
  jumps to live tracking.
- If the passenger is still on another live ride when a scheduled one comes due, dispatch is
  deferred to a later tick so they never have two active rides at once.

The `dispatchedAt` flag is what separates a "live" ride (offered to drivers, blocks new
immediate bookings, drives tracking) from a future scheduled one across all queries.

## Payments

Payments are UPI-based and settle directly between passenger and driver — the app records
them, it doesn't process money.

- A driver saves a **UPI ID** on their profile (Vehicle & verification page, or at sign-up).
- When a ride reaches `COMPLETED`, the passenger sees a **Pay now** action that opens the
  payment page (`/passenger/ride/:id/pay`) showing:
  - a **UPI QR code** (a standard `upi://pay?...` link encoded client-side, pre-filled with
    the driver's VPA and the fare) to scan with any UPI app,
  - the **UPI ID** with a one-tap **Copy**, and
  - an **Open in UPI app** button that launches the phone's UPI app via the deep link.
- The passenger then confirms with **I've paid** (or **Paid cash**). That records a
  `Payment` row as `SUCCESS` and pushes a `payment:received` toast to the driver in real time.
- Re-paying a settled ride is rejected with `409 ALREADY_PAID`. If the driver hasn't set a
  UPI ID, the page falls back to a cash confirmation.

## Demand analytics

The admin's **Demand analytics** page (`/admin/analytics`) turns the ride history into a
picture of when and where the campus needs rides, so dispatch and driver positioning can be
planned around real demand rather than guesswork.

- **Headline numbers** — total rides requested, completion rate, average fare, and the single
  busiest hour, over a trailing 14-day window.
- **Peak demand hours** — requests bucketed by time of day (a bar per hour, busiest hour
  highlighted). Hours are bucketed in IST on the server, so the peaks line up with the campus
  clock regardless of where the server runs.
- **Daily volume** — rides per day across the window, to spot trends and quiet days.
- **Demand by day of week** — which weekdays are busiest.
- **Popular pickup points / destinations** and **busiest routes** — ranked lists showing where
  demand concentrates.

It's computed on the server from the `Ride` table in `backend/src/services/analytics.service.ts`
(every request counts as demand; money and reliability metrics count completed rides) and served
from `GET /api/admin/analytics`. The seed (`backend/prisma/seed.ts`) generates two weeks of
realistic history — weekday-heavy, with morning and evening peaks — so the dashboard has
meaningful data out of the box.

## Accounts and the institute email rule

- **Passengers are students** and must register with an `@iitr.ac.in` email. A signup with
  any other domain is rejected (`VALIDATION_ERROR`) on both the form and the server.
- **Drivers** are vehicle operators, so they register with any email and are exempt from the
  domain rule.
- **Admins** are seeded.

## REST API

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/register` | create a passenger or driver account |
| POST | `/api/auth/login` | log in |
| GET | `/api/auth/me` | current user + profile |
| PATCH | `/api/users/me` | update profile (via `/api/auth/me`) |
| POST | `/api/drivers/onboard` | save vehicle / license details |
| GET | `/api/drivers/me` | driver profile |
| PATCH | `/api/drivers/me/status` | go online / offline |
| GET | `/api/drivers/available` | online **and verified** drivers (for the map) |
| GET | `/api/drivers/me/stats` | dashboard summary |
| GET | `/api/drivers/me/history` | driver ride history |
| GET | `/api/drivers/me/ratings` | ratings received |
| POST | `/api/rides` | request a ride |
| GET | `/api/rides/active` | caller's current active ride |
| GET | `/api/rides/requests` | open (dispatched) requests (driver) |
| GET | `/api/rides/scheduled` | caller's upcoming scheduled rides (passenger) |
| GET | `/api/rides/scheduled/open` | upcoming scheduled rides a driver can claim (driver) |
| GET | `/api/rides` | ride history |
| GET | `/api/rides/:id` | ride detail |
| PATCH | `/api/rides/:id/accept` | claim a ride (atomic) |
| PATCH | `/api/rides/:id/start` | mark in progress |
| PATCH | `/api/rides/:id/complete` | complete |
| PATCH | `/api/rides/:id/cancel` | cancel |
| POST | `/api/rides/:id/rating` | rate a completed ride |
| GET | `/api/rides/:id/payment` | payment summary: amount, driver UPI, QR link, paid state |
| POST | `/api/rides/:id/payment` | mark a completed ride paid (`UPI` / `QR` / `CASH`) |
| GET | `/api/admin/drivers` | list drivers, optional `?status=PENDING\|VERIFIED\|REJECTED` (admin) |
| PATCH | `/api/admin/drivers/:userId/verification` | set `VERIFIED` / `REJECTED` (admin) |
| GET | `/api/admin/analytics` | campus-wide demand analytics over the last 14 days (admin) |

## Socket events

Client → server: `driver:online`, `driver:offline`, `driver:location`, `ride:request`,
`ride:accept`, `ride:reject`, `ride:start`, `ride:complete`, `ride:cancel`, `ride:join`,
`ride:leave`.

Server → client: `ride:new`, `ride:assigned`, `ride:taken`, `ride:status`,
`driver:location`, `driver:availability`, `rating:received`, `payment:received`,
`ride:scheduled-dispatched`, `ride:scheduled-new`.

## Scripts

Backend: `npm run dev`, `npm run build`, `npm start`, `npm run db:seed`, `npm run db:reset`

Frontend: `npm run dev`, `npm run build`, `npm run preview`

## Notes

- SQLite keeps setup to zero config. Switching to PostgreSQL is a change of the `provider`
  and `DATABASE_URL` in `backend/prisma/schema.prisma`.
- A single JWT is used to keep the auth flow simple; a production version would add
  refresh-token rotation.
- Driver location uses the browser geolocation API while the driver is online.
