# Tempo (with Supabase sync)

Everything you add on one device shows up on all your other devices, live.

## 1. Set up Supabase (once)
1. Create a project at supabase.com.
2. SQL Editor > New query > paste `supabase/schema.sql` > Run.
   (Already ran the first version? Run `supabase/add-products.sql` instead. It only adds the products column.)
3. Project Settings > API: copy the Project URL and the `anon` public key.
4. Open `.env` and replace the two placeholder values.
5. Optional: Authentication > Providers > Email > turn off "Confirm email" so new accounts can sign in straight away.

## 2. Run it on your computer
    npm install
    npm run dev

## 3. Put it online (Netlify)
1. Push this folder to GitHub (`.env` is git-ignored, so your keys stay private).
2. On Netlify: Add new project > import the repo. Build settings are read from `netlify.toml`.
3. Site configuration > Environment variables: add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the same values as `.env`, then redeploy.
4. In Supabase: Authentication > URL Configuration, set Site URL to your Netlify link.

The anon key is safe to ship in the browser. Row Level Security in `schema.sql` is what keeps your data private to your account.

## Moving your old data
Tasks and projects saved in the old version are uploaded automatically the first time you sign in on the same browser.
