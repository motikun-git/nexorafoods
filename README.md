# Nexora Food

Three parts, one database:

| Folder   | What it is                                      | Local address                  |
|----------|-------------------------------------------------|--------------------------------|
| `server` | API (Express + MongoDB)                         | http://localhost:5000          |
| `client` | Store for customers (**Next.js**, SEO-friendly) | http://localhost:5173          |
| `admin`  | Admin panel (React + Vite)                      | http://localhost:5174/admin    |

## Run on your PC (3 terminals)

```powershell
cd server; npm.cmd run dev
cd client; npm.cmd run dev
cd admin;  npm.cmd run dev
```

First time: run `npm.cmd install` in each folder, and put `server/.env` in place
(copy `server/.env.example` and fill it in). Never commit `.env`.

Admin rights: `cd server; npm.cmd run make-admin -- you@example.com`

## On a live server

```bash
npm run build   # builds admin/ and client/, installs server/
npm start       # starts the API (public, PORT) and the store (private)
```

Visitors only talk to the Express server on `PORT`: it answers `/api` and
`/admin` itself and passes every store page to Next.js (see `start.js`).
Set the variables from `server/.env.example` (with `NODE_ENV=production`),
and `SITE_URL` (e.g. `https://www.yourshop.com`) for the sitemap.
Uploaded product images are saved in `server/uploads`.
