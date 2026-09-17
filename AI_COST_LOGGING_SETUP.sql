-- ════════════════════════════════════════════════════════════════════════════
-- Ston — AI cost & latency logging
-- Run ONCE in Supabase → SQL Editor. Safe to re-run.
--
-- api/_aiLog.js writes one row per Vertex AI call through log_ai_call(). Until
-- this has been run those writes fail quietly and nothing else is affected.
--
-- READ IT BACK WITH:
--   select * from ai_cost_daily limit 50;           -- per day, per call type
--   select * from ai_call_costs order by created_at desc limit 50;  -- per call
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. The log ───────────────────────────────────────────────────────────────
-- Tokens, not dollars: tokens are what Vertex reports and never go stale. Cost
-- is derived below from ai_model_prices.
CREATE TABLE IF NOT EXISTS public.ai_call_logs (
    id                  bigserial PRIMARY KEY,
    created_at          timestamptz NOT NULL DEFAULT now(),
    env                 text,        -- production | preview | development | local
    endpoint            text,        -- generate-image | gemini-vertex
    call_type           text,        -- generated_room, facade_region, render_caption, ...
    model               text,
    success             boolean NOT NULL,
    status              int,
    latency_ms          int,         -- whole request, as the user waited for it
    model_latency_ms    int,         -- time inside the model call, retries included
    attempts            int,         -- >1 means Vertex quota retries happened
    prompt_tokens       int,
    output_tokens       int,         -- all candidate tokens, images included
    output_image_tokens int,         -- the image share of output_tokens
    thinking_tokens     int,         -- reported separately, billed as output
    total_tokens        int,
    error               text,
    meta                jsonb        -- application, slab count, facade retry reason...
);

CREATE INDEX IF NOT EXISTS ai_call_logs_created_at_idx ON public.ai_call_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_call_logs_type_idx       ON public.ai_call_logs (call_type, created_at DESC);


