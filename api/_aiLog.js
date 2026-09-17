// Cost and latency logging for every Vertex AI call.
//
// Nothing recorded what the AI features cost or how long they took, so every
// cost decision so far has been made blind -- a feature was removed for "costing
// a lot" without a single number behind it. This writes one row per model call
// to Supabase (see AI_COST_LOGGING_SETUP.sql), where ai_cost_daily turns it into
// calls, failures, latency and estimated spend per day.
//
// It records TOKENS, not dollars. Tokens are what Vertex actually reports and
// they never go stale; cost is derived in SQL from ai_model_prices, so a price
// change is one row edited rather than a redeploy and a wrong history.
//
// Never logged: prompts, images, or anything a user typed. Metadata only.
//
// Shares the underscore prefix with _rateLimit.js, which keeps it a helper
// rather than a routable endpoint on Vercel and in the dev middleware.
import { createClient } from '@supabase/supabase-js';

const url = process.env.VITE_SUPABASE_URL;
const anon = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = (url && anon) ? createClient(url, anon) : null;

// A slow database must never make a render feel slow. The write is awaited --
// Vercel can freeze a function the moment the response is sent, which would
// silently drop the row -- but only for this long.
const LOG_TIMEOUT_MS = 1200;

/**
 * Pull token counts out of a Vertex response.
 *
 * Output is split by modality because the two are priced an order of magnitude
 * apart: on the image model an output image token costs far more than an output
 * text token, so folding them together would misprice every render.
 * Thinking tokens are reported separately from candidates and billed as output.
 */
export function usageOf(response) {
    const u = response?.usageMetadata;
    if (!u) return {};
    const imageTokens = (u.candidatesTokensDetails || [])
        .filter((d) => String(d.modality).toUpperCase() === 'IMAGE')
        .reduce((sum, d) => sum + (d.tokenCount || 0), 0);
    return {
        promptTokens: u.promptTokenCount ?? null,
        outputTokens: u.candidatesTokenCount ?? null,
        outputImageTokens: imageTokens || null,
        thinkingTokens: u.thoughtsTokenCount ?? null,
        totalTokens: u.totalTokenCount ?? null,
    };
}

/**
 * Record one model call. Resolves regardless of outcome and never throws:
 * losing a log row is always better than failing a request that worked.
 */
export async function logAiCall(entry) {
    if (!supabase) return;
    const write = supabase.rpc('log_ai_call', {
        // production | preview | development on Vercel; 'local' under npm run dev,
        // so testing doesn't pass itself off as real usage.
        p_env: process.env.VERCEL_ENV || 'local',
        p_endpoint: entry.endpoint,
        p_call_type: entry.callType,
        p_model: entry.model,
        p_success: !!entry.success,
        p_status: entry.status ?? null,
        p_latency_ms: Math.round(entry.latencyMs ?? 0),
        p_model_latency_ms: entry.modelLatencyMs == null ? null : Math.round(entry.modelLatencyMs),
        p_attempts: entry.attempts ?? 1,
        p_prompt_tokens: entry.promptTokens ?? null,
        p_output_tokens: entry.outputTokens ?? null,
        p_output_image_tokens: entry.outputImageTokens ?? null,
        p_thinking_tokens: entry.thinkingTokens ?? null,
        p_total_tokens: entry.totalTokens ?? null,
        p_error: entry.error ? String(entry.error).slice(0, 300) : null,
        p_meta: entry.meta ?? null,
    }).then(({ error }) => {
        if (error) console.warn('[aiLog] write failed:', error.message);
    }).catch((err) => console.warn('[aiLog] write failed:', err?.message || err));

    const timeout = new Promise((r) => setTimeout(r, LOG_TIMEOUT_MS));
    await Promise.race([write, timeout]);
}

/** Client-supplied labels are data, not trusted: keep them short and plain. */
export const cleanLabel = (s) => {
    const v = String(s || '').toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 40);
    return v || null;
};
