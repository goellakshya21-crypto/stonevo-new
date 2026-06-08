-- ════════════════════════════════════════════════════════════════════════════
-- Stonevo Privilege Circle — database schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. Billing records (admin-entered, source of truth) ──────────────────────
CREATE TABLE IF NOT EXISTS loyalty_billing (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    architect_phone   text NOT NULL,
    architect_lead_id uuid,
    architect_name    text,
    project_name      text,
    sqft              numeric NOT NULL DEFAULT 0,
    rate_per_sqft     numeric NOT NULL DEFAULT 0,
    material_value    numeric NOT NULL DEFAULT 0,
    collection_tier   text,
    points_per_sqft   integer NOT NULL DEFAULT 0,
    points_earned     numeric NOT NULL DEFAULT 0,
    wallet_per_sqft   integer NOT NULL DEFAULT 0,
    wallet_earned     numeric NOT NULL DEFAULT 0,
    billed_at         date DEFAULT now(),
    invoice_ref       text,
    notes             text,
    created_at        timestamptz DEFAULT now(),
    created_by        text
);
CREATE INDEX IF NOT EXISTS idx_loyalty_billing_phone ON loyalty_billing(architect_phone);

-- ── 2. Experience preferences (architect-set) ────────────────────────────────
CREATE TABLE IF NOT EXISTS loyalty_preferences (
    architect_phone   text PRIMARY KEY,
    experience_type   text,
    preferred_month   text,
    destination_types text[],
    updated_at        timestamptz DEFAULT now()
);

-- ── 3. Redemption requests (Phase 2, table created now) ──────────────────────
CREATE TABLE IF NOT EXISTS loyalty_redemptions (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    architect_phone text NOT NULL,
    architect_name  text,
    experience_name text,
    region          text,
    wallet_amount   numeric NOT NULL DEFAULT 0,
    status          text NOT NULL DEFAULT 'requested',  -- requested | approved | fulfilled | rejected
    requested_at    timestamptz DEFAULT now(),
    resolved_at     timestamptz,
    admin_notes     text
);
CREATE INDEX IF NOT EXISTS idx_loyalty_redemptions_phone ON loyalty_redemptions(architect_phone);

-- ── Row Level Security ───────────────────────────────────────────────────────
-- The app uses the anon key for everything (no Supabase Auth), so we allow
-- anon read/write the same way the rest of the app's tables work. If you later
-- adopt Supabase Auth, tighten these policies.
ALTER TABLE loyalty_billing      ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_preferences  ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_redemptions  ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    -- loyalty_billing
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_billing' AND policyname='anon_all_billing') THEN
        CREATE POLICY anon_all_billing ON loyalty_billing FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- loyalty_preferences
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_preferences' AND policyname='anon_all_prefs') THEN
        CREATE POLICY anon_all_prefs ON loyalty_preferences FOR ALL USING (true) WITH CHECK (true);
    END IF;
    -- loyalty_redemptions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='loyalty_redemptions' AND policyname='anon_all_redemptions') THEN
        CREATE POLICY anon_all_redemptions ON loyalty_redemptions FOR ALL USING (true) WITH CHECK (true);
    END IF;
END$$;
