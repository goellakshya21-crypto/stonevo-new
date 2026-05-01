import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const FAST2SMS_KEY     = Deno.env.get('FAST2SMS_API_KEY')!;
const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const { phone } = await req.json();
        if (!phone || phone.length < 10) throw new Error('Valid 10-digit phone number required');

        // Generate 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min

        // Store OTP in DB (clear any old ones for this phone first)
        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);
        await supabase.from('otp_codes').delete().eq('phone', phone);
        const { error: insertErr } = await supabase.from('otp_codes').insert({
            phone,
            code: otp,
            expires_at: expiresAt,
        });
        if (insertErr) throw new Error('Failed to store OTP. Make sure otp_codes table exists.');

        // Send via Fast2SMS Quick route (no website verification or DLT needed)
        const message = encodeURIComponent(`Your Stonevo verification code is ${otp}. Valid for 10 minutes.`);
        const url = `https://www.fast2sms.com/dev/bulkV2?authorization=${FAST2SMS_KEY}&message=${message}&language=english&route=q&numbers=${phone}`;
        const res  = await fetch(url);
        const data = await res.json();

        const f2sMsg = Array.isArray(data.message) ? data.message[0] : (data.message || 'Fast2SMS failed to send OTP');
        if (!data.return) throw new Error(f2sMsg);

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 400,
            headers: { ...cors, 'Content-Type': 'application/json' },
        });
    }
});
