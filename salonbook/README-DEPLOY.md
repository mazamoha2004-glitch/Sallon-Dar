# Faders Touch — Deployment Guide

This is now a **fully static** app (HTML/CSS/JS, no build step, no backend
server). Auth, database, and permissions are all handled by Supabase; the
frontend talks to Supabase directly from the browser using the publishable
key, which is safe to expose because Row Level Security (RLS) policies
enforce who can read/write what.

Your Supabase project is already live:
- Project: `salonbook` (ref `pmfqmbgodpwzddxofgmm`)
- URL: `https://pmfqmbgodpwzddxofgmm.supabase.co`
- Tables `profiles`, `services`, `bookings`, `booking_services` — all with
  RLS enabled
- 4 default services seeded

## 1. Push this folder to GitHub

```bash
cd salonbook
git init
git add .
git commit -m "Faders Touch — static frontend on Supabase"
git branch -M main
git remote add origin https://github.com/<your-username>/faders-touch.git
git push -u origin main
```

## 2. Deploy — Cloudflare Pages (recommended, as chosen)

1. Go to the [Cloudflare dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**.
2. Pick the `faders-touch` repo.
3. Build settings:
   - **Framework preset:** None
   - **Build command:** *(leave blank)*
   - **Build output directory:** `/` (project root)
4. Click **Save and Deploy**. Cloudflare gives you a `*.pages.dev` URL within
   a minute or two. You can attach a custom domain afterward under the
   project's **Custom domains** tab.

Because there's no server code at all, this same folder will also work
as-is on **GitHub Pages** (repo Settings → Pages → deploy from `main`,
root) if you ever want a second option.

## 3. Make your account an admin

1. Open the deployed site and **Register** a real account with your name,
   phone, and a password.
2. Come back and tell me the phone number you registered with — I'll run:
   ```sql
   update public.profiles set role = 'admin' where phone = '0700000000';
   ```
   against the Supabase project, and that account will see the **Admin**
   tab with every booking across all customers.

## 4. Notes

- **No SMS/OTP**: phone+password login is implemented by mapping each phone
  number to an internal pseudo-email (`phone_<digits>@salonbook.local`) for
  Supabase Auth under the hood — customers never see or type an email.
- **Concurrent time slots**: still not prevented (matches the original
  app's behavior) — worth adding a unique constraint on
  `(booking_date, booking_time, stylist)` later if you want to block
  double-booking.
- **Editing services**: no admin UI for adding/editing services yet; do it
  via the Supabase Table Editor or ask me to add a screen for it.
- **Environment**: nothing to configure — the Supabase URL and publishable
  key are already embedded in `js/supabaseClient.js`.
