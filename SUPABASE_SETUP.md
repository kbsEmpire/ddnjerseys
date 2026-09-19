# DDN JERSEYS — Supabase Setup Guide

This guide walks you through configuring Supabase for the DDN JERSEYS storefront and admin dashboard.

**Never expose your service-role key in frontend code, GitHub, or public repositories.**

---

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in.
2. Click **New Project**.
3. Choose an organization, name (e.g. `ddn-jerseys`), database password, and region closest to Ghana.
4. Wait for the project to finish provisioning.

---

## 2. Get Your API Credentials

1. In the Supabase dashboard, go to **Project Settings → API**.
2. Copy:
   - **Project URL** → use as `YOUR_SUPABASE_URL`
   - **anon public** key → use as `YOUR_SUPABASE_ANON_KEY`

3. Paste these values into:
   - `/app.js` (public storefront)
   - `/admin/admin.js` (admin dashboard)

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY";
```

Replace the placeholder strings with your actual values.

---

## 3. Create the Products Table

Open **SQL Editor** in Supabase and run:

```sql
-- ─── Products table ───────────────────────────────────────────────
CREATE TABLE public.products (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  team_name     TEXT NOT NULL,
  category      TEXT NOT NULL,
  kit_type      TEXT NOT NULL,
  price         NUMERIC(10, 2) NOT NULL,
  image_url     TEXT,
  storage_path  TEXT,
  description   TEXT,
  is_available  BOOLEAN NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT products_category_check
    CHECK (category IN ('club', 'national', 'retro', 'basketball')),

  CONSTRAINT products_kit_type_check
    CHECK (kit_type IN ('home', 'away', 'third', 'retro')),

  CONSTRAINT products_price_non_negative
    CHECK (price >= 0),

  CONSTRAINT products_name_not_empty
    CHECK (char_length(trim(name)) > 0),

  CONSTRAINT products_team_name_not_empty
    CHECK (char_length(trim(team_name)) > 0)
);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- Index for common queries
CREATE INDEX products_category_idx ON public.products (category);
CREATE INDEX products_is_available_idx ON public.products (is_available);
CREATE INDEX products_created_at_idx ON public.products (created_at DESC);
```

---

## 4. Create Admin Profiles Table

This table controls who can manage products. Only users listed here are treated as admins.

```sql
-- ─── Admin authorization ──────────────────────────────────────────
CREATE TABLE public.admin_profiles (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
```

---

## 5. Row Level Security (RLS)

### Products RLS

```sql
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Public: read available products only
CREATE POLICY "Public can read available products"
  ON public.products
  FOR SELECT
  TO anon, authenticated
  USING (is_available = true);

-- Admins: read all products (including unavailable)
CREATE POLICY "Admins can read all products"
  ON public.products
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Admins: insert products
CREATE POLICY "Admins can insert products"
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Admins: update products
CREATE POLICY "Admins can update products"
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Admins: delete products
CREATE POLICY "Admins can delete products"
  ON public.products
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );
```

### Admin Profiles RLS

```sql
-- Admins can read their own profile (for session verification)
CREATE POLICY "Users can read own admin profile"
  ON public.admin_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());
```

> **Note:** Adding new admins requires using the Supabase dashboard SQL editor with the service-role context, or a secure server-side process. Do not allow open self-registration as admin.

---

## 6. Create Storage Bucket

1. Go to **Storage** in the Supabase dashboard.
2. Click **New bucket**.
3. Name: `jersey-images`
4. Enable **Public bucket** (product images must be publicly readable on the storefront).
5. Click **Create bucket**.

### Storage Policies

Run in SQL Editor:

```sql
-- Public read access for jersey images
CREATE POLICY "Public can view jersey images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'jersey-images');

-- Admins can upload jersey images
CREATE POLICY "Admins can upload jersey images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'jersey-images'
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Admins can update jersey images
CREATE POLICY "Admins can update jersey images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'jersey-images'
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );

-- Admins can delete jersey images
CREATE POLICY "Admins can delete jersey images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'jersey-images'
    AND EXISTS (
      SELECT 1 FROM public.admin_profiles
      WHERE admin_profiles.user_id = auth.uid()
    )
  );
