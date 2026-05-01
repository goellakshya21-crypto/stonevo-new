import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL     = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

    try {
        const { phone, otp } = await req.json();
        if (!phone || !otp) throw new Error('Phone and OTP are required');

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE);

        // Look up a valid, unused, non-expired OTP for this phone
        const { data, error } = await supabase
            .from('otp_codes')
            .select('*')
            .eq('phone', phone)
            .eq('code', otp)
            .eq('used', false)
            .gt('expires_at', new Date().toISOString())
            .single();

        if (error || !data) throw new Error('Invalid or expired verification code');

        // Mark as used so it can't be reused
        await supabase.from('otp_codes').update({ used: true }).eq('id', data.id);

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
