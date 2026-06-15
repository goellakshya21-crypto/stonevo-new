/**
 * Stonevo Privilege Circle — shared computation logic.
 *
 * Single source of truth for: collection tiers, points/wallet rates,
 * circle thresholds, and the redemption catalog. Used by both the admin
 * billing tool and the architect dashboard so the math never drifts.
 *
 * DECISIONS (locked with the user):
 *  - Tier is based on CURRENT wallet BALANCE (spending can lower your circle)
 *  - Redeeming SPENDS the wallet (balance decreases)
 *  - Below ₹25k = "Member" (working toward Silver)
 *  - All values in ₹
 */

// ── Sale tiers (A–E) — selected directly, NEVER derived from a price ──────────
// Tier A is the highest collection, Tier E the entry collection. The ₹/sqft
// "band" is the INTERNAL definition of each tier only — no sale price is ever
// entered or stored (keeps it GST-safe for a cash business). Points and the
// reward wallet are computed purely from the tier + quantity.
export const COLLECTION_TIERS = [
    { letter: 'A', key: 'signature', label: 'Signature', band: 'Above ₹2,000/sqft',   points: 5 },
    { letter: 'B', key: 'elite',     label: 'Elite',     band: '₹1,500–2,000/sqft',   points: 4 },
    { letter: 'C', key: 'premium',   label: 'Premium',   band: '₹1,000–1,500/sqft',   points: 3 },
    { letter: 'D', key: 'core',      label: 'Core',      band: '₹500–1,000/sqft',     points: 2 },
    { letter: 'E', key: 'standard',  label: 'Standard',  band: 'Below ₹500/sqft',     points: 1 },
];

/** Look up a tier by its letter (A–E) or key (signature…standard). */
export const tierByLetter = (letterOrKey) => {
    const v = String(letterOrKey || '').toUpperCase();
    return COLLECTION_TIERS.find(t => t.letter === v)
        || COLLECTION_TIERS.find(t => t.key === String(letterOrKey || '').toLowerCase())
        || null;
};

/**
 * Compute the earning breakdown for a single sale.
 * @param sqft        quantity sold (not money — GST-safe)
 * @param tierLetter  'A' | 'B' | 'C' | 'D' | 'E'  (or a tier key)
 */
export const computeBilling = (sqft, tierLetter) => {
    const s = Number(sqft) || 0;
    const tier = tierByLetter(tierLetter) || COLLECTION_TIERS[COLLECTION_TIERS.length - 1];
    return {
        sqft: s,
        tierLetter: tier.letter,
        collectionTier: tier.key,
        collectionLabel: tier.label,
        band: tier.band,
        pointsPerSqft: tier.points,
        pointsEarned: s * tier.points,
    };
};

// ── Circle tiers by CURRENT points balance ────────────────────────────────────
// Each circle raises BOTH the group size (how many people the architect can
// bring) AND the destination scope. Experiences are cumulative — a higher circle
// can still redeem lower-tier trips, just with a larger group.
export const CIRCLES = [
    {
        key: 'member', label: 'Member', short: 'Member', min: 0,
        maxTravellers: 0, travelStyle: 'Building toward Silver',
        unlocks: [],
        experiences: [],
        color: '#9A938A', accent: '#6A645B',
    },
    {
        key: 'silver', label: 'Silver Circle', short: 'Silver', min: 5000,
        maxTravellers: 1, travelStyle: 'Solo Experience',
        unlocks: ['solo', 'learning'],
        experiences: ['Jaipur', 'Udaipur', 'Goa', 'Kerala', 'Rishikesh Luxury Retreat'],
        color: '#C0C0C0', accent: '#8A8A8A',
    },
    {
        key: 'gold', label: 'Gold Circle', short: 'Gold', min: 15000,
        maxTravellers: 2, travelStyle: 'Couple / Duo',
        unlocks: ['solo', 'couple', 'learning'],
        experiences: ['Kashmir', 'Andaman', 'Coorg', 'North East', 'Luxury Goa', 'Dubai', 'Thailand', 'Vietnam'],
        color: '#D4AF37', accent: '#A37D4B',
    },
    {
        key: 'platinum', label: 'Platinum Circle', short: 'Platinum', min: 30000,
        maxTravellers: 4, travelStyle: 'Family (up to 4)',
        unlocks: ['solo', 'couple', 'family', 'friends', 'learning'],
        experiences: ['Bali', 'Singapore', 'Europe Short Trip', 'Japan', 'Turkey'],
        color: '#E5E4E2', accent: '#B0B0B0',
    },
    {
        key: 'black', label: 'Black Circle', short: 'Black', min: 60000,
        maxTravellers: 8, travelStyle: 'Team / Friends (up to 8)',
        unlocks: ['solo', 'couple', 'family', 'friends', 'team', 'learning'],
        experiences: ['Switzerland', 'Italy', 'Greece', 'Australia', 'Custom Family Vacation'],
        color: '#1a1a1a', accent: '#C8A86E',
    },
];

