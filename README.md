# FinPlan — Personal Finance Planner

Goal-first personal finance app for planning life milestones in INR. Built with Next.js 16, shadcn/ui, Tailwind CSS, and MongoDB.

## Features

- **Income & expenses** — salary, bonuses, fixed/recurring/optional/variable expenses
- **Investments & insurance** — SIPs, PPF, premiums, renewal tracking
- **Life goals** — marriage, house, baby, retirement with feasibility tracking
- **Calculators** — SIP, EMI, goal planner, retirement & insurance gap
- **Dashboard** — monthly surplus, goal timeline, upcoming obligations
- **Scenario modeling** — what-if surplus changes
- **CSV export** — financial summary download

## Getting started

### Prerequisites

- Node.js 20.9+
- MongoDB (local or Atlas)

### Setup

```bash
cp .env.example .env.local
# Edit MONGODB_URI and JWT_SECRET

npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), register, and complete the onboarding wizard.

### Environment variables

| Variable | Description |
|----------|-------------|
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Secret for session JWT (min 32 chars in production) |
| `NEXT_PUBLIC_APP_URL` | App URL for redirects |

## Stack

- Next.js 16 (Cache Components / PPR)
- React 19
- shadcn/ui + Tailwind CSS v4
- Mongoose + MongoDB
- jose (JWT) + bcryptjs (passwords)

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm run start    # Production server
npm run lint     # ESLint
```
