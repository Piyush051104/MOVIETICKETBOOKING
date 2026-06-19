# 🎬 QuickShow — Movie Ticket Booking Platform

A full-stack movie ticket booking application with **real-time collaborative seat selection**, secure **Stripe payments**, and **durable background jobs** for emails and booking lifecycle management. Users browse now-playing movies (sourced from TMDB), pick seats live alongside other users, pay via Stripe Checkout, and receive email confirmations and reminders.

<p align="left">
  <img alt="React" src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" />
  <img alt="Express" src="https://img.shields.io/badge/Express-5-000000?logo=express" />
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb&logoColor=white" />
  <img alt="Socket.io" src="https://img.shields.io/badge/Socket.io-Realtime-010101?logo=socketdotio" />
  <img alt="Stripe" src="https://img.shields.io/badge/Stripe-Payments-635BFF?logo=stripe&logoColor=white" />
</p>

---

## 📌 Summary

QuickShow is a MERN-style monorepo split into a **React + Vite client** and an **Express 5 + MongoDB server**. Its standout feature is a two-layer seat-booking system: **Socket.io + Upstash Redis** provide live "someone is selecting this seat" feedback, while an **atomic MongoDB update** acts as the authoritative guard that prevents double-booking. Authentication is handled by **Clerk**, asynchronous and scheduled work (confirmation emails, reminders, auto-cancellation of unpaid bookings, user sync) runs on **Inngest**, and movie data is pulled from the **TMDB API**.

---

## ✨ Features

- **Movie browsing** — now-playing movies and details sourced from the TMDB API.
- **Real-time seat selection** — seats other users are choosing light up live via Socket.io, backed by Redis locks with a 120-second TTL.
- **Concurrency-safe booking** — an atomic `findOneAndUpdate` ensures two users can never book the same seat (the loser gets a clean 409).
- **Stripe Checkout payments** — hosted checkout with a signed webhook that confirms payment server-side.
- **Auto-cancellation** — unpaid bookings are released and deleted automatically after the payment window via an Inngest delayed job.
- **Email notifications** — booking confirmations, new-show announcements, and scheduled show reminders (Brevo SMTP via Nodemailer).
- **Favorites** — users can favorite movies (stored in Clerk user metadata).
- **Admin dashboard** — add shows, list shows, view all bookings, and see revenue/booking/user metrics, protected by a role check.
- **Custom admin auth flow** — password login, email-OTP two-factor, and password reset built on Clerk primitives.

---

## 🛠 Tech Stack

| Layer | Technologies |
|-------|--------------|
| **Frontend** | React 19, Vite, React Router v7, Tailwind CSS v4, Axios, Socket.io-client, React Hot Toast, Lucide React, React Player |
| **Backend** | Node.js, Express 5, Mongoose 9, Socket.io |
| **Database** | MongoDB |
| **Auth** | Clerk (`@clerk/clerk-react`, `@clerk/express`) |
| **Payments** | Stripe (Checkout + Webhooks) |
| **Real-time state** | Upstash Redis (`@upstash/redis`) |
| **Background jobs** | Inngest (events + cron) |
| **Email** | Nodemailer over Brevo SMTP |
| **External data** | TMDB API |
| **Deployment** | Vercel (client and server) |

---

## 🏗 Architecture Overview

```
                 ┌─────────────────────────────────────────┐
                 │  React Client (Vite, Vercel)             │
                 │  ClerkProvider → BrowserRouter →         │
                 │  AppProvider (global context + socket)   │
                 └───────────┬───────────────┬─────────────┘
                   REST/axios │               │ websocket
                              ▼               ▼
   ┌──────────────────────────────────────────────────────────────┐
   │  Express 5 API (Vercel @vercel/node)                          │
   │  Middleware: express.raw (stripe) → express.json → cors →     │
   │              clerkMiddleware                                  │
   │  Routes: /api/show /api/booking /api/admin /api/user          │
   │          /api/stripe (webhook)  /api/inngest (jobs)           │
   │  Socket server: initSocket(io)                                │
   └───┬─────────┬───────────┬────────────┬───────────┬───────────┘
       ▼         ▼           ▼            ▼           ▼
   ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐
   │MongoDB │ │Upstash │ │ Clerk  │ │ Stripe  │ │ TMDB API │
   │        │ │ Redis  │ │(auth + │ │(payments│ │ (movies) │
   │        │ │(seat   │ │ roles) │ │+webhook)│ └──────────┘
   │        │ │ locks) │ └────────┘ └─────────┘
   └────────┘ └────────┘
                          ┌────────────────────────────┐
                          │ Inngest (background jobs)  │
                          │ user sync · confirmations  │
                          │ reminders cron · auto-cancel│──► Brevo SMTP
                          └────────────────────────────┘
```

