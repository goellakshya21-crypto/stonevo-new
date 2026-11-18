// The yard side: a yard's account (verified by phone OTP and GSTIN) and the
// lots it lists. A small store the portal writes, the team's review page
// (#/review) approves, and the storefront reads: a lot our team approves shows
// up in the gallery at once, and one marked sold disappears from it at once.
//
// A listing's life: 'review' (sent, waiting for our team) -> 'live' (approved,
// on the site) or 'changes' (sent back with reasons; the yard fixes it and
// sends it again) or 'cancelled' (our team will not list it; final) ... then
// 'sold' or 'withdrawn' (off the site; can be put back).
//
// Our team also keeps a register of every yard that has signed up (`yards`,
// by phone), so the team page can list them all with their details, and tell
// which yard any lot is from.
//
// Prototype: kept in this browser's localStorage (photos downscaled to JPEG so
// several lots fit). Production: `leads` (role 'vendor') and `lots` +
// `lot_private` through server routes, as in PLAN.md §4 and §6; the yard
// register is a team-only route over `leads`.
import { useSyncExternalStore } from 'react';

const ACCOUNT_KEY = 'ston-yard-account';
const LISTINGS_KEY = 'ston-yard-listings';
const YARDS_KEY = 'ston-yards';

// Our margin on top of the yard's price is ours to set, per lot (decided
// 2026-11-14): our team sets it when it reviews the lot (ReviewQueue) and can
// change it any time after; the site price follows at once. A percentage, or a
// flat ₹ a sq ft. The yard never sets it and its preview never shows it. The
// part-lot premium (lots.js) then applies on top, as for every lot.
export const DEFAULT_MARGIN = { type: 'pct', value: 12 };
export const MARGIN_STEPS = [8, 10, 12, 15, 20];
export const listPriceFor = (yardPrice, margin = DEFAULT_MARGIN) => {
    const v = Math.max(0, Number(margin?.value) || 0);
    const raw = margin?.type === 'flat' ? yardPrice + v : yardPrice * (1 + v / 100);
    return Math.max(yardPrice, Math.round(raw / 5) * 5);
};
export const marginLabel = (m) => (!m ? 'not set' : m.type === 'flat' ? `₹${m.value}/sq ft` : `${m.value}%`);

export const FINISHES = ['Polished', 'Honed', 'Leather', 'Flamed', 'Natural'];
// Where the stone was quarried (decided 2026-11-17): suggestions, any answer allowed.
export const ORIGINS = [
    'Rajasthan',
    'Gujarat',
    'Andhra Pradesh',
    'Karnataka',
    'Tamil Nadu',
    'Madhya Pradesh',
    'Italy',
    'Turkey',
    'Spain',
    'Greece',
    'Iran',
    'Oman',
    'Egypt',
    'Vietnam',
    'Brazil',
];
// Travertine is sold filled (its holes filled with resin or cement) or unfilled.
export const TRAVERTINE_FILLING = ['Filled', 'Unfilled'];
/** Do pieces x piece size (inches) come within 25% of the total sq ft? null when no size was given. */
export const sizeAddsUp = (pieces, L, W, total) => (pieces && L && W && total ? Math.abs((pieces * L * W) / 144 - total) / total <= 0.25 : null);
export const THICKNESSES = [16, 18, 20, 25, 30];
// The catalogue's colour tags, so yard lots filter like every other lot.
export const COLOUR_TAGS = ['White', 'Cream', 'Beige', 'Grey', 'Black', 'Brown', 'Golden', 'Green', 'Blue', 'Pink', 'Red'];
// GSTIN: 2-digit state code, PAN (5 letters, 4 digits, 1 letter), entity number, Z, check character.
export const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const load = (key, fallback) => {
    try {
        return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback;
    } catch {
        return fallback;
    }
};

/**
 * Every yard we know of, by phone: the register, plus yards from before it
 * existed (an account saved at log out, or the details a listing carries).
 */
