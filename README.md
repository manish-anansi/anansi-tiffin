# 🍱 Anansi Tiffin

A simple daily tiffin order form. The admin sets today's menu (sabjis + optional
special item); users place orders that are formatted in Gujarati, e.g.:

```
3 રોટલી, એક મગ, ગુલાબ જામુન, દાળ-ભાત સાથે – 1 ટિફિન (Jaydeepbhai)
```

## Features
- Admin-only menu setup (PIN protected)
- English → Gujarati auto-conversion for sabji names
- Combined tiffins (multiple names)
- Edit an existing order; admin-only delete
- Orders auto-reset each new day
- Copy all orders (Excel-ready)

## Run locally
Requires Node.js 18+.

```bash
node server.js
```

Then open `http://localhost:3000`. To change the admin PIN (default `2580`):

```bash
ADMIN_PIN=1234 node server.js
```

## Notes
- Orders/menu are stored server-side in `data.json` (created automatically).
- This is a Node server — it needs a host that runs Node (Render, Railway, etc.).
  GitHub Pages will **not** work because it only serves static files.

Created by Maniyo Bharwad
