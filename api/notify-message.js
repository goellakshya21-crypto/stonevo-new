import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || '';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_EMAIL = process.env.NOTIFY_FROM_EMAIL || 'Stonevo <notifications@stonevo.in>';

async function sendEmail(to, subject, html) {
    if (!RESEND_API_KEY || !to) return;
    try {
        await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${RESEND_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html }),
        });
    } catch (err) {
        console.error('[Notify] Email send failed:', err.message);
    }
}

function emailHtml(senderName, senderRole, preview, projectId) {
    const url = `https://stonevo.in`;
    return `
        <div style="font-family: 'Georgia', serif; background: #0d0c0a; color: #FDFCF8; padding: 48px 40px; max-width: 560px; margin: 0 auto; border-radius: 12px;">
            <p style="font-size: 11px; letter-spacing: 0.4em; text-transform: uppercase; color: #A37D4B; margin: 0 0 24px;">Stonevo · New Message</p>
            <h2 style="font-size: 24px; font-weight: 300; margin: 0 0 8px; letter-spacing: -0.02em;">
                ${senderName} <span style="color: #A37D4B; font-style: italic;">sent a message</span>
            </h2>
            <p style="font-size: 12px; color: #6b6357; text-transform: uppercase; letter-spacing: 0.2em; margin: 0 0 32px;">${senderRole}</p>
            ${preview ? `
            <div style="border-left: 2px solid #A37D4B; padding: 12px 20px; background: rgba(163,125,75,0.06); border-radius: 4px; margin-bottom: 36px;">
                <p style="font-size: 15px; font-weight: 300; color: #a89e8d; line-height: 1.6; margin: 0;">${preview}</p>
            </div>` : ''}
            <a href="${url}" style="display: inline-block; background: #A37D4B; color: #0d0c0a; font-family: sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; padding: 14px 32px; border-radius: 100px; text-decoration: none;">
                Open Stonevo →
            </a>
            <p style="margin-top: 40px; font-size: 10px; color: #3a342d; letter-spacing: 0.2em; text-transform: uppercase;">Stonevo Architectural · You are receiving this because you are part of this project.</p>
        </div>
    `;
}

export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).end();

    const { projectId, senderRole, senderName, messagePreview } = req.body || {};
    if (!projectId || !senderRole || !senderName) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const preview = (messagePreview || '').slice(0, 200);
    const subject = `New message from ${senderName} on Stonevo`;
    const html = emailHtml(senderName, senderRole, preview, projectId);

    const notified = new Set();
    const notify = async (email) => {
        if (!email || notified.has(email)) return;
        notified.add(email);
        await sendEmail(email, subject, html);
    };

    try {
        // Always notify admin (the "me" in the request)
        if (ADMIN_EMAIL && senderRole !== 'admin') {
            await notify(ADMIN_EMAIL);
        }

        // Look up client email (project_id IS the client's lead id)
        const { data: clientLead } = await supabase
            .from('leads')
            .select('email, phone, full_name')
            .eq('id', projectId)
            .single();

        if (clientLead?.email && senderRole !== 'client') {
            await notify(clientLead.email);
        }

        // Find the architect linked to this client
        if (clientLead?.phone) {
            const { data: whitelist } = await supabase
                .from('architect_client_whitelist')
                .select('architect_phone')
                .eq('phone_number', clientLead.phone)
                .limit(1)
                .single();

            if (whitelist?.architect_phone) {
                const { data: archLead } = await supabase
                    .from('leads')
                    .select('email')
                    .eq('phone', whitelist.architect_phone)
                    .single();

                if (archLead?.email && senderRole !== 'architect') {
                    await notify(archLead.email);
                }
            }
        }

        return res.status(200).json({ ok: true, notified: notified.size });
    } catch (err) {
        console.error('[Notify] Error:', err);
        return res.status(500).json({ error: err.message });
    }
}