function loadYards(account, listings) {
    const yards = { ...load(YARDS_KEY, {}) };
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k?.startsWith(`${ACCOUNT_KEY}:`)) continue;
            const a = load(k, null);
            if (a?.phone && !yards[a.phone]) yards[a.phone] = a;
        }
    } catch {
        /* storage blocked */
    }
    listings.forEach((l) => {
        if (l.phone && !yards[l.phone]) yards[l.phone] = { phone: l.phone, status: 'verified', profile: { ...l.yard } };
    });
    if (account?.phone) yards[account.phone] = account;
    return yards;
}

const fresh = () => {
    const account = load(ACCOUNT_KEY, null);
    const listings = load(LISTINGS_KEY, []);
    return { account, listings, yards: loadYards(account, listings) };
};

let state = { ...fresh(), storageFull: false };
const subs = new Set();

function commit(next) {
    state = { ...state, ...next };
    // The register keeps each yard's latest details, logged in or not.
    if (state.account?.phone) state = { ...state, yards: { ...state.yards, [state.account.phone]: state.account } };
    try {
        localStorage.setItem(ACCOUNT_KEY, JSON.stringify(state.account));
        localStorage.setItem(LISTINGS_KEY, JSON.stringify(state.listings));
        localStorage.setItem(YARDS_KEY, JSON.stringify(state.yards));
        if (state.storageFull) state = { ...state, storageFull: false };
    } catch {
        // Full (photos are big): kept for this visit, not saved in the browser.
        state = { ...state, storageFull: true };
    }
    subs.forEach((fn) => fn());
}

// Another tab changed the yards' data (the team approving in the review tab
// while the gallery is open in another): pick it up here at once.
if (typeof window !== 'undefined') {
    window.addEventListener('storage', (e) => {
        if (e.key !== ACCOUNT_KEY && e.key !== LISTINGS_KEY && e.key !== YARDS_KEY) return;
        state = { ...state, ...fresh() };
        subs.forEach((fn) => fn());
    });
}

const subscribe = (fn) => {
    subs.add(fn);
    return () => subs.delete(fn);
};

/** { account, listings, yards, storageFull }, re-rendering on every change. */
export const useYard = () => useSyncExternalStore(subscribe, () => state);

const updateListing = (id, patch) => commit({ listings: state.listings.map((l) => (l.id === id ? { ...l, ...patch } : l)) });

