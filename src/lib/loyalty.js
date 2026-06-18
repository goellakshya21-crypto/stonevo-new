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
// Tiers = PROFIT per sqft. A = ₹100/sqft, rising in ₹100 steps to J = ₹1,000/sqft.
// Open-ended by design: bump the count to add K, L… (₹1,100, ₹1,200…) — the admin
// selector, preview, and ledger all adapt automatically.
const TIER_COUNT = 10;          // A..J
const TIER_STEP = 100;          // ₹100 increments
export const COLLECTION_TIERS = Array.from({ length: TIER_COUNT }, (_, i) => ({
    letter: String.fromCharCode(65 + i),          // 'A', 'B', …
    profitPerSqft: (i + 1) * TIER_STEP,           // 100, 200, … 1000
    label: `₹${((i + 1) * TIER_STEP).toLocaleString('en-IN')}/sqft`,
}));

// How many Stone Points each ₹1 of profit yields. PLACEHOLDER — confirm the real
// ratio + circle thresholds and I'll lock them in.
export const POINTS_PER_RUPEE_PROFIT = 1;

/** Look up a tier by its letter (A, B, C…). */
export const tierByLetter = (letter) => {
    const v = String(letter || '').toUpperCase();
    return COLLECTION_TIERS.find(t => t.letter === v) || null;
};

/**
 * Compute the earning breakdown for a single deal. Admin supplies the tier
 * (profit/sqft) plus EITHER sqft OR total profit; the other is derived.
 *   - mode 'sqft':   totalProfit = profitPerSqft × sqft
 *   - mode 'profit': sqft        = totalProfit ÷ profitPerSqft
 * Points are computed from total profit. No sale price is involved.
 * @param tierLetter 'A'…'J'
 * @param opts { sqft, profit, mode: 'sqft' | 'profit' }
 */
export const computeBilling = (tierLetter, opts = {}) => {
    const { sqft = 0, profit = 0, mode = 'sqft' } = opts;
    const tier = tierByLetter(tierLetter);
    const ppsf = tier ? tier.profitPerSqft : 0;

    let s = Number(sqft) || 0;
    let totalProfit;
    if (mode === 'profit') {
        totalProfit = Number(profit) || 0;
        s = ppsf > 0 ? totalProfit / ppsf : 0;
    } else {
        totalProfit = ppsf * s;
    }
    const pointsEarned = Math.round(totalProfit * POINTS_PER_RUPEE_PROFIT);
    return {
        tierLetter: tier?.letter || null,
        profitPerSqft: ppsf,
        tierLabel: tier?.label || '—',
        sqft: s,
        totalProfit,
        pointsEarned,
    };
};

// ── Circle tiers by CURRENT points balance ────────────────────────────────────
// 1 point = ₹1 of profit generated. A circle UNLOCKS a group size; its threshold
// equals a domestic trip for that many people (₹25,000/person × group size), so
// thresholds scale exactly with how many people the architect can bring.
export const CIRCLES = [
    {
        key: 'member', label: 'Member', short: 'Member', min: 0,
        maxTravellers: 0, travelStyle: 'Building toward Silver',
        unlocks: [],
        color: '#9A938A', accent: '#6A645B',
    },
    {
        key: 'silver', label: 'Silver Circle', short: 'Silver', min: 25000,
        maxTravellers: 1, travelStyle: 'Solo Experience',
        unlocks: ['solo', 'learning'],
        color: '#C0C0C0', accent: '#8A8A8A',
    },
    {
        key: 'gold', label: 'Gold Circle', short: 'Gold', min: 50000,
        maxTravellers: 2, travelStyle: 'Couple / Duo',
        unlocks: ['solo', 'couple', 'learning'],
        color: '#D4AF37', accent: '#A37D4B',
    },
    {
        key: 'platinum', label: 'Platinum Circle', short: 'Platinum', min: 100000,
        maxTravellers: 4, travelStyle: 'Family (up to 4)',
        unlocks: ['solo', 'couple', 'family', 'friends', 'learning'],
        color: '#E5E4E2', accent: '#B0B0B0',
    },
    {
        key: 'black', label: 'Black Circle', short: 'Black', min: 200000,
        maxTravellers: 8, travelStyle: 'Team / Friends (up to 8)',
        unlocks: ['solo', 'couple', 'family', 'friends', 'team', 'learning'],
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

// ── Destinations, priced PER PERSON ───────────────────────────────────────────
// Redemption cost = perPerson × the architect's group size (their circle's
// maxTravellers). Bigger group → same destination costs more. Higher destination
// → costs more. Both scale with real money (1 point = ₹1).
export const DESTINATIONS = [
    { band: 'Domestic',                         perPerson: 25000,  experiences: ['Jaipur', 'Udaipur', 'Goa', 'Kerala', 'Rishikesh Luxury Retreat'] },
    { band: 'Premium / Short-Haul International', perPerson: 50000,  experiences: ['Kashmir', 'Andaman', 'Coorg', 'North East', 'Luxury Goa', 'Dubai', 'Thailand', 'Vietnam'] },
    { band: 'International',                     perPerson: 100000, experiences: ['Bali', 'Singapore', 'Europe Short Trip', 'Japan', 'Turkey'] },
    { band: 'Luxury',                           perPerson: 200000, experiences: ['Switzerland', 'Italy', 'Greece', 'Australia', 'Custom Family Vacation'] },
];

/**
 * Destinations split into affordable (unlocked) vs not-yet (locked) for the
 * architect's current balance + circle group size.
 * Each entry: { band, perPerson, group, cost, experiences }.
 */
export const suggestedExperiences = (balance, circle) => {
    const b = Number(balance) || 0;
    const group = circle?.maxTravellers || 0;
    const unlocked = [];
    const locked = [];
    if (group === 0) return { unlocked, locked, group };
    for (const d of DESTINATIONS) {
        const cost = d.perPerson * group;
        const entry = { band: d.band, perPerson: d.perPerson, group, cost, experiences: d.experiences };
        if (b >= cost) unlocked.push(entry); else locked.push(entry);
    }
    return { unlocked, locked, group };
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