-- ── 2. Prices ────────────────────────────────────────────────────────────────
-- USD per MILLION tokens.
--
-- ⚠ VERIFY THESE against Google's current Vertex AI pricing page before trusting
-- any cost figure. They were entered from memory and prices do move. Correcting
-- one is a single UPDATE, and every historical estimate recomputes with it,
-- because costs are calculated at read time, never stored.
--
-- A model missing from this table shows est_cost_usd = NULL rather than a
-- confident wrong number. Treat a NULL cost as "add a price row".
CREATE TABLE IF NOT EXISTS public.ai_model_prices (
    model                  text PRIMARY KEY,
    input_per_mtok         numeric NOT NULL,
    output_per_mtok        numeric NOT NULL,   -- text output, and thinking
    image_output_per_mtok  numeric,            -- NULL for text-only models
    note                   text,
    updated_at             timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.ai_model_prices (model, input_per_mtok, output_per_mtok, image_output_per_mtok, note) VALUES
    ('gemini-2.5-flash-image', 0.30, 2.50, 30.00, 'VERIFY. Renders. ~1290 image tokens per output image.'),
    ('gemini-2.5-flash',       0.30, 2.50, NULL,  'VERIFY. Captions, bookmatch, chat, tagging, summaries.')
ON CONFLICT (model) DO NOTHING;


-- ── 3. The write path ────────────────────────────────────────────────────────
-- SECURITY DEFINER, like check_rate_limit: the server calls this with the anon
-- key, and the table itself grants anon nothing. Every value is clamped, because
-- the anon key is public -- the worst a stranger can do is add plausible-looking
-- rows, never read the log or write something unbounded.
CREATE OR REPLACE FUNCTION public.log_ai_call(
    p_env                 text    DEFAULT NULL,
    p_endpoint            text    DEFAULT NULL,
    p_call_type           text    DEFAULT NULL,
    p_model               text    DEFAULT NULL,
    p_success             boolean DEFAULT false,
    p_status              int     DEFAULT NULL,
    p_latency_ms          int     DEFAULT NULL,
    p_model_latency_ms    int     DEFAULT NULL,
    p_attempts            int     DEFAULT 1,
    p_prompt_tokens       int     DEFAULT NULL,
    p_output_tokens       int     DEFAULT NULL,
    p_output_image_tokens int     DEFAULT NULL,
    p_thinking_tokens     int     DEFAULT NULL,
    p_total_tokens        int     DEFAULT NULL,
    p_error               text    DEFAULT NULL,
    p_meta                jsonb   DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.ai_call_logs (
        env, endpoint, call_type, model, success, status,
        latency_ms, model_latency_ms, attempts,
        prompt_tokens, output_tokens, output_image_tokens, thinking_tokens, total_tokens,
        error, meta
    ) VALUES (
        left(p_env, 20), left(p_endpoint, 40), left(p_call_type, 40), left(p_model, 80),
        coalesce(p_success, false), p_status,
        greatest(0, least(p_latency_ms, 600000)),
        greatest(0, least(p_model_latency_ms, 600000)),
        greatest(1, least(coalesce(p_attempts, 1), 20)),
        greatest(0, least(p_prompt_tokens,       10000000)),
        greatest(0, least(p_output_tokens,       10000000)),
        greatest(0, least(p_output_image_tokens, 10000000)),
        greatest(0, least(p_thinking_tokens,     10000000)),
        greatest(0, least(p_total_tokens,        10000000)),
        left(p_error, 300),
        CASE WHEN pg_column_size(p_meta) > 2000 THEN NULL ELSE p_meta END
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_ai_call(
    text, text, text, text, boolean, int, int, int, int, int, int, int, int, int, text, jsonb
) TO anon, authenticated, service_role;


-- ── 4. Reading it ────────────────────────────────────────────────────────────
CREATE OR REPLACE VIEW public.ai_call_costs WITH (security_invoker = true) AS
SELECT
    l.*,
    round((
          coalesce(l.prompt_tokens, 0) * p.input_per_mtok
        + (coalesce(l.output_tokens, 0) - coalesce(l.output_image_tokens, 0)
           + coalesce(l.thinking_tokens, 0)) * p.output_per_mtok
        + coalesce(l.output_image_tokens, 0) * coalesce(p.image_output_per_mtok, p.output_per_mtok)
    ) / 1000000.0, 6) AS est_cost_usd
FROM public.ai_call_logs l
LEFT JOIN public.ai_model_prices p ON p.model = l.model;

CREATE OR REPLACE VIEW public.ai_cost_daily WITH (security_invoker = true) AS
SELECT
    date_trunc('day', created_at)                              AS day,
    env,
    call_type,
    count(*)                                                   AS calls,
    count(*) FILTER (WHERE NOT success)                        AS failures,
    count(*) FILTER (WHERE attempts > 1)                       AS quota_retried,
    round(avg(latency_ms))                                     AS avg_latency_ms,
    round(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric) AS p95_latency_ms,
    sum(coalesce(total_tokens, 0))                             AS tokens,
    round(sum(est_cost_usd), 4)                                AS est_cost_usd
FROM public.ai_call_costs
GROUP BY 1, 2, 3
ORDER BY 1 DESC, est_cost_usd DESC NULLS LAST;


-- ── 5. Keep it private ───────────────────────────────────────────────────────
-- RLS on with NO policies denies anon and authenticated entirely. The views are
-- security_invoker, so they inherit that denial instead of quietly exposing the
-- log through the public API. The SQL editor runs as postgres and sees it all.
ALTER TABLE public.ai_call_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_prices ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.ai_call_logs    FROM anon, authenticated;
REVOKE ALL ON public.ai_model_prices FROM anon, authenticated;
REVOKE ALL ON public.ai_call_costs   FROM anon, authenticated;
REVOKE ALL ON public.ai_cost_daily   FROM anon, authenticated;


-- ════════════════════════════════════════════════════════════════════════════
-- 6. FIX: the activity-compaction column that never existed
-- ════════════════════════════════════════════════════════════════════════════
-- src/utils/activityTracker.js summarises a lead's logs with Gemini once they
-- reach 100, saves the summary to leads.behavioral_compaction, then deletes the
-- logs. That column was never created, so the save failed, the logs were never
-- deleted, the count stayed at 100+ -- and EVERY later action by that lead paid
-- for another Gemini call carrying 100 logs. Checked on 2026-09-17: four leads
-- stuck at 257, 198, 167 and 142 logs. AdminLeads.jsx already reads this column
-- to show the summary, so this makes a designed feature work rather than adding
-- a new one.
--
-- The code now also refuses to retry compaction more than once a day per lead,
-- so a future failure can't loop like this again.
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS behavioral_compaction jsonb;