```

---

## 7. Enable Realtime

1. Go to **Database → Replication** in Supabase.
2. Under **supabase_realtime**, enable replication for the `products` table.
3. Alternatively, run:

```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
```

The public storefront subscribes to `INSERT`, `UPDATE`, and `DELETE` events on this table for live product updates.

---

## 8. Create an Admin Account

### Step A — Create the auth user

1. Go to **Authentication → Users** in Supabase.
2. Click **Add user → Create new user**.
3. Enter the admin email and a strong password.
4. Copy the user's **UUID** from the users list.

### Step B — Grant admin access

Run in SQL Editor (replace `ADMIN_USER_UUID` with the actual UUID):

```sql
INSERT INTO public.admin_profiles (user_id)
VALUES ('ADMIN_USER_UUID');
```

The admin can now sign in at `/admin/index.html`.

---

## 9. Optional — Seed Sample Products

Run this only for testing. Replace image URLs with your own Supabase Storage URLs after uploading images.

```sql
INSERT INTO public.products (name, team_name, category, kit_type, price, image_url, is_available)
VALUES
  ('Real Madrid Home Jersey', 'Real Madrid', 'club', 'home', 250, 'https://YOUR_SUPABASE_URL/storage/v1/object/public/jersey-images/sample.jpg', true),
  ('Ghana Black Stars Home', 'Ghana', 'national', 'home', 280, 'https://YOUR_SUPABASE_URL/storage/v1/object/public/jersey-images/sample2.jpg', true),
  ('Arsenal Retro 2004', 'Arsenal', 'retro', 'retro', 300, 'https://YOUR_SUPABASE_URL/storage/v1/object/public/jersey-images/sample3.jpg', true),
  ('Lakers City Edition', 'Los Angeles Lakers', 'basketball', 'away', 350, 'https://YOUR_SUPABASE_URL/storage/v1/object/public/jersey-images/sample4.jpg', true);
```

For production, add products through the admin dashboard instead.

---

## 10. Configure Frontend

Update both files with your credentials:

| File | Purpose |
|------|---------|
| `app.js` | Public storefront — fetches available products |
| `admin/admin.js` | Admin dashboard — full CRUD + image upload |

The WhatsApp number is already set and must remain:

```javascript
const WHATSAPP_NUMBER = "233503532409";
```

---

## 11. Deploy the Site

The site is static HTML/CSS/JS. Deploy to any static host:

- **Vercel** — connect your repo, deploy root directory
- **Netlify** — drag-and-drop or connect repo
- **GitHub Pages** — push to `gh-pages` branch

### Deployment checklist

- [ ] Supabase URL and anon key configured in `app.js` and `admin/admin.js`
- [ ] Products table created with RLS policies
- [ ] `jersey-images` storage bucket created with policies
- [ ] Realtime enabled on `products` table
- [ ] Admin user created and added to `admin_profiles`
- [ ] Test public storefront loads products
- [ ] Test admin login, add/edit/delete products
- [ ] Test WhatsApp checkout flow

---

## 12. Security Reminders

- Use only the **anon/publishable key** in browser code.
- **Never** put the service-role key in HTML, CSS, JavaScript, or public repos.
- RLS enforces access control — frontend hiding alone is not security.
- Only users in `admin_profiles` can create, update, or delete products.
- Public users can only read products where `is_available = true`.
- Rotate keys if they are ever exposed.

---

## 13. Troubleshooting

| Issue | Solution |
|-------|----------|
| Products not loading | Check URL/key in `app.js`, verify RLS SELECT policy |
| Admin login fails | Confirm user exists in `admin_profiles` |
| Image upload fails | Check storage bucket name and INSERT policy |
| Realtime not updating | Enable replication on `products` table |
| 403 on admin CRUD | Verify admin UUID in `admin_profiles` |
| CORS errors | Supabase handles CORS; check project URL is correct |

---

## File Structure

```
/
├── index.html          Public storefront
├── style.css           Storefront styles
├── app.js              Storefront logic + Supabase
├── SUPABASE_SETUP.md   This guide
│
└── admin/
    ├── index.html      Admin login + dashboard
    ├── admin.css       Admin styles
    └── admin.js        Admin logic + Supabase
```
