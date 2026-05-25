-- ──────────────────────────────────────────────────────────────────────
-- VENDOR PORTAL SETUP
-- Run this once in Supabase SQL Editor before using /vendor.
-- ──────────────────────────────────────────────────────────────────────

-- 1. Table for vendor stone submissions (moderation queue + history)
CREATE TABLE IF NOT EXISTS vendor_stones (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id          uuid NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    name               text NOT NULL,
    image_url          text,
    additional_images  jsonb NOT NULL DEFAULT '[]'::jsonb,
    stone_type         text,           -- Marble / Quartzite / Granite / Onyx / Limestone / Travertine / Sandstone / Quartz
    origin             text,           -- e.g. Italy, Rajasthan
    price_per_sqft     numeric,        -- ₹ per sqft
    lot_size_sqft      numeric,        -- total sqft available in the lot
    slab_length        numeric,        -- cm or ft (vendor's choice; free-form for now)
    slab_width         numeric,
    notes              text,
    status             text NOT NULL DEFAULT 'pending'  -- pending | approved | rejected
                       CHECK (status IN ('pending','approved','rejected')),
    rejection_reason   text,
    approved_stone_id  uuid REFERENCES stones(id) ON DELETE SET NULL,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_stones_vendor ON vendor_stones(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_stones_status ON vendor_stones(status);

-- Auto-bump updated_at on every UPDATE
CREATE OR REPLACE FUNCTION set_vendor_stones_updated_at() RETURNS trigger AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vendor_stones_updated_at ON vendor_stones;
CREATE TRIGGER trg_vendor_stones_updated_at
    BEFORE UPDATE ON vendor_stones
    FOR EACH ROW EXECUTE FUNCTION set_vendor_stones_updated_at();

-- RLS off — the rest of the app runs with RLS disabled
ALTER TABLE vendor_stones DISABLE ROW LEVEL SECURITY;

-- 2. Enable Realtime for admin moderation panel (optional but nice)
ALTER TABLE vendor_stones REPLICA IDENTITY FULL;

-- 3. The `leads` table already has a `role` column.
--    Vendors get role='vendor', status='approved'. Admin creates them via
--    the Vendor Manager in the admin panel. No schema change needed for leads.

-- DONE.
-- After running this, ensure the 'marble-images' Storage bucket is public
-- (it already is, since the main /admin upload uses it). Vendor uploads
-- reuse the same bucket with a "vendor/" prefix.
