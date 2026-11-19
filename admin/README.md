# Admin panel

The store's admin panel (dashboard, orders, products, categories, messages,
settings). A separate React app from the store (`../client`), using the
same API (`../server`).

## Run on your PC

Start the server and the store first, then:

```powershell
cd admin
npm.cmd install      # first time only
npm.cmd run dev
```

Open http://localhost:5174/admin

## Online

`npm run build` (in the main folder) builds this app into `admin/dist`,
and the server shows it at `https://<your-site>/admin`.

Admin rights are given only with `npm run make-admin` in `server/`.
