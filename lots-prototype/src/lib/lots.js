import { supabase } from './supabase';
import { SCENE_IDS, SCENES, suits } from './applications';

// ─────────────────────────────────────────────────────────────────────────────
// What the storefront is allowed to know about a stone.
//
// `stones` has RLS off, so anything in it is readable by anyone holding the anon
// key (which ships inside every page). It also has a `vendor_address` column.
// The rule for the public site: name the columns, never `select('*')`, and never
// any vendor field. In production this list becomes a `public_lots` view so the
// guarantee lives in the database rather than in this file. See PLAN.md §4.
// ─────────────────────────────────────────────────────────────────────────────
const PUBLIC_COLUMNS = 'id,name,type,color,pattern,finish,price_range,image_url,created_at';

// Stone hubs a lot can ship from. Shown to buyers as city + state only.
export const CITIES = {
    kishangarh: { name: 'Kishangarh', state: 'Rajasthan' },
    makrana: { name: 'Makrana', state: 'Rajasthan' },
    rajsamand: { name: 'Rajsamand', state: 'Rajasthan' },
    udaipur: { name: 'Udaipur', state: 'Rajasthan' },
    jodhpur: { name: 'Jodhpur', state: 'Rajasthan' },
    jalore: { name: 'Jalore', state: 'Rajasthan' },
    kota: { name: 'Kota', state: 'Rajasthan' },
    dholpur: { name: 'Dholpur', state: 'Rajasthan' },
    katni: { name: 'Katni', state: 'Madhya Pradesh' },
    silvassa: { name: 'Silvassa', state: 'Dadra & NH' },
    delhi: { name: 'Delhi', state: 'NCR' },
    bengaluru: { name: 'Bengaluru', state: 'Karnataka' },
    hyderabad: { name: 'Hyderabad', state: 'Telangana' },
};

// First rule whose pattern matches the stone's types + name decides its family
// and which hubs it plausibly ships from. Order matters: "Beige Travertine" is
// typed plain "Stone", so the name check for travertine must come before the
// generic stone/sandstone rule.
const FAMILY_RULES = [
    { family: 'Onyx', re: /onyx/i, cities: ['kishangarh', 'delhi', 'silvassa'], mm: 16 },
    { family: 'Semi-precious', re: /semi-precious|quartz\b|agate/i, cities: ['kishangarh', 'delhi'], mm: 16 },
    { family: 'Granite', re: /granite|quartzite/i, cities: ['bengaluru', 'jalore', 'hyderabad', 'kishangarh'], mm: 20 },
    { family: 'Travertine', re: /travertine|shellstone/i, cities: ['kishangarh', 'udaipur', 'silvassa', 'delhi'], mm: 18 },
    { family: 'Dolomite', re: /dolomite/i, cities: ['udaipur', 'rajsamand', 'kishangarh'], mm: 18 },
    { family: 'Marble', re: /marble/i, cities: ['kishangarh', 'makrana', 'rajsamand', 'udaipur', 'katni', 'silvassa', 'delhi'], mm: 18 },
    { family: 'Sandstone', re: /sandstone|limestone|\bstone\b/i, cities: ['jodhpur', 'kota', 'dholpur', 'udaipur'], mm: 25 },
];

// Market ₹/sq ft bands per existing price tier. Sample numbers for the
// prototype — real lots carry the vendor's actual figures.
const TIER_BANDS = {
    Value: [140, 260],
    Core: [260, 460],
    Premium: [460, 880],
    Elite: [880, 1850],
};

// Spaces a buyer might be shopping for: every room the visualiser renders
// (applications.js), plus the whole bathroom, which only a big lot can do.
// Each knows the room that best pictures it and the stone it needs.
export const SPACES = [
    ...SCENE_IDS.map((id) => ({ id, room: id, label: SCENES[id].space, sqft: SCENES[id].sqft, hint: SCENES[id].hint })),
    { id: 'bath', room: 'bathroom', label: 'Whole bathroom', sqft: 130, hint: 'Floor, wet walls and vanity', avoid: ['Onyx', 'Semi-precious'] },
].sort((a, b) => a.sqft - b.sqft);

/** Is this lot's stone right for this space at all? (Ignores size.) */
export const suitsSpace = (lot, space) => (space.id === 'bath' ? !space.avoid.includes(lot.family) : suits(lot, space.room));

/** Can this lot do this space: enough stone, and a stone that suits it? */
export const fitsSpace = (lot, space) => lot.sqft >= space.sqft && suitsSpace(lot, space);

