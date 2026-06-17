# BLANCO — מדריך הקמה (Setup Guide)

This turns your menu into something you can edit yourself — change prices,
descriptions, photos, and add/remove dishes — from a private `/admin` page.
No coding after setup. Do this once.

You have 6 new/changed files:

- `index.html` — your menu (same design, now loads dishes from the database)
- `admin.html` — your private editor
- `menu-config.js` — where you paste your Firebase keys (the only file you edit)
- `firestore.rules` — database security
- `storage.rules` — photo-storage security
- `SETUP.md` — this guide

---

## Step 1 — Create a Firebase project (free)

1. Go to **https://console.firebase.google.com** and sign in with your Google account.
2. Click **Add project** → name it `blanco-menu` → continue (you can skip Google Analytics) → **Create project**.

## Step 2 — Add a Web App and copy the keys

1. On the project home, click the **`</>`** (web) icon.
2. Nickname it `blanco` → **Register app**.
3. Firebase shows a `firebaseConfig = { ... }` block. **Copy those 6 values.**
4. Open **`menu-config.js`** and paste each value over the matching `"PASTE_HERE"`.
   Save the file. (Reminder: these keys are safe to be public — they're not a password.)

## Step 3 — Turn on the database (Firestore)

1. Left menu → **Build → Firestore Database** → **Create database**.
2. Choose a location near you (e.g. `eur3` / Europe) → start in **Production mode** → **Enable**.
3. Open the **Rules** tab. Delete what's there and paste the contents of **`firestore.rules`**.
4. In that pasted text, replace `YOUR_ADMIN_EMAIL@example.com` with the email you'll log in with (Step 5).
5. Click **Publish**.

## Step 4 — Turn on photo storage

1. Left menu → **Build → Storage** → **Get started** → accept the defaults → **Done**.
2. Open the **Rules** tab. Paste the contents of **`storage.rules`**.
3. Replace `YOUR_ADMIN_EMAIL@example.com` with the same email. → **Publish**.

## Step 5 — Create your admin login

1. Left menu → **Build → Authentication** → **Get started**.
2. **Sign-in method** tab → enable **Email/Password** → Save.
3. **Users** tab → **Add user** → enter your email + a strong password → **Add user**.
   (This is exactly the email you put in the two rules files above.)

## Step 6 — Put the files live

1. Copy the 6 files into your project folder (replacing the old `index.html`).
2. In Cursor's terminal:
   - `git add .`
   - `git commit -m "Add editable menu (admin)"`
   - `git push`
3. Vercel redeploys automatically.

## Step 7 — Load your menu and start editing

1. Go to **your-site.vercel.app/admin** → log in.
2. First time only: click **"טען את התפריט הנוכחי"** — this loads all 50 dishes.
3. Edit anything, upload photos, add or delete dishes. Changes appear on the menu instantly.

---

### Everyday use
Just visit `/admin`, log in, make changes, done. No commits, no deploys.

### Notes
- Dishes without a photo show the same elegant placeholder as before.
- To rename a whole **section** heading, edit its `title` in `menu-config.js` (rare).
- Two dishes still carry their old photo and the "ע מזאז׳ק" heading still has the
  stray "ע" — you can now fix both yourself in the admin / config in seconds.
