-- ════════════════════════════════════════════════════════════════════════════
-- Ston — API rate limiting (DDoS / cost-abuse protection)
-- Run ONCE in Supabase → SQL Editor. Safe to re-run.
--
-- Backs an atomic sliding-window limiter shared across all Vercel serverless
-- instances + the OTP edge function. check_rate_limit() increments a counter
-- per key and returns FALSE once the limit is exceeded within the window.
-- ════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.rate_limits (
    key          text PRIMARY KEY,
    count        int  NOT NULL DEFAULT 0,
    window_start timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(p_key text, p_limit int, p_window int)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_count int;
BEGIN
    INSERT INTO public.rate_limits AS rl (key, count, window_start)
        VALUES (p_key, 1, now())
    ON CONFLICT (key) DO UPDATE SET
        count = CASE WHEN rl.window_start < now() - make_interval(secs => p_window)
                     THEN 1 ELSE rl.count + 1 END,
        window_start = CASE WHEN rl.window_start < now() - make_interval(secs => p_window)
                            THEN now() ELSE rl.window_start END
    RETURNING rl.count INTO v_count;
    RETURN v_count <= p_limit;   -- true = allowed, false = over limit
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int)
    TO anon, authenticated, service_role;

-- Optional housekeeping: prune stale rows occasionally (not required).
-- DELETE FROM public.rate_limits WHERE window_start < now() - interval '1 day';
