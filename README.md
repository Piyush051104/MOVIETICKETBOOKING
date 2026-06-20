🎬 Quickshow — Real-Time Movie Ticket Booking Platform
A full-stack movie ticket booking application with live, multi-user seat selection, atomic booking to prevent double-booking, Stripe payments, and event-driven background jobs — built on the MERN stack.
Live demo: quickshow-s.vercel.app
---
✨ Features
🎟️ Browse now-showing movies (synced from TMDB) and view showtimes
🔴🟡🔵 Real-time seat map — see seats booked (red), being selected by others live (yellow), and your own picks (blue) update instantly via Socket.io
🔒 Redis-backed seat locking with TTL-based auto-expiry — locks survive server restarts and stay consistent across multiple serverless instances
🧮 Atomic, race-condition-free booking using MongoDB conditional writes — no two users can ever book the same seat
💳 Stripe Checkout integration with signature-verified webhooks
⏱️ Automatic release of unpaid/abandoned bookings after a timeout (Inngest)
📧 Automated emails — booking confirmation, new-show announcements, and showtime reminders (Nodemailer + Inngest)
🔐 Authentication via Clerk, with a custom-built admin login flow (email/password + OTP 2FA) and role-based access control
🛠️ Admin dashboard — add shows, manage listings, view bookings and revenue
---
🧱 Tech Stack
Frontend: React 19, React Router, Tailwind CSS, Socket.io-client, Axios, Clerk React
Backend: Node.js, Express 5, MongoDB + Mongoose, Socket.io, Redis (Upstash), Clerk Express, Stripe, Inngest, Nodemailer
Third-party services: Clerk (auth), Stripe (payments), TMDB (movie data), Upstash (Redis), Brevo (SMTP), Inngest Cloud, Vercel (hosting)
---
🏗️ Architecture
```
client/   → React SPA (Vite), deployed independently on Vercel
server/   → Express API + Socket.io server, deployed independently on Vercel
```
REST API under `/api/show`, `/api/booking`, `/api/admin`, `/api/user`, `/api/stripe`, `/api/inngest`
Socket.io runs on the same HTTP server as Express, backed by Redis for shared, TTL-expiring seat locks — so live seat selection stays correct even when multiple server instances are running
MongoDB persists Users, Movies, Shows, and Bookings
Stripe webhook confirms payment asynchronously; Inngest then sends the confirmation email and keeps Clerk ↔ MongoDB user data in sync
---
📂 Project Structure
```
server/
├── config/         # DB, Redis, Cloudinary, Nodemailer setup
├── controllers/     # Business logic (booking, show, admin, user)
├── inngest/          # Background/event-driven functions
├── middleware/        # Auth middleware (admin protection)
├── model/              # Mongoose schemas
├── routes/              # Express route definitions
├── socket.js              # Real-time seat-selection logic (Socket.io + Redis)
└── server.js                # App entry point

client/
└── src/
    ├── components/   # Reusable UI components (incl. admin/)
    ├── context/        # Global app state (AppContext)
    ├── pages/            # Route-level pages (incl. admin/)
    └── lib/                # Helper utilities
```
---
⚙️ Getting Started Locally
Prerequisites
Node.js (v18+)
MongoDB instance (local or Atlas)
Accounts/API keys for: Clerk, Stripe, TMDB, Upstash Redis, an SMTP provider (e.g. Brevo)
1. Clone the repo
```bash
git clone https://github.com/Piyush051104/MOVIETICKETBOOKING.git
cd MOVIETICKETBOOKING
```
2. Backend setup
```bash
cd server
npm install
```
Create a `.env` file inside `server/` with:
```env
MONGODB_URI=
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
TMDB_API_KEY=
SMTP_USER=
SMTP_PASS=
SENDER_EMAIL=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
CLIENT_URL=
```
Run the server:
```bash
npm run server
```
3. Frontend setup
```bash
cd ../client
npm install
```
Create a `.env` file inside `client/` with:
```env
VITE_BASE_URL=
VITE_CLERK_PUBLISHABLE_KEY=
VITE_CURRENCY=
VITE_TMDB_IMAGE_BASE_URL=
```
Run the client:
```bash
npm run dev
```
The app should now be running at `http://localhost:5173`, talking to the API at `http://localhost:3000`.
---
🔑 Key Engineering Decisions
Why Redis for seat locks instead of an in-memory object: the original implementation stored live seat-selection state in a plain in-memory object on the server. This breaks down on serverless platforms like Vercel — each request can be handled by a different, short-lived instance, so state wasn't shared across them and didn't survive restarts. Moving this to Redis, with a TTL on every lock, fixed all three issues: instances now share one source of truth, restarts don't wipe state, and abandoned locks self-expire even if a client disconnects ungracefully — no reliance on the `disconnect` event firing.
Why booking is atomic: seat reservation uses a single conditional `findOneAndUpdate` (only updates if the seat isn't already taken), making the read-and-write one indivisible operation — eliminating the race condition where two users could both "see" a seat as free and both book it.
Why background jobs use Inngest, not `setTimeout`/cron: Inngest's durable step functions (e.g. `step.sleepUntil`) survive server restarts, unlike in-process timers — critical for reliably releasing unpaid bookings after a timeout.
---
📄 License
This project is for educational/portfolio purposes.
