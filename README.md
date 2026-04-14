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
- Use XAMPP MySQL.
- Configure `server/.env`:
  - `DB_HOST` (`127.0.0.1` for XAMPP)
  - `DB_PORT` (`3306` by default)
  - `DB_USER` (`root` by default in XAMPP)
  - `DB_PASSWORD` (blank by default in XAMPP unless you changed it)
  - `DB_NAME` (`cargoai`)
  - `JWT_SECRET`
- Run the SQL in `server/sql/xampp_cargoai.sql` in phpMyAdmin, or let the server auto-create the `cargo_users` table after the database exists.
