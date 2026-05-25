-- ──────────────────────────────────────────────────────────────────────
-- VENDOR PORTAL SETUP
-- Run this once in Supabase SQL Editor before using /vendor.
-- ──────────────────────────────────────────────────────────────────────

-- Table for vendor-uploaded stones. NOT linked to the public gallery —
-- this is a private space where vendors upload their photos and lot
-- details for Stonevo to review.
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
    slab_length        numeric,        -- cm
    slab_width         numeric,
    notes              text,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_stones_vendor ON vendor_stones(vendor_id);

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

-- RLS off — matches the rest of the app
ALTER TABLE vendor_stones DISABLE ROW LEVEL SECURITY;

-- The `leads` table already has a `role` column, but its CHECK
-- constraint probably doesn't allow 'vendor' yet. Replace it with one
-- that does.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_role_check;
ALTER TABLE leads
    ADD CONSTRAINT leads_role_check
    CHECK (role IS NULL OR role IN ('architect', 'builder', 'vendor', 'admin'));

-- Vendors get role='vendor', status='approved'. Admin invites them via
-- the Vendors tab in /internal-management-stonevo-9921.

-- Uploads use the existing 'marble-images' public Storage bucket
-- under a "vendor/" prefix — no new bucket needed.

-- DONE.