export const yard = {
    /** After the one-time code: a known number picks up its account again. */
    logIn(phone) {
        const known = state.account?.phone === phone ? state.account : load(`${ACCOUNT_KEY}:${phone}`, null);
        commit({ account: known || { phone, status: 'new', joinedAt: Date.now() } });
    },
    logOut() {
        if (state.account) {
            try {
                localStorage.setItem(`${ACCOUNT_KEY}:${state.account.phone}`, JSON.stringify(state.account));
            } catch {
                /* full */
            }
        }
        commit({ account: null });
    },
    /** Yard details sent for checking (GSTIN against the GST register, then a call). */
    submitProfile(profile) {
        commit({ account: { ...state.account, profile, status: 'checking', submittedAt: Date.now() } });
    },
    verify() {
        commit({ account: { ...state.account, status: 'verified', verifiedAt: Date.now() } });
    },
    setDirectBuyers(on) {
        commit({ account: { ...state.account, profile: { ...state.account.profile, directOk: on } } });
    },
    /**
     * A new lot goes to our team for review before it is on the site. It
     * carries the yard's details for the reviewer (team only: lotFromListing
     * never passes them to the storefront).
     */
    addListing(fields) {
        const now = Date.now();
        const p = state.account.profile || {};
        const listing = {
            ...fields,
            id: `yard-${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            phone: state.account.phone,
            yard: { yardName: p.yardName, contact: p.contact, gstin: p.gstin, gstinOk: !!p.gstinOk, cityKey: p.cityKey },
            // Set by our team at review (approve), never by the yard.
            margin: null,
            listPrice: null,
            status: 'review',
            sentAt: now,
            listedAt: null,
            confirmedAt: null,
            review: null,
        };
        commit({ listings: [listing, ...state.listings] });
        return listing;
    },
    /** The yard fixes a lot that was sent back, and sends it again. */
    resubmit(id, fields) {
        const old = state.listings.find((l) => l.id === id);
        updateListing(id, {
            ...fields,
            listPrice: null,
            status: 'review',
            sentAt: Date.now(),
            history: [...(old?.history || []), old?.review].filter(Boolean),
            review: null,
        });
    },
    /** Our team: approved at this margin, on the site now. */
    approve(id, margin) {
        const l = state.listings.find((x) => x.id === id);
        if (!l) return;
        const now = Date.now();
        updateListing(id, {
            status: 'live',
            margin,
            listPrice: listPriceFor(l.yardPrice, margin),
            listedAt: now,
            confirmedAt: now,
            review: { approved: true, at: now, margin },
        });
    },
    /** Our team: a new margin for a lot (live or not); a live lot's site price changes at once. */
    setMargin(id, margin) {
        const l = state.listings.find((x) => x.id === id);
        if (!l) return;
        const now = Date.now();
        updateListing(id, {
            margin,
            listPrice: listPriceFor(l.yardPrice, margin),
            marginChangedAt: now,
            marginHistory: [...(l.marginHistory || []), { margin: l.margin, listPrice: l.listPrice, at: now }],
        });
    },
    /** Our team: not yet; the yard sees why, fixes it and sends it again. */
    sendBack: (id, reasons, note) => updateListing(id, { status: 'changes', review: { approved: false, reasons, note, at: Date.now() } }),
    /** Our team: this lot will not go on the site (for good); the yard sees why. */
    cancelListing: (id, reasons, note) =>
        updateListing(id, { status: 'cancelled', cancelledAt: Date.now(), review: { approved: false, cancelled: true, reasons, note, at: Date.now() } }),
    /** Sold at the yard's end: off the site straight away. */
    markSold: (id) => updateListing(id, { status: 'sold', soldAt: Date.now() }),
    withdraw: (id) => updateListing(id, { status: 'withdrawn', withdrawnAt: Date.now() }),
    /** Back on the site: it was approved before, so no second review. */
    relist: (id) => updateListing(id, { status: 'live', confirmedAt: Date.now(), soldAt: null, withdrawnAt: null }),
    /** "Still available": the weekly check that keeps stock honest (PLAN.md §6). */
    confirmAvailable: (id) => updateListing(id, { confirmedAt: Date.now() }),
};

/** A photo from the yard's phone, downscaled to a JPEG data URL (longest edge `max`). */
export const shrinkPhoto = (file, max = 1000, quality = 0.8) =>
    new Promise((resolve, reject) => {
        if (!file.type.startsWith('image/')) {
            reject(new Error('That is not a photo. Choose a JPG or PNG.'));
            return;
        }
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
            const c = document.createElement('canvas');
            c.width = Math.round(img.naturalWidth * k);
            c.height = Math.round(img.naturalHeight * k);
            c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
            URL.revokeObjectURL(url);
            resolve(c.toDataURL('image/jpeg', quality));
        };
        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error('Could not read that photo.'));
        };
        img.src = url;
    });

/**
 * The yard a listing is from, for our team: its latest details from the
 * register, else the details the listing was sent with.
 */
export const yardOf = (l, yards) => {
    const y = yards?.[l.phone];
    return { phone: l.phone, status: y?.status || 'verified', joinedAt: y?.joinedAt, verifiedAt: y?.verifiedAt, ...l.yard, ...(y?.profile || {}) };
};

// Why a reviewer cancels a listing outright (it cannot be fixed by the yard).
export const CANCEL_REASONS = ['The photos are not of real stock', 'Duplicate of another listing', 'Not a stone we sell', 'We could not confirm the yard'];

// Why a reviewer sends a lot back: the common ones, as one tap each.
export const SEND_BACK_REASONS = [
    'Photos are unclear or too dark',
    'Photos do not show the whole slab',
    'The name does not match the stone',
    'The size looks wrong for the pieces',
    'The price is too close to market',
    'The video shows the yard’s name or signboard',
];