// Deterministic 0..1 from an id, so a stone always gets the same sample lot.
function rand(id, salt) {
    let h = 2166136261 ^ (salt * 16777619);
    for (let i = 0; i < id.length; i++) {
        h ^= id.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
    return (h >>> 0) / 4294967296;
}

const roundTo = (n, step) => Math.round(n / step) * step;
const asList = (v) => [].concat(v || []).filter(Boolean);

// Whole lot vs part of it. Part of a lot costs more a square foot: the rest
// of the lot still has to find a buyer, and it is cut and handled twice. The
// whole lot is the best rate, which is also what clears a yard fastest.
export const PART_PREMIUM = 0.15;
export const partRateOf = (price) => Math.max(price + 5, Math.round((price * (1 + PART_PREMIUM)) / 5) * 5);

/**
 * Stone is sold by the whole slab (decided 2026-11-17): a buyer says how many
 * sq ft they need, and it rounds UP to whole slabs of this lot. The slabs'
 * sq ft is what they pay for, at the part-lot rate, or the whole lot's price
 * when that is no dearer (then they take the whole lot).
 */
export const slabsFor = (lot, sqft) => Math.min(lot.slabs, Math.max(1, Math.ceil((Math.max(0, Number(sqft) || 0) * lot.slabs) / lot.sqft - 1e-9)));
export const slabSqft = (lot, slabs) => (slabs >= lot.slabs ? lot.sqft : Math.round((slabs * lot.sqft) / lot.slabs));
/** `{ slabs, sqft, cost, whole, short }` for a job of `sqft` from this lot (short: the lot has less than that). */
export const jobFor = (lot, sqft) => {
    const need = Math.max(0, Number(sqft) || 0);
    const slabs = slabsFor(lot, need);
    const billed = slabSqft(lot, slabs);
    const whole = billed >= lot.sqft || billed * lot.partRate >= lot.lotTotal;
    return {
        slabs: whole ? lot.slabs : slabs,
        sqft: whole ? lot.sqft : billed,
        cost: whole ? lot.lotTotal : Math.round(billed * lot.partRate),
        whole,
        short: need > lot.sqft,
    };
};
/** What a job of `sqft` from this lot costs, in whole slabs. */
export const costFor = (lot, sqft) => jobFor(lot, sqft).cost;
/** "2 slabs (48 sq ft)" or "the whole lot". */
export const jobLabel = (job) => (job.whole ? 'the whole lot' : `${job.slabs} ${job.slabs === 1 ? 'slab' : 'slabs'} (${job.sqft} sq ft)`);

// Slab sizes the way the market says them (decided 2026-11-14): a piece's
// length and width in inches, its area and the lot's area in sq ft.
export const inchSize = (L, W) => `${L} × ${W} in`;
export const sqftOfInches = (L, W) => (L * W) / 144;
/**
 * A yard piece's [length, width] in inches, or null when not given. Listings
 * sent before sizes were in inches have them in feet (pieceL, pieceW).
 */
export const pieceInches = (l) =>
    l.pieceLIn && l.pieceWIn ? [l.pieceLIn, l.pieceWIn] : l.pieceL && l.pieceW ? [Math.round(l.pieceL * 12), Math.round(l.pieceW * 12)] : null;

/**
 * A lot a yard listed in the yard portal (lib/vendor.js), in the same shape as
 * every other lot. Only the city reaches the storefront; the yard's name,
 * address and phone stay in the listing's account and never leave it here.
 */
export function lotFromListing(l) {
    // Our team sets the margin when it approves (vendor.js); never below the yard's own price.
    const price = Math.max(l.yardPrice, l.listPrice || l.yardPrice);
    const dims = pieceInches(l);
    const each = dims ? sqftOfInches(...dims) : l.sqft / Math.max(1, l.pieces);
    const days = Math.floor((Date.now() - l.listedAt) / 86400000);
    return {
        id: l.id,
        name: l.name,
        family: l.family,
        colors: l.colors || [],
        pattern: [],
        finish: l.finish,
        tier: 'Core',
        image: l.photos[0],
        photos: l.photos,
        video: l.video || null,
        origin: l.origin || '',
        filling: l.filling || '',
        cityKey: l.cityKey,
        city: CITIES[l.cityKey] || CITIES.kishangarh,
        sqft: l.sqft,
        slabs: l.pieces,
        pieceSize: dims ? inchSize(...dims) : null,
        pieceSqft: Math.max(1, Math.round(each)),
        thicknessMm: l.thicknessMm,
        marketPrice: l.marketRate,
        price,
        partRate: partRateOf(price),
        discountPct: Math.max(0, Math.round((1 - price / l.marketRate) * 100)),
        partDiscountPct: Math.max(0, Math.round((1 - partRateOf(price) / l.marketRate) * 100)),
        lotTotal: price * l.sqft,
        listedDaysAgo: days,
        isNew: days <= 2,
        fromYard: true,
    };
}

/** Taking the whole lot is no dearer than the `sqft` asked for. */
export const wholeIsCheaper = (lot, sqft) => sqft < lot.sqft && jobFor(lot, sqft).whole;

function toLot(stone) {
    const types = asList(stone.type);
    const haystack = [...types, stone.name].join(' | ');
    const rule = FAMILY_RULES.find((r) => r.re.test(haystack)) || FAMILY_RULES[FAMILY_RULES.length - 1];
    const r = (salt) => rand(stone.id, salt);

    const tier = asList(stone.price_range)[0] || 'Core';
    const [lo, hi] = TIER_BANDS[tier] || TIER_BANDS.Core;
    const marketPrice = roundTo(lo + (hi - lo) * r(1), 10);
    const price = roundTo(marketPrice * (1 - (0.42 + 0.2 * r(2))), 5);

    // Small lots skew small: most are 15–60 sq ft, a few run past 150.
    const sqft = Math.round(14 + 170 * Math.pow(r(3), 1.7));
    const pieceArea = [16, 22, 28, 34][Math.floor(r(4) * 4)];
    const slabs = Math.max(1, Math.round(sqft / pieceArea));
    // Each piece in inches (as the market measures it): a width the piece's
    // area makes likely, and the length that gives that area.
    const avg = sqft / slabs;
    const widths = avg > 24 ? [48, 54, 60] : avg > 14 ? [36, 42] : [24, 30];
    const widthIn = widths[Math.floor(r(7) * widths.length)];
    const lengthIn = Math.max(widthIn, Math.round((avg * 144) / widthIn));

    const cityKey = rule.cities[Math.floor(r(5) * rule.cities.length)];
    const listedDaysAgo = Math.floor(Math.pow(r(6), 2) * 30);

    return {
        id: stone.id,
        name: stone.name,
        family: rule.family,
        colors: asList(stone.color),
        pattern: asList(stone.pattern),
        finish: asList(stone.finish)[0] || (rule.family === 'Sandstone' ? 'Natural' : 'Polished'),
        tier,
        image: stone.image_url,
        cityKey,
        city: CITIES[cityKey],
        sqft,
        slabs,
        pieceSize: inchSize(lengthIn, widthIn),
        pieceSqft: Math.max(1, Math.round(avg)),
        thicknessMm: rule.mm,
        marketPrice,
        // `price` is the WHOLE-LOT rate; part of the lot is `partRate`.
        price,
        partRate: partRateOf(price),
        discountPct: Math.round((1 - price / marketPrice) * 100),
        partDiscountPct: Math.round((1 - partRateOf(price) / marketPrice) * 100),
        lotTotal: price * sqft,
        listedDaysAgo,
        isNew: listedDaysAgo <= 2,
    };
}

// Not every catalogue stone has a leftover lot — about one in four does here,
// which is roughly what a real small-lot shelf would look like.
const HAS_LOT = (stone) => stone.image_url && rand(stone.id, 9) < 0.3;

export async function fetchLots() {
    if (!supabase) throw new Error('Supabase env vars are missing (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY).');
    const { data, error } = await supabase.from('stones').select(PUBLIC_COLUMNS).order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).filter(HAS_LOT).map(toLot);
}

