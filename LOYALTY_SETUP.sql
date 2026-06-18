-- ════════════════════════════════════════════════════════════════════════════
-- Stonevo Privilege Circle — database setup
-- Run ONCE: Supabase Dashboard → SQL Editor → New query → paste all → Run.
-- Safe to re-run (uses IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Billing records (admin-entered; the source of truth) ──────────────────
-- One row per recorded deal. No sale price is stored — only tier (profit/sqft),
-- quantity, and the points earned (tier% of profit). GST-safe by design.
CREATE TABLE IF NOT EXISTS public.loyalty_billing (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    architect_phone   text NOT NULL,
    architect_lead_id uuid,
    architect_name    text,
    project_name      text,
    sqft              numeric NOT NULL DEFAULT 0,
    collection_tier   text,            -- tier letter 'A'..'J'
    points_per_sqft   numeric DEFAULT 0, -- profit per sqft for the chosen tier
    points_earned     numeric NOT NULL DEFAULT 0, -- tier% × total profit
    billed_at         date DEFAULT now(),
    invoice_ref       text,
    notes             text,            -- stone name + any free notes
    created_at        timestamptz DEFAULT now(),
    created_by        text
);
CREATE INDEX IF NOT EXISTS idx_loyalty_billing_phone ON public.loyalty_billing(architect_phone);

-- ── 2. Experience preferences (architect-set, one row per architect) ─────────
CREATE TABLE IF NOT EXISTS public.loyalty_preferences (
    architect_phone   text PRIMARY KEY,
    experience_type   text,            -- solo | couple | family | friends | team | learning | open
    preferred_month   text,
    destination_types text[],          -- Beach, Mountains, Heritage, …
    updated_at        timestamptz DEFAULT now()
);

-- ── 3. Redemption requests ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    architect_phone text NOT NULL,
    architect_name  text,
    experience_name text,
    region          text,              -- "Destination band · N pax"
    wallet_amount   numeric NOT NULL DEFAULT 0, -- POINT cost of the experience
    status          text NOT NULL DEFAULT 'requested', -- requested|approved|fulfilled|rejected
    requested_at    timestamptz DEFAULT now(),
    resolved_at     timestamptz,
    admin_notes     text
);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_phone ON public.loyalty_redemptions(architect_phone);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- The app talks to Supabase with the anon key (no Supabase Auth), so we mirror
-- how the rest of the app's tables work: RLS on + permissive policies for the
-- anon/authenticated roles.
ALTER TABLE public.loyalty_billing     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.loyalty_billing,
             public.loyalty_preferences,
             public.loyalty_redemptions
      TO anon, authenticated;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loyalty_billing' AND policyname='anon_all_billing') THEN
        CREATE POLICY anon_all_billing ON public.loyalty_billing
            FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loyalty_preferences' AND policyname='anon_all_prefs') THEN
        CREATE POLICY anon_all_prefs ON public.loyalty_preferences
            FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='loyalty_redemptions' AND policyname='anon_all_redemptions') THEN
        CREATE POLICY anon_all_redemptions ON public.loyalty_redemptions
            FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
    END IF;
END$$;

-- ── Done. Reload the admin panel — the Privilege Circle tab now works. ───────
