# Store (Next.js)

The customer website. Pages like Home, Shop and Product are built on the
server first, so search engines can read product names and prices.

```powershell
npm.cmd install      # first time only
npm.cmd run dev      # http://localhost:5173  (start the server in ../server first)
```

- `src/app/` — pages (one folder per address, e.g. `shop/`, `product/[slug]/`)
- `src/views/` — the page designs used by those pages
- `src/components/`, `src/context/`, `src/hooks/`, `src/lib/` — shared parts

Settings (optional, in `.env.local`):
- `API_URL` — address of the Express API (default `http://localhost:5000`)
- `SITE_URL` — public address for the sitemap, e.g. `https://www.yourshop.com`