**Key design decisions:**
- **Two-layer concurrency control** — Redis locks drive live UX; a single atomic MongoDB update is the source of truth that prevents double-booking.
- **Raw-body Stripe webhook mounted before `express.json()`** so signature verification gets the exact bytes.
- **External IDs as primary keys** — `User._id` is the Clerk id; `Movie._id` is the TMDB id.
- **Durable async via Inngest** — slow/delayed work (emails, cancellation, reminders) is offloaded with retries instead of blocking requests.

---

## 📁 Folder Structure

```
MOVIETICKETBOOKING/
├── client/                     # React + Vite frontend
│   └── src/
│       ├── components/         # Navbar, Footer, MovieCard, admin UI, etc.
│       ├── context/            # AppContext.jsx (global state + socket)
│       ├── pages/              # Home, Movies, MovieDetails, SeatLayout, MyBookings…
│       │   └── admin/          # Dashboard, AddShows, ListShows, ListBookings, Layout
│       ├── lib/                # date/time/number formatting helpers
│       ├── App.jsx             # Routes
│       └── main.jsx            # Providers (Clerk, Router, AppProvider)
│
└── server/                     # Express backend
    ├── config/                 # db.js, redis.js, nodeMailer.js
    ├── controllers/            # show, booking, admin, user, stripeWebhooks
    ├── inngest/                # background job definitions
    ├── middleware/             # auth.js (protectAdmin)
    ├── model/                  # User, Movie, Show, Booking (Mongoose schemas)
    ├── routes/                 # show, booking, admin, user routers
    ├── socket.js               # Socket.io seat-lock handlers
    └── server.js               # App entry point
```

---

## 🗄 Database Design

Four Mongoose models:

| Model | Key fields | Notes |
|-------|-----------|-------|
| **User** | `_id` (Clerk id), `name`, `email`, `image` | Synced from Clerk via Inngest webhooks |
| **Movie** | `_id` (TMDB id), `title`, `overview`, `poster_path`, `backdrop_path`, `genres`, `casts`, `vote_average`, `runtime` | Cached from TMDB on first use; `timestamps` |
| **Show** | `movie` (ref Movie), `showDateTime`, `showPrice`, `occupiedSeats` (`{ seatId: userId }`) | `{ minimize: false }` so the empty seat map persists |
| **Booking** | `user` (ref User), `show` (ref Show), `amount`, `bookedSeats`, `isPaid`, `paymentLink` | `timestamps` |

**Relationships:** Booking → User, Booking → Show, Show → Movie (string refs, joined with `populate`). Seat occupancy is an embedded map on the Show document, which enables the single-document atomic reservation.

---

## 🔌 API Overview

Base path: `/api`

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/show/all` | Public | List upcoming shows (unique movies) |
| `GET` | `/show/:movieId` | Public | Single movie with grouped show times |
| `GET` | `/show/now-playing` | Admin | TMDB now-playing list |
| `POST` | `/show/add` | Admin | Add a movie's shows |
| `POST` | `/booking/create` | User | Reserve seats + create Stripe Checkout session |
| `GET` | `/booking/seats/:showId` | User | Occupied seats for a show |
| `GET` | `/user/bookings` | User | Current user's bookings |
| `POST` | `/user/update-favorite` | User | Toggle a favorite movie |
| `GET` | `/user/favorites` | User | List favorite movies |
| `POST` | `/user/is-admin-email` | Public | Check if an email is an admin |
| `GET` | `/admin/dashboard` | Admin | Revenue / bookings / shows / users metrics |
| `GET` | `/admin/all-shows` | Admin | All upcoming shows |
| `GET` | `/admin/all-bookings` | Admin | All bookings |
| `POST` | `/stripe` | Stripe | Payment webhook (raw body) |
| `ANY` | `/inngest` | Inngest | Background-job handler |

Authentication uses Clerk: `requireAuth()` for user routes and a custom `protectAdmin` middleware (checks `privateMetadata.role === 'admin'`) for admin routes.

---

## ⚡ Real-Time Features

Live seat selection is powered by **Socket.io** with **Upstash Redis** holding short-lived advisory locks (`lock:<showId>:<seatId>`, TTL 120s).

| Event | Direction | Effect |
|-------|-----------|--------|
| `join-show` | client → server | Join a show room; receive current in-progress selections |
| `select-seat` | client → server | Set a Redis lock; broadcast `seat-selected` to the room |
| `deselect-seat` | client → server | Release the lock; broadcast `seat-deselected` |
| `leave-show` | client → server | Release all of the user's locks and leave |
| `current-selecting` / `seat-selected` / `seat-deselected` | server → client | Drive the live seat UI |

> **Important:** Redis locks are **advisory (UX only)**. The authoritative double-booking prevention is the atomic `Show.findOneAndUpdate` in the booking controller — even if two users race past the live layer, exactly one booking succeeds and the other receives a 409.

---

## 🚀 Installation

**Prerequisites:** Node.js 18+, a MongoDB database, and accounts for Clerk, Stripe, Upstash Redis, TMDB, and an SMTP provider (Brevo).

```bash
# Clone
git clone https://github.com/Piyush051104/MOVIETICKETBOOKING.git
cd MOVIETICKETBOOKING