export const inr = (n) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// Indian short form: ₹4.2 L, ₹1.3 Cr.
export const compactInr = (n) => {
    if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
    if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
    return inr(n);
};

export const fitsSpaces = (lot) => SPACES.filter((s) => fitsSpace(lot, s));

/**
 * "India's top designers' choice" (Highlights & selection). Decided 2026-11-22:
 * RANDOM lots for now, until the team chooses real ones: the same 8 on every
 * visit (shuffled by a hash of each lot's id), lots with room pictures first.
 * @returns {Set<string>} lot ids
 */
export function designersPicks(lots, renders = {}, n = 8) {
    const key = (l) => rand(l.id, 22);
    const pictured = lots.filter((l) => Object.keys(renders[l.id] || {}).some((k) => k !== 'name'));
    const rest = lots.filter((l) => !pictured.includes(l));
    const order = [...pictured.sort((a, b) => key(a) - key(b)), ...rest.sort((a, b) => key(a) - key(b))];
    return new Set(order.slice(0, n).map((l) => l.id));
}

export const FAMILIES = ['Marble', 'Onyx', 'Travertine', 'Granite', 'Dolomite', 'Sandstone', 'Semi-precious'];

export const SORTS = {
    newest: { label: 'Newest', fn: (a, b) => a.listedDaysAgo - b.listedDaysAgo },
    saving: { label: 'Biggest saving', fn: (a, b) => b.discountPct - a.discountPct },
    price: { label: 'Lowest ₹/sq ft', fn: (a, b) => a.price - b.price },
    size: { label: 'Most stone', fn: (a, b) => b.sqft - a.sqft },
};
