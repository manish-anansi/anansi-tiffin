# Deploying Anansi Tiffin to GitHub Pages + Google Sheets

This hosts the site for **free** on GitHub Pages, with all orders saved into a
**Google Sheet** you own. No server needed.

The app is dual-mode:
- `API_URL = ''` in `index.html`  → uses the local Node server (`server.js`).
- `API_URL = 'https://...'`       → uses Google Sheets (for GitHub Pages).

---

## Part A — Create the Google Sheets backend

1. Go to https://sheets.new and create a blank Google Sheet. Name it e.g. **Anansi Tiffin**.
2. In the Sheet: **Extensions → Apps Script**.
3. Delete the sample code. Open `google-apps-script.gs` from this repo, copy ALL of it, paste it in.
4. (Optional) Change `const ADMIN_PIN = '2580';` to your own secret PIN.
5. Click **Save** (💾).
6. Click **Deploy → New deployment**.
   - Click the gear ⚙️ next to "Select type" → choose **Web app**.
   - **Description:** anything (e.g. "tiffin api")
   - **Execute as:** **Me**
   - **Who has access:** **Anyone**
   - Click **Deploy**.
7. Authorize when prompted (choose your Google account → Advanced → Go to project → Allow).
8. Copy the **Web app URL**. It looks like:
   `https://script.google.com/macros/s/AKfy....../exec`

> If you ever edit the script, do **Deploy → Manage deployments → Edit → Version: New version → Deploy**
> to publish the change (the URL stays the same).

---

## Part B — Point the site at your Google backend

1. Open `index.html`, find this line near the top of the `<script>`:
   ```js
   const API_URL = '';
   ```
2. Paste your Web app URL inside the quotes:
   ```js
   const API_URL = 'https://script.google.com/macros/s/AKfy....../exec';
   ```
3. Save.

---

## Part C — Publish on GitHub Pages

> **Important:** Free GitHub Pages only works on a **public** repo. Your repo is
> currently Private. Either make it public (Settings → General → Danger Zone →
> Change visibility → Public), or use a paid plan.
> The admin PIN lives in Google (not in this code), so it stays secret either way.

1. Commit and push your `API_URL` change:
   ```bash
   git add index.html
   git commit -m "Use Google Sheets backend"
   git push
   ```
2. On GitHub: **Settings → Pages**.
3. Under **Build and deployment → Source**, choose **Deploy from a branch**.
4. **Branch:** `main`, **Folder:** `/ (root)` → **Save**.
5. Wait ~1 minute. Your live link appears at the top:
   `https://manish-anansi.github.io/anansi-tiffin/`

Share that link with the office. It works on any WiFi or phone. 🎉

---

## How it behaves
- Admin sets the menu (PIN protected) → saved in the script's storage.
- Orders are added to the **Orders** tab (column `tiffin` = the Gujarati line, Excel-ready).
- Edit updates the same row; delete is admin-only (PIN checked in the script).
- A new day auto-clears the previous menu + orders (based on the script's timezone:
  set it in Apps Script via **Project Settings → Time zone**, or the Sheet's
  **File → Settings → Time zone**).
