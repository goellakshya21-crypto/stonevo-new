-- ════════════════════════════════════════════════════════════════════════════
-- Ston — per-user visualisation limits
-- Run ONCE in Supabase → SQL Editor. Safe to re-run.
--
-- Gives each lead an optional cap on how many renders they may generate.
-- NULL limit = unlimited, which is what every existing user gets, so running
-- this changes nothing until a limit is actually set on somebody.
--
-- Set one from the admin panel (Leads → Render limit), or here:
--   update leads set visualization_limit = 100 where phone = '9910978887';
--   update leads set visualization_limit = null where phone = '9910978887';  -- unlimited
--   update leads set visualizations_used = 0 where phone = '9910978887';     -- reset
--
-- ⚠ SCOPE OF THIS CONTROL. It stops ordinary use past the cap and is enough to
-- bound spend per user. It is NOT tamper-proof: the app has no server-verified
-- identity (the browser just says which lead it is), and the anon key can still
-- write to `leads` directly — the same pre-existing gap SECURITY_RLS_STEP1.sql
-- lists as unfixed. Closing it properly means RLS on `leads` plus a signed
-- identity, not a change to this file.
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. Columns ───────────────────────────────────────────────────────────────
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS visualization_limit int;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS visualizations_used int NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.leads.visualization_limit IS 'Max renders this lead may generate. NULL = unlimited.';
COMMENT ON COLUMN public.leads.visualizations_used IS 'Renders generated so far. Only consume_visualization() increments it.';


-- ── 2. Spend one ─────────────────────────────────────────────────────────────
-- Checked and incremented in ONE statement, so two tabs racing cannot both slip
-- past the last credit. Returns the counts as well, so the caller can tell the
-- user where they stand without a second query.
--
-- Fails OPEN when there is no lead id or the lead is unknown. Anything that
-- reaches the gallery has passed the OTP gate and therefore HAS a lead; a
-- request without one can only come from outside the app, which the missing
-- server-side identity already leaves open. Failing closed here would buy no
-- security and would break guest and admin sessions instead.
CREATE OR REPLACE FUNCTION public.consume_visualization(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_used  int;
    v_limit int;
    v_found boolean := false;
BEGIN
    IF p_lead_id IS NULL THEN
        RETURN jsonb_build_object('allowed', true, 'reason', 'no_lead');
    END IF;

    SELECT true, coalesce(visualizations_used, 0), visualization_limit
      INTO v_found, v_used, v_limit
      FROM public.leads WHERE id = p_lead_id;

    IF NOT coalesce(v_found, false) THEN
        RETURN jsonb_build_object('allowed', true, 'reason', 'unknown_lead');
    END IF;

    IF v_limit IS NULL THEN
        UPDATE public.leads SET visualizations_used = coalesce(visualizations_used, 0) + 1
         WHERE id = p_lead_id RETURNING visualizations_used INTO v_used;
        RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', null, 'reason', 'unlimited');
    END IF;

    UPDATE public.leads SET visualizations_used = coalesce(visualizations_used, 0) + 1
     WHERE id = p_lead_id AND coalesce(visualizations_used, 0) < v_limit
    RETURNING visualizations_used INTO v_used;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('allowed', false, 'used', v_limit, 'limit', v_limit, 'reason', 'limit_reached');
    END IF;

    RETURN jsonb_build_object('allowed', true, 'used', v_used, 'limit', v_limit);
END;
$$;


-- ── 3. Give it back ──────────────────────────────────────────────────────────
-- A render that errored produced nothing, so it must not cost the user a credit.
-- Floored at zero so a double refund can never mint credits.
CREATE OR REPLACE FUNCTION public.refund_visualization(p_lead_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_lead_id IS NULL THEN RETURN; END IF;
    UPDATE public.leads
       SET visualizations_used = greatest(0, coalesce(visualizations_used, 0) - 1)
     WHERE id = p_lead_id;
END;
$$;


-- ── 4. Where do I stand ──────────────────────────────────────────────────────
-- Read-only, for the counter in the gallery header and the notice shown when a
-- user is already out before they start.
CREATE OR REPLACE FUNCTION public.visualization_status(p_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_used int; v_limit int; v_found boolean := false;
BEGIN
    IF p_lead_id IS NULL THEN RETURN jsonb_build_object('limit', null); END IF;
    SELECT true, coalesce(visualizations_used, 0), visualization_limit
      INTO v_found, v_used, v_limit
      FROM public.leads WHERE id = p_lead_id;
    IF NOT coalesce(v_found, false) THEN RETURN jsonb_build_object('limit', null); END IF;
    RETURN jsonb_build_object(
        'used', v_used,
        'limit', v_limit,
        'remaining', CASE WHEN v_limit IS NULL THEN null ELSE greatest(0, v_limit - v_used) END,
        'exhausted', v_limit IS NOT NULL AND v_used >= v_limit
    );
END;
$$;


GRANT EXECUTE ON FUNCTION public.consume_visualization(uuid)   TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.refund_visualization(uuid)    TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.visualization_status(uuid)    TO anon, authenticated, service_role;


-- ── 5. Who is spending what ──────────────────────────────────────────────────
-- api/_aiLog.js now puts the lead id in the log's meta, so cost per user falls
-- out of the logging added in AI_COST_LOGGING_SETUP.sql. Run that file first;
-- this view is skipped harmlessly if you have not.
DO $$
BEGIN
    IF to_regclass('public.ai_call_costs') IS NULL THEN
        RAISE NOTICE 'Skipping ai_cost_by_lead — run AI_COST_LOGGING_SETUP.sql first.';
        RETURN;
    END IF;

    EXECUTE $v$
        CREATE OR REPLACE VIEW public.ai_cost_by_lead WITH (security_invoker = true) AS
        SELECT
            (c.meta->>'lead_id')::uuid            AS lead_id,
            l.full_name,
            l.phone,
            l.visualizations_used,
            l.visualization_limit,
            count(*)                              AS ai_calls,
            round(sum(c.est_cost_usd), 4)         AS est_cost_usd,
            max(c.created_at)                     AS last_call
        FROM public.ai_call_costs c
        LEFT JOIN public.leads l ON l.id = (c.meta->>'lead_id')::uuid
        WHERE c.meta->>'lead_id' IS NOT NULL
        GROUP BY 1, 2, 3, 4, 5
        ORDER BY est_cost_usd DESC NULLS LAST
    $v$;
    EXECUTE 'REVOKE ALL ON public.ai_cost_by_lead FROM anon, authenticated';
END;
$$;