/** Minimum circle (object) that unlocks a given experience-type key. */
export const minCircleForExperienceType = (typeKey) => {
    for (const c of CIRCLES) {
        if (c.unlocks.includes(typeKey)) return c;
    }
    return null; // e.g. 'open' is always available — handled by caller
};

/** Resolve the circle for a points balance. Returns { current, next, progressPct, toNext }. */
export const circleForPoints = (balance) => {
    const b = Number(balance) || 0;
    let current = CIRCLES[0];
    for (const c of CIRCLES) {
        if (b >= c.min) current = c;
    }
    const idx = CIRCLES.findIndex(c => c.key === current.key);
    const next = CIRCLES[idx + 1] || null;
    let progressPct = 100;
    let toNext = 0;
    if (next) {
        const span = next.min - current.min;
        progressPct = span > 0 ? Math.min(100, Math.round(((b - current.min) / span) * 100)) : 0;
        toNext = Math.max(0, next.min - b);
    }
    return { current, next, progressPct, toNext };
};

// ── Experience preference options ─────────────────────────────────────────────
export const EXPERIENCE_TYPES = [
    { key: 'solo',     label: 'Solo Experience',                desc: 'Personal travel, wellness retreat, leisure getaway' },
    { key: 'couple',   label: 'Couple Experience',              desc: 'Travel with spouse or partner' },
    { key: 'family',   label: 'Family Experience',              desc: 'Family vacation or holiday' },
    { key: 'friends',  label: 'Friends Experience',             desc: 'Travel with friends or peer group' },
    { key: 'team',     label: 'Team Experience',                desc: 'Team outing, offsite, celebration or reward for your office team', star: true },
    { key: 'learning', label: 'Learning & Discovery Experience', desc: 'Architecture tours, design tours, exhibitions, material exploration trips' },
    { key: 'open',     label: 'Open to Suggestions',            desc: 'Let Stonevo curate an experience based on your interests' },
];

export const DESTINATION_TYPES = [
    'Beach', 'Mountains', 'Heritage', 'Luxury', 'Adventure', 'Wellness', 'International', 'Domestic',
];

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * Experiences grouped by circle, split into unlocked vs upcoming based on the
 * architect's current points balance. Each group carries its circle's
 * traveller entitlement so the UI can show "Family · up to 4".
 *
 * Returns { unlocked: [...groups], locked: [...groups] } where each group is
 * { circleKey, circleLabel, maxTravellers, travelStyle, cost, experiences }.
 * `cost` is the circle's points threshold (indicative redemption cost).
 */
export const suggestedExperiences = (balance) => {
    const b = Number(balance) || 0;
    const unlocked = [];
    const locked = [];
    for (const c of CIRCLES) {
        if (!c.experiences.length) continue; // skip Member
        const group = {
            circleKey: c.key,
            circleLabel: c.label,
            maxTravellers: c.maxTravellers,
            travelStyle: c.travelStyle,
            cost: c.min,
            experiences: c.experiences,
        };
        if (b >= c.min) unlocked.push(group); else locked.push(group);
    }
    return { unlocked, locked };
};

// ── Formatting helpers ────────────────────────────────────────────────────────
export const fmtINR = (n) => {
    const v = Number(n) || 0;
    return '₹' + v.toLocaleString('en-IN');
};

export const fmtPoints = (n) => (Number(n) || 0).toLocaleString('en-IN');

/**
 * Aggregate billing + redemption rows into the dashboard summary.
 * Single currency: Stone Points. No money anywhere.
 * Circle is driven by CURRENT balance (earned − spent), so redeeming can lower it.
 * @param billing      array of { sqft, points_earned }
 * @param redemptions  array of { points_cost (stored in wallet_amount column), status }
 */
export const summarize = (billing = [], redemptions = []) => {
    const totalSqft = billing.reduce((s, b) => s + (Number(b.sqft) || 0), 0);
    const projectCount = billing.length;
    const pointsEarned = billing.reduce((s, b) => s + (Number(b.points_earned) || 0), 0);
    const pointsSpent = redemptions
        .filter(r => r.status === 'approved' || r.status === 'fulfilled')
        .reduce((s, r) => s + (Number(r.wallet_amount) || 0), 0); // wallet_amount column now holds point cost
    const pointsBalance = Math.max(0, pointsEarned - pointsSpent);
    const circle = circleForPoints(pointsBalance);
    return { totalSqft, projectCount, pointsEarned, pointsSpent, pointsBalance, circle };
};
