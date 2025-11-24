# Trash Tasker

A comprehensive valet trash service management platform for multifamily housing properties.

## Features

- **CRM** - Company, property, and contact management with email/SMS logging
- **Property Management** - 3-step property onboarding with approval workflows
- **Inventory Management** - Track containers, POs, and transactions
- **Billing** - Invoice generation and Stripe payment processing
- **Collector Mobile App** - QR scanning, route management, violation reporting
- **Ticket Desk** - Customer support with SLA tracking
- **Dashboards** - Role-specific dashboards with KPIs and reports
- **Background Jobs** - Automated emails, data cleanup, and notifications

## Tech Stack

- **Framework**: Next.js 16.0.3 with Turbopack
- **Database**: MongoDB Atlas (Mongoose)
- **Storage**: AWS S3
- **Email**: SendGrid
- **SMS**: Twilio
- **Maps**: Google Maps API
- **Payments**: Stripe
- **Background Jobs**: BullMQ + Redis
- **Real-time**: Socket.io

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000)

## User Roles

- Admin
- Vice President of Sales
- Sales Manager
- Sales
- Regional Director of Operations
- District Service Manager
- Client
- Collector

## Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npm run type-check` - Run TypeScript compiler check
- `npm test` - Run Jest tests
- `npm run test:e2e` - Run Playwright E2E tests
