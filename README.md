# Nexora Food

Three parts, one database:

| Folder   | What it is                                   | Local address                  |
|----------|----------------------------------------------|--------------------------------|
| `server` | API (Express + MongoDB)                      | http://localhost:5000          |
| `client` | Store for customers (React)                  | http://localhost:5173          |
| `admin`  | Admin panel (React), separate from the store | http://localhost:5174/admin    |

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
npm run build   # builds client/ and admin/, installs server/
npm start       # starts the server
```

The server then shows the store at `/`, the admin panel at `/admin` and the API at `/api`.
Set the variables from `server/.env.example` (with `NODE_ENV=production`).
Uploaded product images are saved in `server/uploads`.
