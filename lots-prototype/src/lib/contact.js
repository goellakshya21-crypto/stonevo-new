// The three ways a buyer reaches the team ("Talk to us"):
//   1. a meeting set up over WhatsApp: a link that opens WhatsApp with the
//      request already written (day, time, what it's about);
//   2. "Share your requirement", and the team calls back (RequirementSheet);
//   3. a video call where the team shows the actual slab on camera.
//
// The business WhatsApp number comes from VITE_WHATSAPP_NUMBER (digits with
// the country code, e.g. 9198XXXXXXXX). Without it, the link opens WhatsApp's
// "send to…" picker with the same message, so the flow still works in a demo.
import { inr } from './lots';
import { BRAND } from './brand';

export const WHATSAPP_NUMBER = String(import.meta.env.VITE_WHATSAPP_NUMBER || '').replace(/\D/g, '');

// Where a happy customer reviews us on Google (optional; the button hides without it).
export const GOOGLE_REVIEW_URL = String(import.meta.env.VITE_GOOGLE_REVIEW_URL || '');

/**
 * Asking a customer for feedback on WhatsApp, after they bought (decided
 * 2026-11-17): a few words, a Google review, and photos of the finished space,
 * which we publish only with their permission.
 */
export const feedbackRequest = (name) =>
    [
        `Hi${name ? ` ${name}` : ''}, thank you for buying your stone with ${BRAND.name}.`,
        'How did it turn out? A few words here would mean a lot.',
        GOOGLE_REVIEW_URL ? `If you are happy, a Google review helps others find us: ${GOOGLE_REVIEW_URL}` : '',
        'And if you send photos of the finished space, we would love to share them, but only if you say yes.',
    ]
        .filter(Boolean)
        .join('\n\n');

/** A wa.me link that opens a chat with the team, `text` already typed. */
export const whatsappLink = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;

export const TIMES = [
    { id: 'morning', label: 'Morning', hours: '10 am–1 pm', endsAt: 13 },
    { id: 'afternoon', label: 'Afternoon', hours: '1–5 pm', endsAt: 17 },
    { id: 'evening', label: 'Evening', hours: '5–8 pm', endsAt: 20 },
];

/**
 * The next few days a meeting can be on: today (while a slot is still left),
 * tomorrow, then the days after by name.
 */
export function meetingDays(n = 5, now = new Date()) {
    const days = [];
    for (let i = 0; days.length < n; i++) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
        if (i === 0 && now.getHours() >= TIMES[TIMES.length - 1].endsAt - 1) continue;
        const long = d.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' });
        const short = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
        days.push({ id: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, short, long, isToday: i === 0 });
    }
    return days;
}

/** Slots still open on a day (on today, only those not yet over). */
export const timesOn = (day, now = new Date()) => (day?.isToday ? TIMES.filter((t) => t.endsAt - 1 > now.getHours()) : TIMES);

// Way 4, "Buy direct from the yard": a one-time fee and the buyer gets the
// yard's details (name, address, contact person, phone, where the lot is) to
// deal with it directly. Two tiers by what the lot is worth. Measured on the
// shelf: the median lot is ₹12,150 and 92 of 229 are under ₹10,000, so for
// many lots the fee is more than the lot; what it buys is the yard (all its
// stock), and the sheet says so when reserving through us would be cheaper.
export const DIRECT_FEE = { base: 10000, large: 20000, largeFrom: 50000 };
export const directFee = (lot) => (lot.lotTotal >= DIRECT_FEE.largeFrom ? DIRECT_FEE.large : DIRECT_FEE.base);

// Way 3, the video call, is paid when it is booked: it takes a person at the
// yard for a quarter of an hour, and a fee keeps the bookings to buyers who
// mean it. Credited against the stone if they buy within VIDEO_CREDIT_DAYS;
// refunded in full if we miss the call.
export const VIDEO_CALL_FEE = 499;
export const VIDEO_CREDIT_DAYS = 30;

/** One line about a lot, for a message to the team. */
export const lotLine = (lot) =>
    `${lot.name} (${lot.sqft} sq ft lot, ${inr(lot.price)}/sq ft for the whole lot or ${inr(lot.partRate)}/sq ft for part, ships from ${lot.city.name})`;

/** The WhatsApp message that asks for a meeting. */
export function meetingMessage({ day, time, about }) {
    return [
        `Hi ${BRAND.name}, I'd like to set up a meeting.`,
        `When: ${day.long}, ${time.label.toLowerCase()} (${time.hours})`,
        about ? `About: ${about}` : null,
        '(Sent from your website)',
    ]
        .filter(Boolean)
        .join('\n');
}
