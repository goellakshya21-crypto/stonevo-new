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
    { letter: 'A', key: 'signature', label: 'Signature', band: 'Above ₹2,000/sqft',   points: 5, wallet: 25 },
    { letter: 'B', key: 'elite',     label: 'Elite',     band: '₹1,500–2,000/sqft',   points: 4, wallet: 20 },
    { letter: 'C', key: 'premium',   label: 'Premium',   band: '₹1,000–1,500/sqft',   points: 3, wallet: 15 },
    { letter: 'D', key: 'core',      label: 'Core',      band: '₹500–1,000/sqft',     points: 2, wallet: 10 },
    { letter: 'E', key: 'standard',  label: 'Standard',  band: 'Below ₹500/sqft',     points: 1, wallet: 5 },
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
        walletPerSqft: tier.wallet,
        walletEarned: s * tier.wallet,
    };
};

// ── Circle tiers by CURRENT wallet balance ────────────────────────────────────
export const CIRCLES = [
    { key: 'member',   label: 'Member',          short: 'Member',   min: 0,       color: '#9A938A', accent: '#6A645B' },
    { key: 'silver',   label: 'Silver Circle',   short: 'Silver',   min: 25000,   color: '#C0C0C0', accent: '#8A8A8A' },
    { key: 'gold',     label: 'Gold Circle',     short: 'Gold',     min: 75000,   color: '#D4AF37', accent: '#A37D4B' },
    { key: 'platinum', label: 'Platinum Circle', short: 'Platinum', min: 150000,  color: '#E5E4E2', accent: '#B0B0B0' },
    { key: 'black',    label: 'Black Circle',    short: 'Black',    min: 300000,  color: '#1a1a1a', accent: '#C8A86E' },
];

/** Resolve the circle for a wallet balance. Returns { current, next, progressPct, toNext }. */
export const circleForBalance = (balance) => {
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

// ── Redemption catalog, banded by wallet value ────────────────────────────────
export const EXPERIENCE_CATALOG = [
    {
        band: 'Domestic',
        min: 25000, max: 50000,
        experiences: ['Jaipur', 'Udaipur', 'Goa', 'Kerala', 'Rishikesh Luxury Retreat'],
    },
    {
        band: 'Domestic Premium / International',
        min: 50000, max: 100000,
        experiences: ['Kashmir', 'Andaman', 'Coorg', 'North East', 'Luxury Goa', 'Dubai', 'Thailand', 'Vietnam'],
    },
    {
        band: 'International',
        min: 100000, max: 200000,
        experiences: ['Bali', 'Singapore', 'Europe Short Trip', 'Japan', 'Turkey'],
    },
    {
        band: 'Luxury Experiences',
        min: 200000, max: Infinity,
        experiences: ['Switzerland', 'Italy', 'Greece', 'Australia', 'Custom Family Vacation'],
    },
];

/**
 * Return experiences the architect can afford with their current balance,
 * grouped by band. Includes any band whose `min` <= balance.
 */
export const suggestedExperiences = (balance) => {
    const b = Number(balance) || 0;
    return EXPERIENCE_CATALOG
        .filter(band => b >= band.min)
        .map(band => ({ ...band, affordable: true }));
};

// ── Formatting helpers ────────────────────────────────────────────────────────
export const fmtINR = (n) => {
    const v = Number(n) || 0;
    return '₹' + v.toLocaleString('en-IN');
};

export const fmtPoints = (n) => (Number(n) || 0).toLocaleString('en-IN');

/**
 * Aggregate billing + redemption rows into the dashboard summary.
 * No sale value (price) is computed — only volume (sqft), points, and the
 * reward wallet, so nothing GST-sensitive is ever surfaced.
 * @param billing      array of { sqft, points_earned, wallet_earned }
 * @param redemptions  array of { wallet_amount, status }
 */
export const summarize = (billing = [], redemptions = []) => {
    const totalSqft = billing.reduce((s, b) => s + (Number(b.sqft) || 0), 0);
    const projectCount = billing.length;
    const points = billing.reduce((s, b) => s + (Number(b.points_earned) || 0), 0);
    const walletEarned = billing.reduce((s, b) => s + (Number(b.wallet_earned) || 0), 0);
    const walletSpent = redemptions
        .filter(r => r.status === 'approved' || r.status === 'fulfilled')
        .reduce((s, r) => s + (Number(r.wallet_amount) || 0), 0);
    const walletBalance = Math.max(0, walletEarned - walletSpent);
    const circle = circleForBalance(walletBalance);
    return { totalSqft, projectCount, points, walletEarned, walletSpent, walletBalance, circle };
};
