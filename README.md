# Milk Farm Tracker

A mobile-first web app for tracking a dairy herd by ear-tag number: milk yield, health checks, medicines (with milk withdrawal dates) and feed.

Built with Next.js (App Router, server actions) and SQLite via libSQL: a local file in development, [Turso](https://turso.tech) when hosted. No separate backend server is needed.

## Run it

Requires Node 22.13 or newer.

```bash
npm install
npm run dev          # http://localhost:3000
npm run seed         # optional: add a demo herd of 8 cows to an empty database
```

Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` (e.g. in `.env.local`). Signing in with them the first time creates the admin account. Add farm workers later in **Settings**.

Open the address on a phone on the same Wi-Fi (use the computer's IP, e.g. `http://192.168.1.20:3000`) and use "Add to Home Screen" to install it like an app.

For daily use, run the production build:

```bash
npm run build
npm start
```

## Data

- Locally everything is stored in `data/farm.db`. Set `FARM_DB_PATH` to keep it elsewhere.
- When `TURSO_DATABASE_URL` (and `TURSO_AUTH_TOKEN`) are set, the app uses that Turso database instead.
- The schema is in `lib/schema.sql` and is applied automatically on start.

## Login

- Email and password. Passwords are hashed with scrypt; sessions are random tokens stored hashed in the database, in an httpOnly cookie for 30 days.
- The first admin comes from `ADMIN_EMAIL` / `ADMIN_PASSWORD`: while there are no accounts, signing in with exactly those creates it. After that the variables are ignored, so change the password in **Settings**.
- **Admin:** everything, plus adding and removing people, resetting their passwords and deleting cows.
- **Worker:** view the herd and add, edit and delete health, medicine and feed records.

## Screens

| Screen | What it does |
| --- | --- |
| Home | Find a cow by tag, herd counts, quick add, today's tasks (doses due, sick cows, feeds not logged) |
| Herd | Search and filter all cows |
| Cow profile | Status, milk-hold warning, health / medicine / feed history |
| Health check | Healthy / Watch / Sick, temperature, symptom chips, note |
| Give medicine | One or many cows, dose, route, schedule, milk withdrawal → "milk safe from" date |
| Log feed | Morning / evening, per group or per cow, prefilled from last time |
| Log milk | One sheet per milking: litres for every milking cow, last yield as a hint, "don't sell" flag for cows on withdrawal |
| Milk | Herd totals per day, sellable vs on hold, 14-day chart; each cow also has a Milk tab |

## Deploy to Vercel (free) for testing

1. **Create a Turso database** (free tier) and get its URL and token. Use either:
   - Vercel dashboard → your project → **Storage** → Turso (Marketplace). It creates the database and adds the env vars for you. Check they're named `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN`.
   - Or [turso.tech](https://turso.tech): create a database, copy its `libsql://…` URL and create a token.
2. **Deploy from this folder:**
   ```bash
   vercel login
   vercel            # first run creates the project and a preview deployment
   ```
3. **Set environment variables** (Vercel → Project → Settings → Environment Variables, or `vercel env add NAME`):
   `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
4. **Deploy to production:** `vercel --prod`
5. Open the production URL and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Optional: load the demo herd into Turso from your computer:

```bash
TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npm run seed
```

## Hosting notes

- On a farm PC, Raspberry Pi or VPS you don't need Turso: `npm run build && npm start` uses the local `data/farm.db`. Back that file up regularly.
- There is no limit on wrong password attempts yet. Use strong passwords.