# Install server deps
cd server
npm install

# Install client deps
cd ../client
npm install
```

---

## 🔐 Environment Variables

**`server/.env`**

```env
MONGODB_URI=your_mongodb_connection_string         # the database name "quickshow" is appended automatically
CLIENT_URL=http://localhost:5173

# Clerk
CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Stripe
STRIPE_SECRET_KEY=sk_...
STRIPE_WEBHOOK_SECRET=whsec_...

# TMDB
TMDB_API_KEY=your_tmdb_v4_read_access_token

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://...
UPSTASH_REDIS_REST_TOKEN=...

# Email (Brevo SMTP)
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_pass
SENDER_EMAIL=you@example.com

# Inngest (required in production)
INNGEST_EVENT_KEY=...
INNGEST_SIGNING_KEY=...
```

**`client/.env`**

```env
VITE_BASE_URL=http://localhost:3000
VITE_CLERK_PUBLISHABLE_KEY=pk_...
VITE_TMDB_IMAGE_BASE_URL=https://image.tmdb.org/t/p/original
```

---

## ▶️ Running Locally

```bash
# Terminal 1 — backend (http://localhost:3000)
cd server
npm run server        # nodemon; or `npm start` for plain node

# Terminal 2 — frontend (http://localhost:5173)
cd client
npm run dev
```

**Webhooks during local dev:** forward Stripe events to your local server, e.g.

```bash
stripe listen --forward-to localhost:3000/api/stripe
```

and run the Inngest dev server to exercise background jobs locally.

---

## ☁️ Deployment

Both apps are configured for **Vercel**:
- **Client** — `client/vercel.json` rewrites all routes to `/` for SPA routing.
- **Server** — `server/vercel.json` builds `server.js` with `@vercel/node`.

Set all environment variables in the respective Vercel project settings, configure the Stripe webhook endpoint to point at `/api/stripe`, and register the Inngest app against `/api/inngest`.

---

## 🧩 Challenges Faced

- **Preventing double-booking under concurrency** — the core challenge. Solved by making the MongoDB seat write atomic (`$exists:false` conditions on a single document) rather than relying on the real-time layer.
- **Keeping live seat state consistent** — coordinating Socket.io broadcasts with Redis TTLs and cleaning up locks on disconnect, tab close, and selection timeout.
- **Verifying payments securely** — wiring the Stripe webhook with raw-body parsing (ahead of `express.json()`) so signatures validate, and confirming payment server-side instead of trusting the client redirect.
- **Decoupling slow work** — moving emails, reminders, user sync, and unpaid-booking cleanup into Inngest so requests stay fast and the work is retryable.
- **Networking quirks** — forcing IPv4 (`family: 4`) on the Mongo connection to work around hotspot/IPv6 resolution issues.

---

## 🎓 Key Learnings

- The difference between **advisory state (UX)** and an **authoritative source of truth (correctness)** in a concurrent system.
- How **atomic single-document operations** in MongoDB can replace heavier locking for a well-modeled problem.
- Designing a **secure payment flow** around webhooks and signature verification.
- Building a **durable, event-driven background-job layer** with delayed steps and cron schedules.
- Integrating multiple third-party services (Clerk, Stripe, TMDB, Upstash, Brevo) behind a clean API.

---

## 👤 Author

**Piyush**
- GitHub: [@Piyush051104](https://github.com/Piyush051104)
- Project: [MOVIETICKETBOOKING](https://quickshow-s.vercel.app/)



---

<sub>Built as a full-stack portfolio project demonstrating real-time systems, payment integration, and event-driven background processing.</sub>
