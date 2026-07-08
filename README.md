# Avana Office Admin & Booking Portal

A modern, database-agnostic Office Administrative Management system built with Node.js, Express, and Prisma ORM.

## Features
- **Conference Room Booking**: Avoid conflicts, manages catering selections and attendee counts.
- **Help Desk Requests**: Categorized support requests for Stationery, IT, Maintenance, and Housekeeping.
- **Inventory Stock & Audit**: Tracks office inventory usage, purchases, and provides monthly audits with manual override capabilities.
- **Billing & AMC Tracker**: Manage equipment contracts (AMC), maintenance visits, and track utility and tax payments.
- **Email Notifications**: Formatted HTML transaction receipts sent automatically to users and admins.

---

## Technical Stack
- **Backend**: Express.js
- **Database Access**: Prisma ORM
- **Default Database**: SQLite (`database.sqlite`)
- **Frontend**: Static legacy CSS & Vanilla JS (soon to be modern React)

---

## How to Switch to PostgreSQL or MySQL

Prisma is configured to make swapping database backends extremely easy. To switch from SQLite to **PostgreSQL** or **MySQL**, follow these three steps:

### Step 1: Update the datasource provider in `prisma/schema.prisma`
Open `prisma/schema.prisma` and edit the `datasource` block:

```prisma
// For PostgreSQL
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// OR For MySQL
datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}
```

### Step 2: Update the `DATABASE_URL` in `.env`
Open your `.env` file and replace the SQLite configuration with your new connection string:

```env
# Example for PostgreSQL
DATABASE_URL="postgresql://username:password@localhost:5432/avana_admin?schema=public"

# Example for MySQL
DATABASE_URL="mysql://username:password@localhost:3306/avana_admin"
```

### Step 3: Run Database Migrations
Run the following commands in your terminal to apply the schema to your new database and regenerate the client:

```bash
# Push schema structure directly to the new database
npx prisma db push

# Re-generate the Prisma Client to align with the new database driver
npx prisma generate
```

*(Optional)* Run the migration script to copy any existing legacy backup JSON data into your new database:
```bash
node src/utils/migrate_to_prisma.js
```

---

## Local Development Setup

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Run database setup**:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

3. **Start the server**:
   ```bash
   npm start
   ```
   The portal will be live at `http://localhost:3000`.
