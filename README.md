# LifeSwap

A production-quality marketplace for knowledge-based services — mentoring, coaching, and teaching. Built with Next.js 16, TypeScript, Prisma, and Stripe.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16.2.9 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS v4 |
| Components | Radix UI + CVA (shadcn/ui pattern) |
| Database | PostgreSQL + Prisma ORM 7 |
| Auth | Clerk |
| Payments | Stripe |
| State | Zustand + TanStack Query v5 |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Icons | Lucide React |

## Project Structure

```
lifeswap/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Seed data
├── src/
│   ├── app/
│   │   ├── (public)/        # Marketplace routes (Navbar + Footer layout)
│   │   │   ├── marketplace/ # Browse services
│   │   │   ├── service/[id] # Service detail
│   │   │   └── host/[id]    # Host public profile
│   │   ├── (auth)/          # Login, register, forgot-password
│   │   ├── (dashboard)/     # User dashboard (bookings, favorites, messages...)
│   │   ├── (host)/          # Host dashboard (services, earnings, availability...)
│   │   ├── (admin)/         # Admin dashboard (users, reports, analytics...)
│   │   ├── api/             # API routes
│   │   └── page.tsx         # Landing page (home)
│   ├── components/
│   │   ├── ui/              # Button, Input, Card, Badge, etc.
│   │   └── layout/          # Navbar, Footer, Sidebars
│   ├── lib/
│   │   ├── prisma.ts        # Prisma client singleton
│   │   ├── utils.ts         # Utility functions
│   │   └── validations.ts   # Zod schemas
│   ├── providers/           # React Query + Theme providers
│   ├── store/               # Zustand global store
│   ├── types/               # TypeScript types
│   └── proxy.ts             # Route protection (Next.js 16 middleware)
└── .env.example             # Required environment variables
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required variables:
- `DATABASE_URL` — PostgreSQL connection string
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` — from clerk.com
- `STRIPE_SECRET_KEY` + `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — from stripe.com
- `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard > Webhooks

### 3. Database setup

```bash
npm run db:push       # Push schema to database
npm run db:seed       # Seed with sample data
```

Or for production with migrations:

```bash
npm run db:migrate    # Create and apply migration
```

### 4. Run development server

```bash
npm run dev
```

Open http://localhost:3000.

## User Roles

| Role | Description |
|------|-------------|
| USER | Default role. Can browse, book, message, review, and save favorites. |
| HOST | Approved user who can create services and earn money. Apply via /host/apply. |
| ADMIN | Full platform control. Approve/reject applications, manage users, resolve reports. |

## Pages

### Public (no auth required)
- `/` — Landing page
- `/marketplace` — Browse and search all services
- `/service/[id]` — Service detail with booking sidebar
- `/host/[id]` — Host public profile

### Auth
- `/login`, `/register`, `/forgot-password`

### User Dashboard
- `/dashboard` — Overview with upcoming bookings
- `/bookings` — All bookings (upcoming/past/cancelled)
- `/favorites` — Saved services
- `/messages` — Real-time chat
- `/notifications` — Activity feed
- `/profile` — Account settings and host application

### Host Dashboard
- `/host/dashboard` — Revenue chart and upcoming sessions
- `/host/services` — Manage service listings
- `/host/services/new` — Create a new service
- `/host/services/[id]/edit` — Edit existing service
- `/host/earnings` — Earnings history and payouts
- `/host/availability` — Set weekly schedule
- `/host/settings` — Notifications, payout, and booking preferences
- `/host/apply` — 4-step host application wizard

### Admin
- `/admin` — Platform overview with live stats
- `/admin/applications` — Review host applications
- `/admin/users` — User management (block/unblock)
- `/admin/hosts` — Host management (verify/remove)
- `/admin/services` — Service moderation
- `/admin/reports` — Review and resolve reports
- `/admin/analytics` — Revenue, growth, and category charts

## API Routes

| Method | Path | Description |
|--------|------|-------------|
| POST | /api/auth/sync | Sync Clerk user to database |
| GET/POST | /api/services | List/create services |
| GET/PATCH/DELETE | /api/services/[id] | Service CRUD |
| GET/POST | /api/bookings | List/create bookings |
| GET/PATCH | /api/bookings/[id] | Booking detail/status |
| GET/POST | /api/applications | Host applications |
| PATCH | /api/admin/applications/[id] | Approve/reject application |
| GET/PATCH | /api/admin/users/[id] | Admin user management |
| GET/POST | /api/messages | Conversations and messages |
| GET/POST | /api/reviews | Service reviews |
| GET/POST | /api/favorites | Toggle favorites |
| GET/PATCH | /api/notifications | Notifications |
| POST | /api/reports | Submit a report |
| GET/PUT | /api/host/availability | Availability slots |
| PATCH | /api/host/services/[id] | Host service management |
| POST | /api/stripe/webhook | Stripe payment events |

## Platform Fee

The platform takes **15%** of each transaction (configurable via `STRIPE_PLATFORM_FEE_PERCENT`).

Example: a $120 session → host receives $102, platform keeps $18.

## Seed Data

After running `npm run db:seed`:

| Role | Email |
|------|-------|
| Admin | admin@lifeswap.com |
| Host | alex.chen@example.com |
| Host | priya.patel@example.com |
| Host | marcus.johnson@example.com |
| Host | aisha.hassan@example.com |
| User | jordan.martinez@example.com |
| User | luna.t@example.com |

## Notes on Next.js 16

This project uses **Next.js 16.2.9** with these breaking changes from v15:

- `params` and `searchParams` in pages are now **async Promises** — always `await` them
- Middleware file is now `src/proxy.ts` (was `middleware.ts`)
- Turbopack enabled by default

## Authentication Note

`src/proxy.ts` middleware includes a placeholder session check. In production, replace it with Clerk's `auth()` helper from `@clerk/nextjs/server` to validate JWT tokens properly.
