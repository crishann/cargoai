# CargoAI

## Run Client
cd client
npm install
npm run dev

## Run Server
cd server
npm install
npm run dev

## Database setup
- Use your Supabase Postgres connection string.
- Configure `server/.env`:
  - `DATABASE_URL` (Supabase transaction/session pooler URL)
  - `DB_SSL` (`true` for Supabase)
  - `JWT_SECRET`
- The server auto-creates the `public.cargo_users` table on startup.
