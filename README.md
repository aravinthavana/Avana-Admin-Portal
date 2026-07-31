# Avana Office Admin & Booking Portal

A full-stack office management system built with **React + Vite** frontend and **Express + Prisma + SQLite** backend.

## Features

### Employee Portal
- 🔐 Employee login with email & password
- 🏢 Conference Room Booking with calendar view and conflict detection
- 🎫 Help Desk Requests — Maintenance, Stationery, Housekeeping, Office Assets, Printing & Scanning, Admin Support
- 📦 Stationery catalog browsing with item requests
- 📊 Personal request tracker (view status of own submitted requests)
- 🔑 Self-service password change

### Admin Panel
- 📋 All Help Desk Requests — view, filter by category/date, mark complete, delete
- 📅 Conference Room Bookings — filter, export CSV, approve/reject
- 📦 Stationery & Housekeeping Stock Management
- 📊 Monthly Stationery & Housekeeping Audit Reports
- 📋 AMC Contract Management with visit logging
- ⚡ Utility Payments tracking
- 🏛️ Tax Payments tracking
- 🔐 Employee Login Audit
- ⚙️ Admin Password Management

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + Vite, React Router, Vanilla CSS |
| Backend | Node.js + Express 5 |
| Database | SQLite via Prisma ORM |
| Auth | Cookie-based sessions (Admin) + JWT (Employee) |
| Email | Nodemailer (Microsoft 365 / Office 365 SMTP) |

## Project Structure

```
booking/
├── frontend/          # React SPA (Vite)
│   ├── src/
│   │   ├── pages/     # Page components
│   │   ├── components/# Shared UI components
│   │   ├── context/   # Auth + Toast context
│   │   └── lib/       # API client
│   └── dist/          # Production build (served by Express)
├── src/               # Express API server
│   ├── controllers/   # Route handlers
│   ├── services/      # Business logic
│   ├── routes/        # API route definitions
│   ├── middlewares/   # Auth, error handlers
│   └── utils/         # Email, notifications
├── prisma/
│   └── schema.prisma  # Database schema
├── database.sqlite    # SQLite database
└── .env               # Environment config
```

## Setup

### Prerequisites
- Node.js 18+

### Install dependencies
```bash
npm install
cd frontend && npm install && cd ..
```

### Configure environment
Copy `.env.example` to `.env` and fill in your values:
```
PORT=3000
ADMIN_EMAIL=your-admin@email.com
ADMIN_PASSWORD_HASH=   # Set via update_password.bat or admin panel
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=your@email.com
SMTP_PASS=yourpassword
BASE_URL=http://your-server-ip:3000
```

### Push database schema
```bash
npx prisma db push
```

### Build frontend
```bash
cd frontend && npm run build && cd ..
```

### Start server
```bash
npm start
```

The app will be available at `http://localhost:3000`

## Development

Run the Vite dev server (proxies API to Express on port 3000):
```bash
cd frontend && npm run dev
```

## Admin Access
Default admin password is set in `.env` as `ADMIN_PASSWORD_HASH`.
Use the `update_password.bat` script or the Admin Settings page to change it.
